import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Database, Bike, Sun, Moon, LogOut, Home, Wallet, ChefHat, Search, Download, X, Share 
} from 'lucide-react';
import { auth, getAllProducts, getPaginatedProducts, getAdminRole, logout, getVendorLogos, getGlobalVendors } from './firebase.js'; 
import { onAuthStateChanged } from 'firebase/auth';

// 🟢 IMPORT MODULES
import { Toast } from './components/UI.jsx';
import { 
    LoginView, HomeView, LocationSelectionView, VendorSelectionView, 
    MarketView, OrdersView, WalletView, DeciderView, CartOverlay 
} from './views/Shop.jsx';
import { AdminView, LogisticsView } from './views/Dashboards.jsx';
import { SUPER_ADMINS, LOGISTICS_EMAILS, SUB_ADMINS, VENDORS_BY_LOCATION as FALLBACK_VENDORS, LOCATIONS } from './config.js';

export default function EatAi() {
  // --- STATE MANAGEMENT ---
  
  // 1. View State & User
  const [currentView, setCurrentView] = useState(localStorage.getItem('eatai_view') || 'home');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // 2. Data State (Pagination & Vendors)
  const [marketData, setMarketData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [vendorLogos, setVendorLogos] = useState({});
  
  // 🟢 Dynamic Vendors & Metadata (Hours)
  const [vendorsByLocation, setVendorsByLocation] = useState(FALLBACK_VENDORS);
  const [vendorMetadata, setVendorMetadata] = useState({}); 

  // 🟢 Pagination State
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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
  
  useEffect(() => { 
      const u = onAuthStateChanged(auth, (c) => { 
          setUser(c); 
          setAuthLoading(false); 
      }); 
      return () => u(); 
  }, []);

  // 🟢 INSTALL PROMPT LISTENER
  useEffect(() => {
    // Detect iOS
    const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (iOS && !isStandalone) {
        setIsIOS(true);
        setTimeout(() => setShowInstallBanner(true), 3000);
    }

    // Detect Android
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 🟢 DATA LOADING (Pagination + Dynamic Vendors)
  useEffect(() => { 
      const fetchData = async () => {
          try {
            // 1. Products (Paginated - Fetch first 20)
            const { data, lastVisible } = await getPaginatedProducts(null);
            setMarketData(data);
            setLastDoc(lastVisible);
            setHasMore(data.length === 20);

            // 2. Vendors (Dynamic from DB)
            const result = await getGlobalVendors();
            
            if (result && result.vendorsByLocation) {
                // Merge dynamic vendors with fallback config so nothing is lost
                const mergedVendors = { ...FALLBACK_VENDORS };
                Object.keys(result.vendorsByLocation).forEach(loc => {
                    const existing = mergedVendors[loc] || [];
                    const incoming = result.vendorsByLocation[loc];
                    mergedVendors[loc] = [...new Set([...existing, ...incoming])];
                });
                setVendorsByLocation(mergedVendors);
                
                // Save Metadata (Hours, Logos)
                if (result.vendorMetadata) {
                    setVendorMetadata(result.vendorMetadata);
                }
            }

            // 3. Logos
            const logos = await getVendorLogos();
            setVendorLogos(logos);
          } catch(e) { console.error("Error loading data", e); }
          
          setLoadingData(false);
      };
      fetchData();
  }, []);

  // 🟢 LOAD MORE HANDLER (For Infinite Scroll in Market)
  const handleLoadMore = async () => {
      if (isLoadingMore || !hasMore) return;
      setIsLoadingMore(true);
      try {
          const { data, lastVisible } = await getPaginatedProducts(lastDoc);
          setMarketData(prev => [...prev, ...data]);
          setLastDoc(lastVisible);
          setHasMore(data.length === 20);
      } catch (e) { console.error(e); }
      setIsLoadingMore(false);
  };

  // Role Checking
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

  // 🟢 INSTALL APP HANDLER
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };
  
  // AI Logic
  const generateRecipes = async () => {
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
  };

  // --- RENDER ---
  if (authLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <div className={darkMode ? "dark" : ""}><LoginView /></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-slate-50 dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
        
        {notification && <Toast message={notification} />}

        {/* 🟢 SMART INSTALL BANNER */}
        {showInstallBanner && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white p-4 shadow-lg animate-slide-down flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg"><Download className="w-5 h-5"/></div>
               <div>
                 <p className="font-bold text-sm">Install EatAi App</p>
                 <p className="text-xs opacity-90">{isIOS ? "Tap Share below, then 'Add to Home Screen'" : "Add to Home Screen for best experience"}</p>
               </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowInstallBanner(false)} className="p-2 text-orange-200 hover:text-white"><X className="w-5 h-5"/></button>
                {/* Only show 'Install' button on Android. iOS requires manual action. */}
                {!isIOS && <button onClick={handleInstallClick} className="bg-white text-orange-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm">Install</button>}
                {isIOS && <div className="animate-bounce"><Share className="w-5 h-5"/></div>}
            </div>
          </div>
        )}

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
        
        {/* HEADER */}
        <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md dark:bg-gray-900/80 shadow-sm z-40 transition-colors border-b border-gray-200/50 dark:border-gray-800">
            <div className="text-xl font-black text-orange-500 cursor-pointer" onClick={() => setCurrentView('home')}>EatAi</div>
            <div className="flex items-center gap-3">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
                <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"><LogOut className="w-5 h-5"/></button>
            </div>
        </header>

        <main className="flex-1 overflow-hidden relative flex flex-col">
            {currentView === 'home' && <HomeView setCurrentView={setCurrentView} user={user} />}
            
            {/* 🟢 PASS LOCATIONS */}
            {currentView === 'location' && 
                <LocationSelectionView 
                    setCity={setCity} 
                    setCurrentView={setCurrentView} 
                    locations={LOCATIONS} 
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
            
            {/* 🟢 MARKET VIEW: Pagination + Metadata (Hours) */}
            {currentView === 'market' && 
                <MarketView 
                    setCurrentView={setCurrentView} 
                    addToCart={addToCart} 
                    marketData={marketData} 
                    loadingData={loadingData} 
                    city={city} 
                    vendor={vendor} 
                    user={user} 
                    vendorMetadata={vendorMetadata} 
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                />
            }
            
            {currentView === 'orders' && <OrdersView setCurrentView={setCurrentView} user={user} />}
            {currentView === 'wallet' && <WalletView setCurrentView={setCurrentView} user={user} />}
            
            {currentView === 'decider' && 
                <DeciderView 
                    ingredients={ingredients} 
                    setIngredients={setIngredients} 
                    generateRecipes={generateRecipes} 
                    isThinking={isThinking} 
                    aiRecipe={aiRecipe} 
                    setAiRecipe={setAiRecipe}
                    setIsThinking={setIsThinking}
                    setCurrentView={setCurrentView} 
                    activeFilters={activeFilters} 
                    toggleFilter={(f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} 
                />
            }
            
            {/* 🟢 DASHBOARDS: Pass dynamic vendors for Super Admin Dropdown */}
            {currentView === 'admin' && isAdmin && 
                <AdminView 
                    setCurrentView={setCurrentView} 
                    marketData={marketData} 
                    refreshData={async () => {
                        const { data, lastVisible } = await getPaginatedProducts(null);
                        setMarketData(data);
                        setLastDoc(lastVisible);
                        setHasMore(data.length === 20);
                    }} 
                    user={user} 
                    setNotification={setNotification} 
                    vendorsByLocation={vendorsByLocation} 
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

        {/* FLOATING ACTION BUTTONS */}
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