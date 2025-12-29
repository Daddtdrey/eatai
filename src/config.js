export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 🔴 REPLACE THIS WITH YOUR PAYSTACK PUBLIC KEY
export const PAYSTACK_KEY = "pk_test_820dddbfe9b5fea37e5e7d83eaaf2fd50065f0c7"; 

// 🔴 REPLACE THIS WITH YOUR FIREBASE VAPID KEY (Cloud Messaging -> Web Config)
export const VAPID_KEY = "PASTE_YOUR_LONG_KEY_HERE"; 

// 2. ROLES & EMAILS
export const SUPER_ADMINS = ["mannikdaniel@gmail.com"]; 
export const LOGISTICS_EMAILS = ["driver@gmail.com"]; 

// FALLBACK SUB-ADMINS (If DB fails)
export const SUB_ADMINS = {
    "nasco.manager@gmail.com": "NASCO",
};

export const BANK_DETAILS = { bank: "OPay", number: "8012345678", name: "EatAi Ventures" };

// 3. LOCATIONS & VENDORS
export const LOCATIONS = ["Irrua", "Ekpoma", "Uromi"];

// DEFAULT VENDORS (Fallback)
export const VENDORS_BY_LOCATION = {
    "Irrua": ["NASCO", "NAISHAT", "OBest", "Phattie Chop Box"],
    "Ekpoma": ["Yummy You", "Big Taste", "Affluence"],
    "Uromi": ["Big Joe", "Uromi Grill"]
};

// 📍 GEOMAPPING COORDINATES (Lat/Lng)
export const TOWN_COORDINATES = {
    "Irrua": { lat: 6.7380, lng: 6.2185 },
    "Ekpoma": { lat: 6.7420, lng: 6.1399 },
    "Uromi": { lat: 6.7111, lng: 6.3263 }
};

// 📏 DISTANCE CALCULATOR (Haversine Formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; 
    return d;
}

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
}

// 🚚 DYNAMIC PRICING LOGIC
export const calculateDeliveryFee = (originName, destination) => {
    if (!originName || !destination) return 0;
    
    const from = originName.trim();
    const to = destination.trim();

    // 1. WITHIN SAME TOWN (₦1,000)
    if (from === to) return 1000;

    // 2. IRRUA <-> EKPOMA (₦2,000)
    if ((from === 'Irrua' && to === 'Ekpoma') || (from === 'Ekpoma' && to === 'Irrua')) {
        return 2000;
    }

    // 3. ANY <-> UROMI (₦3,000)
    if (from === 'Uromi' || to === 'Uromi') {
        return 3000;
    }

    // Default Fallback
    return 2000; 
};