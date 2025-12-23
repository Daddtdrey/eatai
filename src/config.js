export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const PAYSTACK_KEY = "pk_live_e26a023051d0eb34273cc6f86ccbf0e26ebbfdb9"; // 🔴 REPLACE THIS WITH YOUR KEY
export const VAPID_KEY = "BAutBdOnduVyCzRm2gyCLjAss8h6PSfPslMoF9BUsNfTmxUZD079QCD3ZoEb6Dixzyjdq91aS3YlwFm_iA_OicI"; 
// 2. ROLES & EMAILS
export const SUPER_ADMINS = ["mannikdaniel@gmail.com"]; // 🔴 REPLACE THIS WITH YOUR EMAIL
export const LOGISTICS_EMAILS = ["ehijieizunyon28@gmail.com, kayscourierlogistics@gmail.com"];

export const SUB_ADMINS = {
    "dreytwitte@gmail.com": "NASCO",
    "dreytwitter@gmail.com": "NAISHAT",
    "favourobehi20@gmail.com": "OBest",
    "amapataze@gmail.com": "Phattie Chop Box",
    "yummy.manager@gmail.com": "Yummy You",
    "bigtaste.manager@gmail.com": "Phattie Chop Box",
    "affluence.manager@gmail.com": "Affluence",
    "bigjoe.manager@gmail.com": "Big Joe"
};

// 3. LOCATIONS & VENDORS
export const LOCATIONS = ["Irrua", "Ekpoma", "Uromi"];

// DEFAULT VENDORS (Fallback if DB is empty)
export const VENDORS_BY_LOCATION = {
    "Irrua": ["NASCO", "NAISHAT", "OBest", "Phattie Chop Box"],
    "Ekpoma": ["Yummy You", "Big Taste", "Affluence"],
    "Uromi": ["Big Joe", "Uromi Grill"]
};

// 🟢 FIXED: DELIVERY LOGIC
export const calculateDeliveryFee = (origin, destination) => {
    if (!origin || !destination) return 0;
    
    // Normalize strings to avoid case sensitivity issues
    const from = origin.trim();
    const to = destination.trim();

    // 1. WITHIN SAME TOWN (₦1,000)
    if (from === to) return 1000;

    // 2. IRRUA <-> EKPOMA (₦2,000)
    if ((from === 'Irrua' && to === 'Ekpoma') || (from === 'Ekpoma' && to === 'Irrua')) {
        return 2000;
    }

    // 3. ANY <-> UROMI (₦3,000)
    // (Except Uromi to Uromi which is caught by rule #1)
    if (from === 'Uromi' || to === 'Uromi') {
        return 3000;
    }

    // Default Fallback
    return 2000; 
};