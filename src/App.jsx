import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Database, Bike, Sun, Moon, LogOut, Home, Wallet, ChefHat, Search 
} from 'lucide-react';
import { auth, getAllProducts, getAdminRole, logout, getVendorLogos, getGlobalVendors } from './firebase.js'; 
import { onAuthStateChanged } from 'firebase/auth';

// 🟢 IMPORT MODULES
import { Toast } from './components/UI.jsx';
import { 
    LoginView, HomeView, LocationSelectionView, VendorSelectionView, 
    MarketView, OrdersView, WalletView, DeciderView, CartOverlay 
} from './views/Shop.jsx';
import { AdminView, LogisticsView } from './views/Dashboards.jsx';
import { SUPER_ADMINS, LOGISTICS_EMAILS, SUB_ADMINS, VENDORS_BY_LOCATION as FALLBACK_VENDORS, LOCATIONS as DEFAULT_LOCATIONS } from './config.js';

export default function EatAi() {
  // --- STATE MANAGEMENT ---
  
  // 1. View State & User
  const [currentView, setCurrentView] = useState(localStorage.getItem('eatai_view') || 'home');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // 2. Data State
  const [marketData, setMarketData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [vendorLogos, setVendorLogos] = useState({});
  
  // 🟢 STATE: Start with Fallback, but ready to replace with DB
  const [vendorsByLocation, setVendorsByLocation] = useState(FALLBACK_VENDORS);
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);

  // 3. User Preferences (Persisted)
  const [city, setCity] = useState(localStorage.getItem('eatai_city') || null);
  const [vendor, setVendor] = useState(localStorage.getItem('eatai_vendor') || null);
  const [cart, setCart] = useState(() => { 
      try {
          const saved = localStorage.getItem('eatai_cart'); 
          return saved ? JSON.parse(saved) : []; 
      } catch (e) { return []; }
  });
  
  const [darkMode, setDarkMode] = useState(() => {
      const saved = localStorage.getItem('eatai_dark_mode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 4. UI State
  const [notification, setNotification] = useState(null);

  // 5. AI & Filter State
  const [ingredients, setIngredients] = useState('');
  const [aiRecipe, setAiRecipe] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  // 6. Role State
  const [role, setRole] = useState(null);
  const [myVendorName, setMyVendorName] = useState(null);

  // --- EFFECTS ---

  useEffect(() => { localStorage.setItem('eatai_view', currentView); }, [currentView]);
  useEffect(() => { localStorage.setItem('eatai_cart', JSON.stringify(cart)); }, [cart]);
  
  // Dark Mode Effect
  useEffect(() => { 
      localStorage.setItem('eatai_dark_mode', JSON.stringify(darkMode));
      if (darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [darkMode]);

  useEffect(() => { 
      if(city) localStorage.setItem('eatai_city', city); 
      else localStorage.removeItem('eatai_city');
  }, [city]);
  useEffect(() => { 
      if(vendor) localStorage.setItem('eatai_vendor', vendor); 
      else localStorage.removeItem('eatai_vendor');
  }, [vendor]);
  
  // Auth Listener
  useEffect(() => { 
      const u = onAuthStateChanged(auth, (c) => { 
          setUser(c); 
          setAuthLoading(false); 
      }); 
      return () => u(); 
  }, []);

  // Data Loading (Fetch & Cache)
  useEffect(() => { 
      const fetchData = async () => {
          try {
            const products = await getAllProducts();
            setMarketData(products);
            
            // 🟢 LOAD VENDORS FROM DB
            const dynamicVendors = await getGlobalVendors();
            
            if (dynamicVendors && Object.keys(dynamicVendors).length > 0) {
                console.log("✅ Using Firebase Vendors:", dynamicVendors);
                
                // 1. Update Vendor List (REPLACE the hardcoded list completely)
                setVendorsByLocation(dynamicVendors);

                // 2. Update Location List dynamically based on active vendors
                // (Optional: Merge with DEFAULT_LOCATIONS if you want empty cities to still show up)
                const dbLocations = Object.keys(dynamicVendors);
                const mergedLocations = [...new Set([...DEFAULT_LOCATIONS, ...dbLocations])];
                setLocations(mergedLocations);
            } else {
                console.log("⚠️ No Vendors in DB. Using Config Fallback.");
            }

            const logos = await getVendorLogos();
            setVendorLogos(logos);
          } catch(e) { console.error("Error loading data", e); }
          
          setLoadingData(false);
      };
      fetchData();
  }, []);

  useEffect(() => {
      const checkRole = async () => {
          if(!user) return;
          try {
             // 1. Check Database for Role
             const roleData = await getAdminRole(user.email);
             if(roleData) {
                 const foundRole = roleData.role || roleData.type;
                 setRole(foundRole);
                 if(foundRole === 'sub' || foundRole === 'vendor') {
                     setMyVendorName(roleData.vendor || roleData.vendorName);
                 }
             } else {
                 // 2. Fallback Configuration
                 const email = user.email.toLowerCase();
                 if(SUPER_ADMINS.includes(email)) setRole('super');
                 else if(LOGISTICS_EMAILS.includes(email)) setRole('logistics');
                 else if(SUB_ADMINS[email]) {
                     setRole('sub');
                     setMyVendorName(SUB_ADMINS[email]);
                 }
             }
         } catch(e) { console.error("Role check failed", e); }
      };
      checkRole();
  }, [user]);

  // --- HANDLERS ---
  const addToCart = (item) => {
    setCart([...cart, { ...item, cartId: Date.now() }]);
    setNotification(`Added ${item.name} to cart!`);
    setTimeout(() => setNotification(null), 2000);
  };
  
  const removeFromCart = (id) => setCart(cart.filter(i => i.cartId !== id));
  const cartTotal = cart.reduce((s, i) => s + i.price, 0).toFixed(2);
  
  const isAdmin = role === 'super' || role === 'sub' || role === 'vendor';
  const isLogistics = role === 'logistics';

  // --- RENDER ---
  if (authLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <div className={darkMode ? "dark" : ""}><LoginView /></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-slate-50 dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
        
        {notification && <Toast message={notification} />}

        <CartOverlay 
            cart={cart} 
            setCart={setCart} 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            removeFromCart={removeFromCart} 
            cartTotal={Number(cartTotal)} 
            globalWallet={null} 
            user={user} 
            city={city} 
        />
        
        {/* HEADER: Updated background to off-white */}
        <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 shadow-sm z-40 transition-colors border-b border-gray-200/50 dark:border-gray-800">
            <div className="text-xl font-black text-orange-500 cursor-pointer" onClick={() => setCurrentView('home')}>EatAi</div>
            <div className="flex items-center gap-3">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
                <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"><LogOut className="w-5 h-5"/></button>
            </div>
        </header>

        <main className="flex-1 overflow-hidden relative flex flex-col">
            {currentView === 'home' && <HomeView setCurrentView={setCurrentView} user={user} />}
            
            {/* 🟢 PASS DYNAMIC LOCATIONS */}
            {currentView === 'location' && 
                <LocationSelectionView 
                    setCity={setCity} 
                    setCurrentView={setCurrentView} 
                    locations={locations} 
                />
            }
            
            {/* 🟢 PASS DYNAMIC VENDORS */}
            {currentView === 'vendors' && 
                <VendorSelectionView 
                    city={city} 
                    setVendor={setVendor} 
                    setCurrentView={setCurrentView} 
                    vendorLogos={vendorLogos} 
                    vendorsByLocation={vendorsByLocation} 
                />
            }
            
            {currentView === 'market' && 
                <MarketView 
                    setCurrentView={setCurrentView} 
                    addToCart={addToCart} 
                    marketData={marketData} 
                    loadingData={loadingData} 
                    city={city} 
                    vendor={vendor} 
                />
            }
            
            {currentView === 'orders' && <OrdersView setCurrentView={setCurrentView} user={user} />}
            {currentView === 'wallet' && <WalletView setCurrentView={setCurrentView} user={user} />}
            
            {currentView === 'decider' && 
                <DeciderView 
                    ingredients={ingredients} 
                    setIngredients={setIngredients} 
                    generateRecipes={async () => {
                         if (!ingredients.trim()) return;
                         setIsThinking(true); 
                         setAiRecipe(null);
                         try {
                              const { GEMINI_API_KEY } = await import('./config.js');
                              const prompt = `Chef mode. Ingredients: ${ingredients}. ${activeFilters.join(', ')}. 2 Recipes. Format: Title, Ingredients, Steps. No markdown.`;
                              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, { 
                                 method: 'POST', 
                                 headers: {'Content-Type': 'application/json'}, 
                                 body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
                             });
                             const data = await res.json();
                             setAiRecipe(data.candidates?.[0]?.content?.parts?.[0]?.text);
                         } catch(e) { console.error(e); } 
                         finally { setIsThinking(false); }
                    }} 
                    isThinking={isThinking} 
                    aiRecipe={aiRecipe} 
                    setAiRecipe={setAiRecipe}
                    setIsThinking={setIsThinking}
                    setCurrentView={setCurrentView} 
                    activeFilters={activeFilters} 
                    toggleFilter={(f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} 
                />
            }
            
            {/* Admin Views */}
            {currentView === 'admin' && isAdmin && 
                <AdminView 
                    setCurrentView={setCurrentView} 
                    marketData={marketData} 
                    refreshData={async () => {
                        const products = await getAllProducts();
                        setMarketData(products);
                        localStorage.setItem('eatai_market_data', JSON.stringify(products));
                    }} 
                    user={user} 
                    setNotification={setNotification} 
                />
            }
            {currentView === 'logistics' && isLogistics && 
                <LogisticsView 
                    setCurrentView={setCurrentView} 
                    user={user} 
                    setNotification={setNotification} 
                />
            }
        </main>

        {isAdmin && (
             <div className="fixed bottom-24 left-6 z-50 animate-bounce"><button onClick={() => setCurrentView('admin')} className="bg-gray-900 text-white font-bold text-xs px-4 py-3 rounded-full shadow-xl flex items-center gap-2 border border-gray-700 hover:bg-gray-800 transition-colors"><Database className="w-4 h-4" /> Manager HQ</button></div>
        )}
        
        {isLogistics && (
             <div className="fixed bottom-24 right-6 z-50 animate-bounce"><button onClick={() => setCurrentView('logistics')} className="bg-purple-900 text-white font-bold text-sm px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-purple-700 hover:bg-purple-800 transition-colors"><Bike className="w-4 h-4" /> Logistics Hub</button></div>
        )}

        <nav className="flex-none bg-white/90 backdrop-blur-md dark:bg-gray-900/90 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-around items-center z-40 safe-area-pb">
            <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center ${currentView === 'home' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}><Home className="w-6 h-6"/><span className="text-[10px] mt-1 font-medium">Home</span></button>
            <button onClick={() => setCurrentView('wallet')} className={`flex flex-col items-center ${currentView === 'wallet' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}><Wallet className="w-6 h-6"/><span className="text-[10px] mt-1 font-medium">Crypto</span></button>
            <button onClick={() => setCurrentView('decider')} className={`flex-col items-center hidden md:flex ${currentView === 'decider' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}><ChefHat className="w-6 h-6"/><span className="text-[10px] mt-1 font-medium">Chef</span></button>
            <button onClick={() => setCurrentView('location')} className={`flex flex-col items-center ${['location', 'vendors', 'market'].includes(currentView) ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}><Search className="w-6 h-6"/><span className="text-[10px] mt-1 font-medium">Market</span></button>
            <button onClick={() => setCurrentView('cart')} className={`flex flex-col items-center relative ${currentView === 'cart' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}><ShoppingCart className="w-6 h-6"/>{cart.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">{cart.length}</span>}<span className="text-[10px] mt-1 font-medium">Cart</span></button>
        </nav>
      </div>
    </div>
  );
}
