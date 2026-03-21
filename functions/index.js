const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");
const crypto = require("crypto");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

/**
 * 🟢 TRIGGER 0: PAYSTACK WEBHOOK
 * Listens for Paystack payment success events
 */
exports.paystackWebhook = onRequest(async (req, res) => {
    // Validate event
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Fallback if not set in process.env (for local testing/setup)
    if (!secret) {
        console.error("PAYSTACK_SECRET_KEY is not set.");
        return res.status(500).send("Server configuration error");
    }

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        console.log("Invalid Paystack Signature");
        return res.status(401).send("Unauthorized");
    }

    // Process event
    const event = req.body;
    if (event.event === 'charge.success') {
        // Support both initial payments (reference=orderId) and retries (metadata.orderId)
        const orderId = event.data.metadata?.orderId || event.data.reference;
        const amount = event.data.amount / 100; // Paystack sends in kobo/cents

        console.log(`💰 Payment verified for Order: ${orderId} | Amount: ${amount}`);

        try {
            // Find the pending order and mark it confirmed
            const orderRef = admin.firestore().collection("orders").doc(orderId);
            const orderDoc = await orderRef.get();

            if (!orderDoc.exists) {
                console.error(`Order ${orderId} not found in DB!`);
                return res.status(404).send("Order not found");
            }

            // Optional: You could check if orderDoc.data().total == amount here

            await orderRef.update({
                status: "confirmed",
                paidAt: new Date().toISOString()
            });
            console.log(`✅ Order ${orderId} confirmed via Webhook.`);

        } catch (error) {
            console.error(`❌ Error updating order ${orderId}:`, error);
            return res.status(500).send("Database error");
        }
    }

    // Acknowledge receipt
    res.status(200).send();
});

/**
 * 🟢 HELPER: Send Logistics Alert
 * Reusable function to alert drivers
 */
const alertDrivers = async (orderData) => {
    try {
        const groupDoc = await admin.firestore().collection("notifications").doc("logistics_group").get();
        if (!groupDoc.exists) return console.log("No logistics group found");

        const tokens = Object.values(groupDoc.data());
        if (tokens.length === 0) return console.log("No drivers registered");

        console.log(`📣 Alerting ${tokens.length} drivers for Order...`);

        // Vendor List
        const vendorList = [...new Set((orderData.items || []).map(i => i.vendor))].join(", ");

        const message = {
            tokens: tokens,
            notification: {
                title: "📦 New Job! Pickup Ready",
                body: `Pickup: ${vendorList}\nDropoff: ${orderData.deliveryAddress}`
            },
            // Android High Priority
            android: {
                priority: "high",
                notification: { sound: "default", priority: "max", channelId: "order_alerts" }
            },
            // iOS High Priority
            apns: {
                payload: { aps: { sound: "default", "content-available": 1 } }
            },
            data: { url: "/logistics" }
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Logistics Alert Sent: ${response.successCount} successes`);
    } catch (error) {
        console.error("❌ Error alerting drivers:", error);
    }
};

/**
 * 🟢 TRIGGER 1: NEW ORDER CREATED
 * Only log the order. Don't notify anyone yet — orders start as 'pending'.
 * Notifications happen in handleOrderUpdate when status changes to 'confirmed'.
 */
exports.handleNewOrder = onDocumentCreated("orders/{orderId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const order = snapshot.data();
    const orderIdShort = event.params.orderId.slice(0, 5).toUpperCase();

    console.log(`📝 New order #${orderIdShort} created (status: ${order.status})`);

    // If order is already confirmed on creation (rare edge case), notify immediately
    if (order.status === "confirmed") {
        await notifyVendors(order, orderIdShort);
        await alertDrivers(order);
    }
});

/**
 * 🟢 HELPER: Notify Vendors
 */
const notifyVendors = async (order, orderIdShort) => {
    const vendors = [...new Set((order.items || []).map(item => item.vendor))];

    for (const vendorName of vendors) {
        if (!vendorName) continue;
        try {
            const doc = await admin.firestore().collection("notifications").doc(vendorName).get();
            if (doc.exists && doc.data().token) {
                await admin.messaging().send({
                    token: doc.data().token,
                    notification: {
                        title: "👨‍🍳 New Order!",
                        body: `#${orderIdShort}: ₦${order.total.toLocaleString()} (${order.paymentMethod})`
                    },
                    android: { priority: "high", notification: { sound: "default", priority: "max", channelId: "order_alerts" } },
                    apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
                    data: { url: "/admin" }
                });
                console.log(`✅ Vendor Alert sent to ${vendorName}`);
            }
        } catch (error) {
            console.error(`❌ Vendor alert failed (${vendorName}):`, error);
        }
    }
};

/**
 * 🟢 TRIGGER 2: ORDER UPDATED
 * When status changes to 'confirmed':
 * 1. Notify Vendor (order is now paid!)
 * 2. Notify Logistics (for delivery)
 */
exports.handleOrderUpdate = onDocumentUpdated("orders/{orderId}", async (event) => {
    const newData = event.data.after.data();
    const prevData = event.data.before.data();

    // Only run if status CHANGED to 'confirmed'
    if (newData.status === "confirmed" && prevData.status !== "confirmed") {
        const orderIdShort = event.params.orderId.slice(0, 5).toUpperCase();
        console.log(`✅ Order #${orderIdShort} confirmed! Alerting vendor + logistics...`);

        await notifyVendors(newData, orderIdShort);
        await alertDrivers(newData);
    }
});

/**
 * 🟢 SECURE CHECKOUT MATH & PROMO ENGINE
 * Calculates delivery fees, valid cart prices, and checks promo codes.
 */
const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => deg * (Math.PI / 180);
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

exports.calculateCheckoutTotals = onCall(async (request) => {
    const { cart, customerCoords, deliveryType, promoCode } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be logged in to checkout.");
    }

    if (!cart || cart.length === 0) {
        throw new HttpsError("invalid-argument", "Cart is empty.");
    }

    if (deliveryType === "delivery" && (!customerCoords || !customerCoords.lat || !customerCoords.lng)) {
        throw new HttpsError("invalid-argument", "Delivery requires GPS coordinates.");
    }

    const db = admin.firestore();
    let subTotal = 0;
    const verifiedCart = [];
    const vendorsInCart = new Set();

    // 1. Verify Cart Prices
    for (const item of cart) {
        const productSnap = await db.collection("products").doc(item.id).get();
        if (!productSnap.exists) {
            throw new HttpsError("not-found", `Product ${item.name || item.id} no longer exists.`);
        }
        const productData = productSnap.data();
        let itemTotal = productData.price;

        // Verify addons
        const verifiedAddons = [];
        if (item.selectedAddons && item.selectedAddons.length > 0) {
            for (const addon of item.selectedAddons) {
                const realAddon = (productData.addons || []).find(a => a.name === addon.name);
                if (realAddon) {
                    itemTotal += realAddon.price;
                    verifiedAddons.push({ name: realAddon.name, price: realAddon.price });
                }
            }
        }

        subTotal += itemTotal;
        vendorsInCart.add(productData.vendor);
        verifiedCart.push({
            id: item.id,
            name: productData.name,
            vendor: productData.vendor,
            price: productData.price,
            selectedAddons: verifiedAddons,
            itemTotal
        });
    }

    // 2. Calculate Delivery Fee
    let deliveryFee = 0;
    if (deliveryType === "delivery") {
        const pricingSnap = await db.collection("config").doc("delivery_pricing").get();
        const pricing = pricingSnap.exists ? pricingSnap.data() : {
            baseFee: 1100, perKmRate: 300, maxFee: 3000, multiVendorSurcharge: 300
        };

        let maxDistance = 0;
        let missingVendorLocation = false;

        for (const vendorName of vendorsInCart) {
            const vendorSnap = await db.collection("vendors").doc(vendorName).get();
            if (vendorSnap.exists && vendorSnap.data().lat && vendorSnap.data().lng) {
                const dist = calculateDistanceKm(vendorSnap.data().lat, vendorSnap.data().lng, customerCoords.lat, customerCoords.lng);
                if (dist > maxDistance) maxDistance = dist;
            } else {
                missingVendorLocation = true;
            }
        }

        if (missingVendorLocation) {
            deliveryFee = pricing.baseFee;
        } else {
            let fee = pricing.baseFee + (maxDistance * pricing.perKmRate);
            fee = Math.min(fee, pricing.maxFee);
            fee = Math.round(fee / 50) * 50;
            
            if (vendorsInCart.size > 1) {
                fee = Math.min(fee + pricing.multiVendorSurcharge, pricing.maxFee);
            }
            deliveryFee = fee;
        }
    }

    // 3. Process Promo Code
    let discount = 0;
    let appliedPromo = null;

    if (promoCode) {
        const codeUpper = promoCode.toUpperCase().trim();
        const promosSnap = await db.collection("promoCodes").where("code", "==", codeUpper).get();
        
        if (!promosSnap.empty) {
            const promoData = promosSnap.docs[0].data();
            
            if (promoData.active && subTotal <= promoData.maxOrderCap) {
                const usageSnap = await db.collection("orders")
                    .where("userId", "==", uid)
                    .where("promoCode", "==", codeUpper)
                    .get();
                
                if (usageSnap.size < promoData.maxUsesPerUser) {
                    discount = Math.round(subTotal * (promoData.discountPercentage / 100));
                    appliedPromo = codeUpper;
                } else {
                    throw new HttpsError("failed-precondition", "You have reached the maximum usage limit for this promo code.");
                }
            } else {
                if (subTotal > promoData.maxOrderCap) {
                    throw new HttpsError("failed-precondition", `Promo code valid only for food under ₦${promoData.maxOrderCap.toLocaleString()}.`);
                } else {
                    throw new HttpsError("failed-precondition", "Promo code is inactive.");
                }
            }
        } else {
             throw new HttpsError("not-found", "Invalid promo code.");
        }
    }

    const grandTotal = subTotal + deliveryFee - discount;

    return {
        subTotal,
        deliveryFee,
        discount,
        grandTotal,
        appliedPromo,
        verifiedCart
    };
});