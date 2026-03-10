// ==========================================
// DELIVERY PRICING — HAVERSINE FORMULA
// No external API needed. Uses straight-line
// distance between vendor and customer GPS coords.
// ==========================================

// Pricing constants (editable via admin panel in Firestore)
export const DEFAULT_PRICING = {
    baseFee: 1100,        // ₦ base fee regardless of distance
    perKmRate: 300,       // ₦ per km
    maxFee: 3000,         // ₦ cap — never charge more than this
    multiVendorSurcharge: 300, // ₦ extra if cart has items from >1 vendor
};

/**
 * Calculate straight-line distance between two GPS coordinates.
 * Uses the Haversine formula.
 * @returns distance in kilometers
 */
export const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
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

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Calculate delivery fee from distance.
 * @param {number} distanceKm - straight-line distance in km
 * @param {boolean} isMultiVendor - true if cart has items from more than 1 vendor
 * @param {object} pricing - pricing config (uses defaults if not provided)
 * @returns {number} delivery fee in Naira (₦)
 */
export const calculateDeliveryFeeFromDistance = (distanceKm, isMultiVendor = false, pricing = DEFAULT_PRICING) => {
    const { baseFee, perKmRate, maxFee, multiVendorSurcharge } = pricing;

    // Base + per-km charge
    let fee = baseFee + (distanceKm * perKmRate);

    // Apply cap
    fee = Math.min(fee, maxFee);

    // Round to nearest 50 for clean pricing
    fee = Math.round(fee / 50) * 50;

    // Multi-vendor surcharge
    if (isMultiVendor) {
        fee = Math.min(fee + multiVendorSurcharge, maxFee);
    }

    return fee;
};

/**
 * Detect if a cart has items from more than one vendor.
 * @param {Array} cart - array of cart items, each with a `vendor` property
 * @returns {boolean}
 */
export const isMultiVendorCart = (cart) => {
    if (!cart || cart.length === 0) return false;
    const vendors = new Set(cart.map(item => item.vendor).filter(Boolean));
    return vendors.size > 1;
};

/**
 * Full delivery fee calculation given vendor coords, customer coords, and cart.
 * Returns fee, distance, and breakdown for display.
 */
export const getAutoDeliveryFee = (vendorLat, vendorLng, customerLat, customerLng, cart, pricing = DEFAULT_PRICING) => {
    if (!vendorLat || !vendorLng || !customerLat || !customerLng) {
        return { fee: pricing.baseFee, distance: null, isAuto: false };
    }

    const distanceKm = calculateDistanceKm(vendorLat, vendorLng, customerLat, customerLng);
    const multiVendor = isMultiVendorCart(cart);
    const fee = calculateDeliveryFeeFromDistance(distanceKm, multiVendor, pricing);

    return {
        fee,
        distance: Math.round(distanceKm * 10) / 10, // 1 decimal place
        isAuto: true,
        isMultiVendor: multiVendor,
        breakdown: {
            base: pricing.baseFee,
            distanceCharge: Math.min(Math.round(distanceKm * pricing.perKmRate / 50) * 50, pricing.maxFee - pricing.baseFee),
            multiVendorSurcharge: multiVendor ? pricing.multiVendorSurcharge : 0,
        }
    };
};
