import React, { useState, useEffect } from 'react';
import { 
  ChefHat, ShoppingBag, Package, Store, ArrowLeft, LogIn, 
  ShoppingCart, CreditCard, Wallet, MapPin, Leaf, Beef, Zap, Cookie, 
  X, Minus, Sparkles, Box, Bell, Heart, Flame, Baby, Dumbbell, Plus, Eye,
  Mail, Lock, User, Search, Home, Navigation, ChevronDown, Percent, Trash2, BellRing
} from 'lucide-react';
import { PaystackButton } from 'react-paystack';
import { ethers } from 'ethers';

// 🟢 IMPORTS
import { ViewContainer, DietaryFilter, ProductCard, OrderDetailModal, Toast } from '../components/UI';
import { 
    signInWithGoogle, createOrder, getUserOrders, saveUserProfile, getUserProfile, 
    db, collection, onSnapshot, query, where, saveWalletToProfile, requestNotificationPermission,
    signUpWithEmail, logInWithEmail, saveStockRequest
} from '../firebase';
import { LOCATIONS, VENDORS_BY_LOCATION, PAYSTACK_KEY, BANK_DETAILS, calculateDeliveryFee, GEMINI_API_KEY } from '../config';

// --- 1. LOGIN VIEW ---
export const LoginView = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isSignUp) { await signUpWithEmail(email, password, name); } 
            else { await logInWithEmail(email, password); }
        } catch (err) { setError("Authentication failed. Check your details."); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in bg-slate-50 dark:bg-gray-950 overflow-y-auto">
            <div className="w-full max-w-sm">
                 <div className="w-24 h-24 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce shadow-orange-200 dark:shadow-none shadow-lg">
                    <ChefHat className="w-12 h-12 text-orange-500" />
                 </div>
                 <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight font-[Fredoka]">EatAi</h1>
                 <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Smart Food Delivery</p>

                 <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Full Name" className="w-full pl-10 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input type="email" placeholder="Email" className="w-full pl-10 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input type="password" placeholder="Password" className="w-full pl-10 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    
                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

                    <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-70">
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                 </form>

                 <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-3 bg-slate-50 dark:bg-gray-950 text-gray-400 font-medium">Or</span></div>
                 </div>

                 <button onClick={signInWithGoogle} className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <LogIn className="w-5 h-5" /> Continue with Google
                 </button>

                 <p className="mt-8 text-sm text-gray-500 font-medium">
                    {isSignUp ? "Already have an account?" : "New to EatAi?"} 
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-orange-500 font-bold hover:underline">
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                 </p>
            </div>
        </div>
    );
};

// --- 2. 🟢 PREMIUM HOME VIEW ---
export const HomeView = ({ setCurrentView, user }) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            setHasPermission(true);
        }
    }, []);

    const handleNotificationClick = async () => {
        const token = await requestNotificationPermission(user.uid);
        if (token) setHasPermission(true);
    };

    // Mock Data for Top Vendors (Will filter real data later if needed)
    const allTopVendors = [
        { name: 'Nasco', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200&auto=format&fit=crop', tags: 'Rice • Pasta' },
        { name: 'Big Joe', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop', tags: 'Grill • Chicken' },
        { name: 'Phattie Chop', img: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=200&auto=format&fit=crop', tags: 'food' },
        { name: 'Yummy You', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=200&auto=format&fit=crop', tags: 'Snacks' }
    ];

    // Search Logic
    const filteredVendors = allTopVendors.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="flex flex-col h-full animate-fade-in pb-32 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
            
            {/* HEADER & SEARCH */}
            <div className="px-6 pt-6 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 rounded-b-3xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{greeting},</p>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 font-[Fredoka]">
                             {user?.displayName?.split(' ')[0]} 👋
                        </h1>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-sm overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${user?.displayName}&background=ffedd5&color=f97316`} alt="User" />
                    </div>
                </div>

                {/* 🟢 REAL SEARCH BAR */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 p-3.5 rounded-2xl flex items-center gap-3 text-gray-400 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search vendors or food..." 
                        className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-white font-medium placeholder-gray-400 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-6 space-y-6">
                
                {/* 🟢 HERO BANNER (Light Orange, No "Free Delivery") */}
                <div className="relative w-full h-48 bg-orange-400 rounded-[2rem] overflow-hidden shadow-xl shadow-orange-500/20 flex items-center group cursor-pointer" onClick={() => setCurrentView('location')}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    
                    <div className="relative z-10 pl-6 w-1/2">
                        <h2 className="text-3xl font-black text-white leading-tight mb-2 font-[Fredoka]">Hungry? <br/>Eat Now.</h2>
                        <span className="text-white/90 text-xs font-bold flex items-center gap-1 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                            Order Food <ArrowLeft className="w-3 h-3 rotate-180"/>
                        </span>
                    </div>

                    {/* Food Collage */}
                    <img src="https://res.cloudinary.com/dmsq7n9k6/image/upload/v1764867460/cld-sample-4.jpg" className="absolute -right-4 -bottom-2 w-36 h-36 object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500 z-20" alt="Burger" />
                    <img src="https://res.cloudinary.com/dmsq7n9k6/image/upload/v1765286979/vef0v6ioqmbdrjdkfzws.jpg" className="absolute right-24 top-4 w-16 h-16 object-contain opacity-50 rotate-12 z-10" alt="Pizza" />
                </div>

                {/* 🟢 TOP VENDORS LIST */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg font-[Fredoka]">Top Vendors</h3>
                        {!searchQuery && <span onClick={() => setCurrentView('vendors')} className="text-orange-500 text-xs font-bold cursor-pointer hover:underline">See all</span>}
                    </div>
                    
                    <div className={`flex ${searchQuery ? 'flex-col gap-3' : 'gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-5 px-5'}`}>
                         {filteredVendors.map((vendor, i) => (
                             <div key={i} onClick={() => setCurrentView('vendors')} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer group ${searchQuery ? 'flex flex-row items-center p-2 gap-3' : 'min-w-[200px] flex-col'}`}>
                                 
                                 {/* Image */}
                                 <div className={`${searchQuery ? 'w-16 h-16 rounded-xl' : 'h-28 w-full'} bg-gray-200 dark:bg-gray-800 relative overflow-hidden`}>
                                     <img src={vendor.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={vendor.name} />
                                 </div>
                                 
                                 {/* Info */}
                                 <div className="p-3">
                                     <h4 className="font-black text-gray-800 dark:text-white text-sm font-[Fredoka]">{vendor.name}</h4>
                                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{vendor.tags}</p>
                                 </div>
                             </div>
                         ))}
                         
                         {filteredVendors.length === 0 && (
                             <p className="text-center text-gray-400 text-sm py-4">No vendors found matching "{searchQuery}"</p>
                         )}
                    </div>
                </div>

                {/* QUICK ACTIONS */}
                <div>
                    <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3 font-[Fredoka]">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setCurrentView('decider')} className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:border-indigo-200">
                            <div className="bg-white dark:bg-indigo-600 p-2.5 rounded-full shadow-sm text-indigo-600 dark:text-white"><ChefHat className="w-5 h-5" /></div>
                            <span className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">AI Chef</span>
                        </button>
                        <button onClick={() => setCurrentView('orders')} className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:border-emerald-200">
                            <div className="bg-white dark:bg-emerald-600 p-2.5 rounded-full shadow-sm text-emerald-600 dark:text-white"><Package className="w-5 h-5" /></div>
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">My Orders</span>
                        </button>
                        <button onClick={() => setCurrentView('wallet')} className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:border-purple-200">
                            <div className="bg-white dark:bg-purple-600 p-2.5 rounded-full shadow-sm text-purple-600 dark:text-white"><Wallet className="w-5 h-5" /></div>
                            <span className="font-bold text-purple-900 dark:text-purple-200 text-sm">Wallet</span>
                        </button>
                        
                        {!hasPermission ? (
                            <button onClick={handleNotificationClick} className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:border-blue-200 animate-pulse">
                                <div className="bg-white dark:bg-blue-600 p-2.5 rounded-full shadow-sm text-blue-600 dark:text-white"><Bell className="w-5 h-5" /></div>
                                <span className="font-bold text-blue-900 dark:text-blue-200 text-sm">Enable Alerts</span>
                            </button>
                        ) : (
                            <button onClick={() => setCurrentView('location')} className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:border-orange-200">
                                <div className="bg-white dark:bg-orange-600 p-2.5 rounded-full shadow-sm text-orange-600 dark:text-white"><Store className="w-5 h-5" /></div>
                                <span className="font-bold text-orange-900 dark:text-orange-200 text-sm">Vendors</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* CATEGORIES */}
                <div>
                    <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3 font-[Fredoka]">Categories</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                        {['Rice', 'Soup', 'Snacks', 'Drinks', 'Grill'].map((cat, i) => (
                             <div key={i} onClick={() => setCurrentView('location')} className="min-w-[70px] h-20 bg-white dark:bg-gray-900 rounded-2xl flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm shrink-0 active:scale-95 transition-transform cursor-pointer hover:border-orange-200">
                                 <div className="text-2xl mb-1">{['🍚','🍲','🍩','🥤','🍗'][i]}</div>
                                 <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{cat}</span>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. LOCATION SELECTOR ---
export const LocationSelectionView = ({ setCity, setCurrentView, locations }) => {
    const displayLocations = locations && locations.length > 0 ? locations : LOCATIONS;

    return (
        <ViewContainer title="Select Location" showBack onBack={() => setCurrentView('home')}>
            <div className="grid grid-cols-1 gap-3 mt-2">
                {displayLocations.map((loc) => (
                    <button key={loc} onClick={() => { setCity(loc); setCurrentView('vendors'); }} className="group p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📍</div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-gray-800 dark:text-white font-[Fredoka]">{loc}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Browse vendors</p>
                            </div>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-orange-500 rotate-180 transition-colors" />
                    </button>
                ))}
            </div>
        </ViewContainer>
    );
};

// --- 4. VENDOR SELECTOR ---
export const VendorSelectionView = ({ city, setVendor, setCurrentView, vendorLogos, vendorsByLocation }) => {
    const vendors = (vendorsByLocation && vendorsByLocation[city]) ? vendorsByLocation[city] : (VENDORS_BY_LOCATION[city] || []);

    return (
        <ViewContainer title={`${city} Vendors`} showBack onBack={() => setCurrentView('location')}>
            <div className="grid grid-cols-1 gap-3 mt-2">
                {vendors.map((vendor) => (
                    <button key={vendor} onClick={() => { setVendor(vendor); setCurrentView('market'); }} className="group p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-1">
                                {vendorLogos && vendorLogos[vendor] ? (
                                    <img src={vendorLogos[vendor]} alt={vendor} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <Store className="w-6 h-6 text-orange-400" />
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white font-[Fredoka]">{vendor}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">View Menu</p>
                            </div>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-orange-500 rotate-180 transition-colors" />
                    </button>
                ))}
                {vendors.length === 0 && <p className="text-center text-gray-400 mt-10">No vendors found in this area yet.</p>}
            </div>
        </ViewContainer>
    );
};

// --- 5. MARKET VIEW ---
export const MarketView = ({ setCurrentView, addToCart, marketData, loadingData, city, vendor, user }) => {
    const [category, setCategory] = useState('All');
    
    const handleNotify = async (item) => {
        if (!user) return alert("Please login first.");
        try {
            const success = await saveStockRequest(item, user.uid, user.email);
            if (success) alert(`🔔 Alert set for ${item.name}! We'll notify you when back.`);
        } catch(e) { console.error(e); }
    };

    if (loadingData && marketData.length === 0) return <div className="flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    
    const items = marketData.filter(p => {
        const productVendor = p.vendor ? p.vendor.toLowerCase() : "";
        const selectedVendor = vendor ? vendor.toLowerCase() : "";
        const vendorMatch = productVendor.includes(selectedVendor) || selectedVendor.includes(productVendor);
        const categoryMatch = category === 'All' ? true : p.category === category;
        if (vendorMatch) return categoryMatch;
        const locationMatch = !p.location || (p.location && city && p.location.toLowerCase() === city.toLowerCase());
        return locationMatch && vendorMatch && categoryMatch;
    });

    const categories = [{ id: 'All', label: 'All', icon: null }, { id: 'fullMeal', label: 'Meals', icon: ShoppingBag }, { id: 'cravings', label: 'Cravings', icon: Heart }, { id: 'pregnancy', label: 'Pregnancy', icon: Baby }, { id: 'fitness', label: 'Fitness', icon: Dumbbell }, { id: 'male', label: 'Male', icon: Flame }];
    
    return (
        <ViewContainer title={`${vendor} Menu`} showBack onBack={() => setCurrentView('vendors')}>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">{categories.map(cat => (<DietaryFilter key={cat.id} icon={cat.icon} label={cat.label} active={category === cat.id} onClick={() => setCategory(cat.id)} />))}</div>
            
            <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide min-h-0">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Box className="w-16 h-16 mb-4 opacity-20" />
                        <p>No items found.</p>
                        <button onClick={() => setCategory('All')} className="mt-4 text-xs bg-gray-200 dark:bg-gray-800 px-4 py-2 rounded-full font-bold">Clear Filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 pb-4">{items.map((item) => (
                        <ProductCard 
                            key={item.id} 
                            item={item} 
                            addToCart={addToCart} 
                            isAdmin={false} 
                            onNotify={handleNotify} 
                        />
                    ))}</div>
                )}
            </div>
        </ViewContainer>
    );
};

// --- 6. ORDERS VIEW ---
export const OrdersView = ({ setCurrentView, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  useEffect(() => { 
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);
  
  // 🟢 NEW: HANDLE RATING
  const handleRateProduct = async (productId, rating, comment, orderId) => {
      if(!user) return;
      // Dynamically import addReview to avoid circular dependency issues if any
      const { addReview } = await import('../firebase.js');
      await addReview(productId, user.uid, user.displayName, rating, comment, orderId);
  };

  return (
    <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onRate={handleRateProduct} />}
      {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div> : orders.length === 0 ? <div className="text-center mt-10 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No orders yet.</p></div> : <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-3">{orders.map(order => (<div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95 transition-transform hover:border-orange-200"><div className="flex justify-between mb-2"><span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${order.status==='pending'?'bg-yellow-100 text-yellow-700': order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{order.status.replace('_', ' ')}</span><span className="text-xs text-gray-400 font-mono">#{order.id.slice(0,6)}</span></div><div className="flex justify-between items-end"><div><p className="font-bold dark:text-white text-sm">{order.items.length} Items</p><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-black text-orange-500 text-lg">₦{order.total.toLocaleString()}</p><p className="text-[10px] text-gray-400 font-medium">Tap for details</p></div></div></div>))}</div>}
    </ViewContainer>
  );
};

// --- 7. WALLET VIEW ---
export const WalletView = ({ setCurrentView, user, setGlobalWallet }) => {
  const [wallet, setWallet] = useState(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { 
      try {
          const saved = localStorage.getItem(`eatai_wallet_${user.uid}`); 
          if (saved) { 
              const parsed = JSON.parse(saved); 
              setWallet(parsed); 
              setGlobalWallet(parsed); 
          } 
      } catch (e) { console.error("Wallet load error:", e); }
  }, [user]);

  const createWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await new Promise(resolve => setTimeout(resolve, 100)); // UI Breath
        const w = ethers.Wallet.createRandom();
        const wd = { address: w.address, privateKey: w.privateKey, mnemonic: w.mnemonic?.phrase };
        localStorage.setItem(`eatai_wallet_${user.uid}`, JSON.stringify(wd));
        await saveWalletToProfile(user.uid, w.address); 
        setWallet(wd); 
        setGlobalWallet(wd);
    } catch(e) { 
        console.error(e); 
        setError("Could not create wallet. Try again.");
    } finally {
        setIsLoading(false);
    }
  };
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert("Copied!"); };

  return (
    <ViewContainer title="Crypto Kitchen" showBack onBack={() => setCurrentView('home')}>
      <div className="flex flex-col items-center justify-center space-y-6 mt-10">
        {!wallet ? (
          <>
             <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center"><Wallet className="w-12 h-12 text-indigo-600" /></div>
             <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs font-medium">Generate a secure wallet linked to {user.displayName}</p>
             {error && <p className="text-red-500 text-sm">{error}</p>}
             <button onClick={createWallet} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">{isLoading ? <Sparkles className="animate-spin" /> : <Plus />} Generate Wallet</button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl">
                <p className="text-xs opacity-70 mb-1">Your Address (Tap to Copy)</p>
                <code onClick={() => copyToClipboard(wallet.address)} className="text-sm break-all cursor-pointer hover:underline">{wallet.address}</code>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Private Key (Keep Safe!)</label>
                <div className="relative">
                    <div className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs break-all text-gray-700 dark:text-gray-300 ${!showPrivate?'blur-sm':''}`}>{wallet.privateKey}</div>
                    <button onClick={()=>setShowPrivate(!showPrivate)} className="absolute top-2 right-2 text-gray-500 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-xl border border-yellow-100 dark:border-yellow-800">
                ⚠️ <b>Warning:</b> This wallet is stored locally. If you clear your browser cache, it will be lost unless you save your Private Key.
            </div>
          </div>
        )}
      </div>
    </ViewContainer>
  );
};

export const DeciderView = ({ ingredients, setIngredients, generateRecipes, isThinking, aiRecipe, setCurrentView, activeFilters, toggleFilter }) => (
    <ViewContainer title="AI Fridge Raider" showBack onBack={() => setCurrentView('home')}>
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <div className="bg-orange-50 dark:bg-gray-800 p-6 rounded-3xl mb-6 border border-orange-100 dark:border-gray-700 transition-colors">
          <div className="flex flex-wrap gap-2 mb-4"><DietaryFilter icon={Leaf} label="Vegan" active={activeFilters.includes('Vegan')} onClick={() => toggleFilter('Vegan')} /><DietaryFilter icon={Beef} label="High Protein" active={activeFilters.includes('High Protein')} onClick={() => toggleFilter('High Protein')} /><DietaryFilter icon={Zap} label="Keto" active={activeFilters.includes('Keto')} onClick={() => toggleFilter('Keto')} /><DietaryFilter icon={Cookie} label="Low Carb" active={activeFilters.includes('Low Carb')} onClick={() => toggleFilter('Low Carb')} /></div>
          <label className="block text-orange-800 dark:text-orange-300 font-semibold mb-3">What's in your kitchen?</label>
          <textarea autoFocus value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="e.g., 2 eggs, stale bread, milk..." className="w-full p-4 rounded-xl border-2 border-orange-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 bg-white dark:bg-gray-700 dark:text-white h-32 resize-none transition-all placeholder-gray-400" />
          <button onClick={generateRecipes} disabled={isThinking || !ingredients.trim()} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">{isThinking ? <><Sparkles className="w-5 h-5 animate-spin" /><span>Thinking...</span></> : <><Sparkles className="w-5 h-5" /><span>Invent Recipe</span></>}</button>
        </div>
        {aiRecipe && <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 animate-slide-up whitespace-pre-wrap"><h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">Chef EatAi Suggests:</h3><div className="text-gray-700 dark:text-gray-300 leading-loose font-medium whitespace-pre-line">{aiRecipe}</div></div>}
      </div>
    </ViewContainer>
);

// --- 9. PREMIUM CHECKOUT ---
export const PaymentModal = ({ isOpen, onClose, total, paymentMethod: initialMethod, user, cart, globalWallet, onSuccess, city }) => {
  if (!isOpen) return null;
  const [processing, setProcessing] = useState(false);
  const [activeMethod, setActiveMethod] = useState(initialMethod || 'paystack');
  const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryArea: '' });
  
  // GPS
  const handleUseGPS = () => {
      if (!navigator.geolocation) return alert("Geolocation not supported");
      navigator.geolocation.getCurrentPosition(
          (pos) => { alert("Location Found! (Backend logic needed)"); },
          () => alert("Location permission denied.")
      );
  };

  useEffect(() => {
    if(user && isOpen) {
       getUserProfile(user.uid).then(data => {
           if(data) setForm(prev => ({...prev, address: data.address || '', phone: data.phone || '', landmark: data.landmark || ''}));
       });
    }
  }, [user, isOpen]);

  const deliveryFee = calculateDeliveryFee(city, form.deliveryArea);
  const grandTotal = total + deliveryFee;
  const paystackConfig = { reference: (new Date()).getTime().toString(), email: user.email, amount: grandTotal * 100, publicKey: PAYSTACK_KEY };
  const handlePaystackSuccess = (reference) => { handlePayment("paystack"); };

  const handlePayment = async (method = activeMethod) => {
    if (!form.address || !form.phone || !form.deliveryArea) return alert("Please select a Delivery Area and enter address.");
    
    setProcessing(true);
    if (method !== 'paystack') await new Promise(r => setTimeout(r, 1500));
    try {
        await createOrder(user.uid, cart, grandTotal, method, globalWallet?.address, form.address, "Paystack Online", form.phone, form.landmark, deliveryFee, method === 'paystack' ? 'confirmed' : 'pending');
        await saveUserProfile(user.uid, { address: form.address, phone: form.phone, landmark: form.landmark });
        setProcessing(false); onSuccess();
    } catch (e) { setProcessing(false); alert("Error placing order: " + e.message); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-0 md:p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-0 md:rounded-3xl shadow-2xl relative max-h-[95vh] h-[90vh] md:h-auto overflow-hidden flex flex-col rounded-t-3xl border border-gray-100 dark:border-gray-800">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Checkout</h3>
                <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Delivery Details
                    </h4>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl space-y-3 border border-gray-100 dark:border-gray-800">
                        <div className="relative">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[11px] font-bold text-gray-500 uppercase">Area</label>
                                <button onClick={handleUseGPS} className="text-[11px] text-orange-500 font-bold flex items-center gap-1 hover:text-orange-600"><Navigation className="w-3 h-3"/> Use GPS</button>
                            </div>
                            <select 
                                className="w-full bg-white dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                                value={form.deliveryArea} 
                                onChange={e => setForm({...form, deliveryArea: e.target.value})}
                            >
                                <option value="">Select Area...</option>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            {form.deliveryArea && <p className="text-xs text-green-600 mt-1.5 font-medium flex items-center gap-1"><Plus className="w-3 h-3"/> Delivery Fee: ₦{deliveryFee.toLocaleString()}</p>}
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Street Address</label>
                            <input className="w-full p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none placeholder-gray-400" placeholder="e.g. 12 Mission Road" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Phone</label>
                                <input type="tel" className="w-full p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="080..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Landmark</label>
                                <input className="w-full p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Optional" value={form.landmark} onChange={e => setForm({...form, landmark: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Payment Method
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveMethod('paystack')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative ${activeMethod === 'paystack' ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-400 shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 hover:border-gray-200'}`}>
                            <CreditCard className={`w-6 h-6 ${activeMethod === 'paystack' ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className="font-bold text-xs">Paystack</span>
                        </button>
                        <button onClick={() => setActiveMethod('crypto')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative ${activeMethod === 'crypto' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 hover:border-gray-200'}`}>
                            <Wallet className={`w-6 h-6 ${activeMethod === 'crypto' ? 'text-indigo-500' : 'text-gray-300'}`} />
                            <span className="font-bold text-xs">Crypto</span>
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-2"><span className="text-gray-500 text-sm">Subtotal</span><span className="font-bold text-gray-900 dark:text-white">₦{total.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center mb-4"><span className="text-gray-500 text-sm">Delivery Fee</span><span className="font-bold text-gray-900 dark:text-white">₦{deliveryFee.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                        <span className="font-bold text-orange-800 dark:text-orange-200 uppercase text-xs tracking-wider">Total Amount</span>
                        <span className="text-2xl font-black text-orange-600 dark:text-orange-400">₦{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-10 pb-8 md:pb-6">
                {activeMethod === 'paystack' ? ( 
                    form.address && form.phone && form.deliveryArea ? 
                    <PaystackButton {...paystackConfig} text={`Pay ₦${grandTotal.toLocaleString()}`} onSuccess={handlePaystackSuccess} onClose={() => alert("Payment Cancelled")} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 text-lg" /> 
                    : <button disabled className="w-full bg-gray-200 dark:bg-gray-800 text-gray-400 font-bold py-4 rounded-2xl cursor-not-allowed">Complete Delivery Details</button>
                ) : (
                    <button onClick={() => handlePayment('crypto')} disabled={processing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-lg">{processing ? 'Processing...' : `Transfer ₦${grandTotal.toLocaleString()}`}</button>
                )}
            </div>
        </div>
    </div>
  );
};

export const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city }) => {
  const [showModal, setShowModal] = useState(false);
  return (
  <>
  <PaymentModal isOpen={showModal} onClose={() => setShowModal(false)} total={cartTotal} paymentMethod="paystack" user={user} cart={cart} globalWallet={globalWallet} onSuccess={() => {setShowModal(false); setCart([]); setCurrentView('orders'); alert("Order Placed!");}} city={city} />
  <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
    <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setCurrentView(marketSection ? 'market' : 'home')} />
    <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 ease-out transform ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10"><h2 className="text-2xl font-black dark:text-white tracking-tight">Your Cart</h2><button onClick={() => setCurrentView('home')} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button></div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2"><ShoppingCart className="w-12 h-12 opacity-20"/><p className="font-medium">Your cart is empty</p></div> : 
         cart.map(item => <div key={item.cartId} className="flex gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-transparent hover:border-orange-200 dark:hover:border-orange-900 transition-all"><div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-2xl">{item.image}</span>}</div><div className="flex-1 min-w-0"><p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p><p className="text-xs text-gray-500 mb-2">{item.vendor}</p><div className="flex items-center justify-between"><p className="font-black text-orange-600 dark:text-orange-400">₦{item.price.toLocaleString()}</p></div></div><button onClick={() => removeFromCart(item.cartId)} className="h-8 w-8 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm text-red-500 hover:bg-red-50 transition-colors border border-gray-100 dark:border-gray-600"><Trash2 className="w-4 h-4" /></button></div>)}
      </div>
      <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 pb-8">
        <div className="flex justify-between items-end mb-4"><span className="text-gray-500 font-bold text-sm">Subtotal</span><span className="text-3xl font-black dark:text-white tracking-tight">₦{cartTotal.toLocaleString()}</span></div>
        <button onClick={() => setShowModal(true)} disabled={cart.length === 0} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">Proceed to Checkout <ArrowLeft className="w-5 h-5 rotate-180" /></button>
      </div>
    </div>
  </div>
  </>
  );
};