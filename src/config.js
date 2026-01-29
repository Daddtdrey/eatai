export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 🔴 REPLACE THIS WITH YOUR PAYSTACK PUBLIC KEY
export const PAYSTACK_KEY = "pk_live_e26a023051d0eb34273cc6f86ccbf0e26ebbfdb9"; 

// 🔴 REPLACE THIS WITH YOUR FIREBASE VAPID KEY (Cloud Messaging -> Web Config)
export const VAPID_KEY = "BAutBdOnduVyCzRm2gyCLjAss8h6PSfPslMoF9BUsNfTmxUZD079QCD3ZoEb6Dixzyjdq91aS3YlwFm_iA_OicI"; 

export const SUPER_ADMINS = ["your-email@gmail.com"]; 
export const LOGISTICS_EMAILS = ["driver@gmail.com"]; 

export const SUB_ADMINS = {
    "nasco.manager@gmail.com": "NASCO",
};

export const BANK_DETAILS = { bank: "OPay", number: "8012345678", name: "EatAi Ventures" };

// 🟢 NEW: DELIVERY ZONES & PRICES
// This structure maps: City -> List of Areas -> Price
export const DELIVERY_ZONES = {
    "Irrua": [
        { name: "Irrua - Central / ISTH", price: 1000 },
        { name: "Irrua - Palace Road", price: 1500 },
        { name: "Irrua - Ako Junction", price: 1500 },
        { name: "Irrua - Other", price: 1500 },
        { name: "Ekpoma (Inter-city)", price: 2000 } // Delivery from Irrua to Ekpoma
    ],
    "Ekpoma": [
        { name: "Ekpoma - Market Square", price: 1000 },
        { name: "Ekpoma - Mandela", price: 1500 },
        { name: "Ekpoma - Poultry Road", price: 2000 },
        { name: "Ekpoma - Ambrose Alli Uni", price: 1500 },
        { name: "Ekpoma - Other", price: 1500 },
        { name: "Irrua (Inter-city)", price: 2000 } // Delivery from Ekpoma to Irrua
    ],
    "Uromi": [
        { name: "Uromi - Central", price: 1000 },
        { name: "Uromi - Outskirts", price: 1500 },
        { name: "Uromi - Other", price: 2000 }
    ]
};

// Main Locations for the Home Screen
export const LOCATIONS = ["Irrua", "Ekpoma", "Uromi"];

// Fallback Vendors
export const VENDORS_BY_LOCATION = {}; 

// 🟢 NEW: SIMPLE PRICE CALCULATOR
// It simply looks up the price of the selected zone name
export const calculateDeliveryFee = (city, selectedZoneName) => {
    if (!city || !selectedZoneName) return 0;
    
    // Find the zone list for the current city
    const zones = DELIVERY_ZONES[city] || [];
    
    // Find the specific zone object
    const zone = zones.find(z => z.name === selectedZoneName);
    
    // Return price or default 1500 if not found
    return zone ? zone.price : 1500;
};