export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 🔴 REPLACE THIS WITH YOUR PAYSTACK PUBLIC KEY
export const PAYSTACK_KEY = "pk_live_e26a023051d0eb34273cc6f86ccbf0e26ebbfdb9"; 

// 🔴 REPLACE THIS WITH YOUR FIREBASE VAPID KEY (Cloud Messaging -> Web Config)
export const VAPID_KEY = "BAutBdOnduVyCzRm2gyCLjAss8h6PSfPslMoF9BUsNfTmxUZD079QCD3ZoEb6Dixzyjdq91aS3YlwFm_iA_OicI"; 

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

// Keep empty to force DB usage
export const VENDORS_BY_LOCATION = {}; 

export const TOWN_COORDINATES = {
    "Irrua": { lat: 6.7380, lng: 6.2185 },
    "Ekpoma": { lat: 6.7420, lng: 6.1399 },
    "Uromi": { lat: 6.7111, lng: 6.3263 }
};

const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
}

export const calculateDeliveryFee = (originName, destination) => {
    if (!originName || !destination) return 0;
    const from = originName.trim();
    const to = destination.trim();
    if (from === to) return 1000;
    if ((from === 'Irrua' && to === 'Ekpoma') || (from === 'Ekpoma' && to === 'Irrua')) return 2000;
    if (from === 'Uromi' || to === 'Uromi') return 3000;
    return 2000; 
};