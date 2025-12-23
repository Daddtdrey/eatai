const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions/v2");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

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
 * 1. Notify Vendor (Always)
 * 2. Notify Logistics (IF Paid via Paystack/Confirmed)
 */
exports.handleNewOrder = onDocumentCreated("orders/{orderId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    
    const order = snapshot.data();
    const orderIdShort = event.params.orderId.slice(0, 5).toUpperCase();
    
    // --- A. NOTIFY VENDOR ---
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
                        body: `#${orderIdShort}: ₦${order.total.toLocaleString()} (Paid: ${order.paymentMethod})`
                    },
                    android: { priority: "high", notification: { sound: "default" } },
                    apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
                    data: { url: "/admin" }
                });
                console.log(`✅ Vendor Alert sent to ${vendorName}`);
            }
        } catch (error) {
            console.error(`❌ Vendor alert failed (${vendorName}):`, error);
        }
    }

    // --- B. NOTIFY LOGISTICS (If Paystack/Confirmed) ---
    if (order.status === "confirmed") {
        console.log("💰 Order is auto-confirmed (Paystack). Alerting Logistics immediately.");
        await alertDrivers(order);
    }
});

/**
 * 🟢 TRIGGER 2: ORDER UPDATED
 * Notify Logistics ONLY if status CHANGES to 'confirmed' (Manual/Crypto payments)
 */
exports.handleOrderUpdate = onDocumentUpdated("orders/{orderId}", async (event) => {
    const newData = event.data.after.data();
    const prevData = event.data.before.data();

    // Only run if status CHANGED to 'confirmed'
    // (We check this to avoid double-alerting on Paystack orders which start as confirmed)
    if (newData.status === "confirmed" && prevData.status !== "confirmed") {
        console.log("📝 Order manually confirmed. Alerting Logistics...");
        await alertDrivers(newData);
    }
});