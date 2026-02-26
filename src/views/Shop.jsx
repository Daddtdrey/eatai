import React, { useState, useEffect } from 'react';
import {
    ChefHat, ShoppingBag, Package, Store, ArrowLeft, LogIn,
    ShoppingCart, CreditCard, Wallet, MapPin, Leaf, Beef, Zap, Cookie,
    X, Minus, Sparkles, Box, Bell, Heart, Flame, Baby, Dumbbell, Plus, Eye,
    Mail, Lock, User, Search, Home, Navigation, ChevronDown, Percent, Trash2, BellRing, CheckCircle, Clock, Edit2
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { ethers } from 'ethers';

// 🟢 IMPORTS
import { ViewContainer, DietaryFilter, ProductCard, OrderDetailModal, Toast } from '../components/UI.jsx';
import { ProductDetailModal } from '../components/ProductDetailModal.jsx';
import {
    signInWithGoogle, createOrder, getUserOrders, saveUserProfile, getUserProfile,
    db, collection, onSnapshot, query, where, saveWalletToProfile, requestNotificationPermission,
    signUpWithEmail, logInWithEmail, saveStockRequest
} from '../firebase.js';
import { LOCATIONS, VENDORS_BY_LOCATION, PAYSTACK_KEY, BANK_DETAILS, calculateDeliveryFee, GEMINI_API_KEY, DELIVERY_ZONES } from '../config.js';

// ==========================================
// 1. 🟢 REDESIGNED LOGIN VIEW (Full Screen + Background)
// ==========================================
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
        } catch (err) {
            console.error(err);
            setError("Authentication failed. Please check your credentials.");
        }
        finally { setLoading(false); }
    };

    return (
        // 🟢 FULL SCREEN BACKGROUND CONTAINER
        <div className="fixed inset-0 min-h-screen w-full bg-cover bg-center flex items-center justify-center z-50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop')" }}>

            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-sm p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl animate-fade-in mx-4">

                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                        <ChefHat className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight font-[Fredoka]">EatAi</h1>
                    <p className="text-gray-300 text-sm font-medium">Smart Food Delivery</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Full Name" className="w-full pl-10 p-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input type="email" placeholder="Email" className="w-full pl-10 p-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input type="password" placeholder="Password" className="w-full pl-10 p-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

                    <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-70">
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/20"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-3  text-gray-400 font-medium bg-black/40 rounded">Or</span></div>
                </div>

                <button onClick={signInWithGoogle} className="w-full bg-white text-gray-900 border border-gray-200 font-bold py-3.5 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <LogIn className="w-5 h-5" /> Continue with Google
                </button>

                <p className="mt-6 text-sm text-gray-300 text-center font-medium">
                    {isSignUp ? "Already have an account?" : "New to EatAi?"}
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-orange-400 font-bold hover:text-orange-300 underline">
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </div>
        </div>
    );
};

// --- 2. HOME VIEW (HUNGRY ORANGE THEME) ---
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

    // Mock Data for Top Vendors
    const allTopVendors = [
        { name: 'Big taste', img: 'https://res.cloudinary.com/dmsq7n9k6/image/upload/v1768247815/ve99pcvok1pzrzdrfll4.jpg', tags: 'Rice • Pasta' },
        { name: 'DannyCook', img: 'https://res.cloudinary.com/dmsq7n9k6/image/upload/v1768584381/emfhjczjmg2pfhxwqem2.jpg', tags: 'Grill • Chicken' },
        { name: 'Phattie ChopBox', img: 'https://res.cloudinary.com/dmsq7n9k6/image/upload/v1765371009/nwz7xt7g5cuuallmrpt0.jpg', tags: 'Snacks' },
        { name: 'Yummy You', img: 'https://res.cloudinary.com/dmsq7n9k6/image/upload/v1768288363/eiic6wvc1qdhbnpgcqst.jpg', tags: 'Snacks' }
    ];

    const filteredVendors = allTopVendors.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="flex flex-col h-full animate-fade-in pb-32 bg-gray-50 dark:bg-gray-950 overflow-y-auto">

            {/* HEADER */}
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

                {/* SEARCH BAR */}
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

                {/* HERO BANNER */}
                <div className="relative w-full h-60 bg-gradient-to-r from-orange-500 to-red-600 rounded-[2.5rem] overflow-hidden shadow-xl shadow-orange-500/30 flex items-center group cursor-pointer transition-transform active:scale-[0.99]" onClick={() => setCurrentView('location')}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                    <div className="relative z-10 pl-8 w-1/2 flex flex-col justify-center h-full">
                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full mb-3 inline-block w-fit tracking-wide border border-white/10">FAST DELIVERY ⚡</span>
                        <h2 className="text-4xl font-black text-white leading-none mb-3 font-[Fredoka] drop-shadow-md">Hungry?<br /><span className="text-orange-100 text-3xl">Eat Now.</span></h2>
                        <span className="text-white/90 text-xs font-bold flex items-center gap-2 group-hover:text-orange-100 transition-colors">Order Food <div className="bg-white text-orange-600 rounded-full p-1 shadow-sm"><ArrowLeft className="w-3 h-3 rotate-180" /></div></span>
                    </div>

                    {/* BIG FOOD IMAGES */}
                    <img src="https://res.cloudinary.com/dmsq7n9k6/image/upload/v1767032932/Nigerian_Jollof_rice__fried_plantains_and_chicken_-removebg-preview_jthyvl.png" className="absolute -right-10 -bottom-8 w-64 h-64 object-contain drop-shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 z-20" alt="Burger" />
                    <img src="https://res.cloudinary.com/dmsq7n9k6/image/upload/v1767041008/These_Bold_Burger_Bowls_are_the_ultimate_low-carb_-removebg-preview_kjodwx.png" className="absolute right-36 top-6 w-24 h-24 object-contain opacity-90 rotate-12 z-10 blur-[1px]" alt="Pizza" />
                </div>

                {/* TOP VENDORS */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg font-[Fredoka]">Top Vendors</h3>
                        {!searchQuery && <span onClick={() => setCurrentView('vendors')} className="text-orange-500 text-xs font-bold cursor-pointer hover:underline">See all</span>}
                    </div>

                    <div className={`flex ${searchQuery ? 'flex-col gap-3' : 'gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-5 px-5'}`}>
                        {filteredVendors.map((vendor, i) => (
                            <div key={i} onClick={() => setCurrentView('vendors')} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer group ${searchQuery ? 'flex flex-row items-center p-2 gap-3' : 'min-w-[200px] flex-col'}`}>
                                <div className={`${searchQuery ? 'w-16 h-16 rounded-xl' : 'h-28 w-full'} bg-gray-200 dark:bg-gray-800 relative overflow-hidden`}>
                                    <img src={vendor.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={vendor.name} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.backgroundColor = '#eee' }} />
                                </div>
                                <div className="p-3">
                                    <h4 className="font-black text-gray-800 dark:text-white text-sm font-[Fredoka]">{vendor.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{vendor.tags}</p>
                                </div>
                            </div>
                        ))}
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
                                <div className="text-2xl mb-1">{['🍚', '🍲', '🍩', '🥤', '🍗'][i]}</div>
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
            </div>
        </ViewContainer>
    );
};

// 🟢 UPDATED: Market Product Card with Modal Support
const MarketProductCard = ({ item, onInteract, isOpen, onNotify }) => {
    const [showModal, setShowModal] = useState(false);
    const [imgError, setImgError] = useState(false);

    const stock = item.stock || 0;
    const isSoldOut = stock === 0;
    const isLowStock = stock > 0 && stock < 10;

    const handleOpenModal = () => {
        if (!isOpen) {
            alert("Vendor is currently closed.");
            return;
        }
        setShowModal(true);
    };

    const handleAddToCart = (product, sideName, sidePrice) => {
        onInteract(product, sideName, sidePrice);
    };

    return (
        <>
            {/* Simplified Product Card - No inline quantity/sides selectors */}
            <div className={`relative bg-white dark:bg-gray-900 rounded-3xl border-2 border-orange-50/50 dark:border-gray-800 p-3 flex gap-4 transition-all active:scale-[0.99] shadow-sm hover:shadow-md cursor-pointer group ${isSoldOut ? 'opacity-75' : ''}`} onClick={handleOpenModal}>
                <div className="w-28 h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shrink-0 relative shadow-inner">
                    {item.imageUrl && !imgError ? (
                        <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isSoldOut ? 'grayscale' : ''}`} onError={() => setImgError(true)} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-4xl"><span>{item.image || '🥘'}</span></div>
                    )}
                    {isSoldOut && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-[10px] font-black uppercase bg-red-500 px-2 py-1 rounded-lg transform -rotate-12">Sold Out</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    <div>
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight line-clamp-2 font-[Fredoka]">{item.name}</h4>
                            {isSoldOut && (
                                <button onClick={(e) => { e.stopPropagation(); onNotify(item); }} className="p-2 bg-orange-100 dark:bg-gray-800 rounded-xl text-orange-600 hover:bg-orange-200 active:scale-90 transition-all">
                                    <BellRing className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.desc || "Fresh & tasty."}</p>
                        {isLowStock && !isSoldOut && (
                            <span className="text-[10px] text-orange-600 font-bold mt-1 block animate-pulse">🔥 Only {stock} left!</span>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <span className="font-black text-gray-900 dark:text-white text-xl">₦{item.price.toLocaleString()}</span>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(); }}
                            disabled={isSoldOut}
                            className={`h-10 px-5 rounded-2xl font-bold text-xs flex items-center gap-1 transition-all shadow-lg ${isSoldOut
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30 active:scale-90'
                                }`}
                        >
                            {isSoldOut ? "Closed" : "View"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Detail Modal */}
            <ProductDetailModal
                isOpen={showModal}
                product={item}
                onClose={() => setShowModal(false)}
                onAddToCart={handleAddToCart}
                isVendorOpen={isOpen}
            />
        </>
    );
};



// --- 5. MARKET VIEW (WITH OPENING HOURS CHECK) ---
export const MarketView = ({ setCurrentView, addToCart, marketData, loadingData, city, vendor, user, vendorMetadata, onLoadMore, hasMore, isLoadingMore }) => {
    const [category, setCategory] = useState('All');
    // 🟢 CHECK HOURS
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = currentHour + (currentMinute / 60);

    const vendorInfo = vendorMetadata?.[vendor] || {};
    const openTime = parseFloat(vendorInfo.openTime?.replace(':', '.') || "8.00");
    const closeTime = parseFloat(vendorInfo.closeTime?.replace(':', '.') || "22.00");

    const isOpen = currentTime >= openTime && currentTime < closeTime;

    const handleNotify = async (item) => {
        if (!user) return alert("Please login first.");
        try {
            const success = await saveStockRequest(item, user.uid, user.email);
            if (success) alert(`🔔 Alert set for ${item.name}!`);
        } catch (e) { console.error(e); }
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

    const categories = [{ id: 'All', label: 'All', icon: null }, { id: 'fullMeal', label: 'Meals', icon: ShoppingBag }, { id: 'cravings', label: 'Cravings', icon: Heart }, { id: 'pregnancy', label: 'Pregnancy', icon: Baby }];

    return (
        <ViewContainer title={`${vendor} Menu`} showBack onBack={() => setCurrentView('vendors')}>
            {/* 🟢 CLOSED BANNER */}
            {!isOpen && (
                <div className="bg-red-500 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold text-sm">Closed (Opens {vendorInfo.openTime || "8:00"})</span>
                    </div>
                </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">{categories.map(cat => (<DietaryFilter key={cat.id} icon={cat.icon} label={cat.label} active={category === cat.id} onClick={() => setCategory(cat.id)} />))}</div>

            <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide min-h-0">
                <div className="grid grid-cols-1 gap-4 pb-4">{items.map((item) => (
                    <MarketProductCard
                        key={item.id}
                        item={item}
                        onInteract={isOpen ? addToCart : () => alert("Vendor is currently closed.")}
                        isOpen={isOpen}
                        onNotify={handleNotify}
                    />
                ))}
                    {hasMore && (
                        <button onClick={onLoadMore} disabled={isLoadingMore} className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-xl mt-4 active:scale-95">
                            {isLoadingMore ? "Loading..." : "Load More Food 🍲"}
                        </button>
                    )}
                </div>
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

    const handleRateProduct = async (productId, rating, comment, orderId) => {
        if (!user) return;
        try {
            const { addReview } = await import('../firebase.js');
            await addReview(productId, user.uid, user.displayName, rating, comment, orderId);
        } catch (e) { console.error(e); }
    };

    return (
        <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onRate={handleRateProduct} />}
            {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div> : orders.length === 0 ? <div className="text-center mt-10 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No orders yet.</p></div> : <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-3">{orders.map(order => (<div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-95 transition-transform hover:border-orange-200"><div className="flex justify-between mb-2"><span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{order.status.replace('_', ' ')}</span><span className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 6)}</span></div><div className="flex justify-between items-end"><div><p className="font-bold dark:text-white text-sm">{order.items.length} Items</p><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-black text-orange-500 text-lg">₦{order.total.toLocaleString()}</p><p className="text-[10px] text-gray-400 font-medium">Tap for details</p></div></div></div>))}</div>}
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
        } catch (e) {
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
                                <div className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs break-all text-gray-700 dark:text-gray-300 ${!showPrivate ? 'blur-sm' : ''}`}>{wallet.privateKey}</div>
                                <button onClick={() => setShowPrivate(!showPrivate)} className="absolute top-2 right-2 text-gray-500 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
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

// --- 9. CHECKOUT MODALS (WITH PICKUP & ZONES) ---
export const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess, city }) => {
    if (!isOpen) return null;
    const [processing, setProcessing] = useState(false);
    const [orderType, setOrderType] = useState('delivery');
    const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryAreaName: '' });
    const [activeMethod, setActiveMethod] = useState(paymentMethod || 'paystack');

    // 🟢 NEW: Get Zones for Current City
    const availableZones = DELIVERY_ZONES[city] || [];

    // GPS
    const handleUseGPS = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");
        navigator.geolocation.getCurrentPosition(
            (pos) => { alert("Location Found! (Backend logic needed)"); },
            () => alert("Location permission denied.")
        );
    };

    useEffect(() => {
        if (user && isOpen) {
            getUserProfile(user.uid).then(data => {
                if (data) setForm(prev => ({ ...prev, address: data.address || '', phone: data.phone || '', landmark: data.landmark || '' }));
            });
        }
    }, [user, isOpen]);

    // 🟢 NEW: Use zone name to get price
    const deliveryFee = orderType === 'pickup' ? 0 : calculateDeliveryFee(city, form.deliveryAreaName);
    const grandTotal = total + deliveryFee;

    // 🟢 Pre-generate a unique Order ID that links Paystack payment → Firestore order
    const [orderId] = useState(() => `eatai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // Initialize Paystack hook WITH the orderId as reference
    const initializePayment = usePaystackPayment({
        reference: orderId,
        email: user?.email,
        amount: grandTotal * 100,
        publicKey: PAYSTACK_KEY,
    });

    const handlePayment = async (method = activeMethod) => {
        if (orderType === 'delivery' && (!form.address || !form.phone || !form.deliveryAreaName)) return alert("Please select a Delivery Area and enter address.");

        setProcessing(true);
        try {
            if (method === 'paystack') {
                // 1. Create Order as PENDING first, using same orderId as Paystack reference
                await createOrder(
                    user.uid, cart, grandTotal, method,
                    globalWallet?.address, form.address, "Paystack Online",
                    form.phone, form.landmark, deliveryFee,
                    'pending', orderType, '', orderId
                );

                await saveUserProfile(user.uid, { address: form.address, phone: form.phone, landmark: form.landmark });

                // 2. Open Paystack popup — webhook handles the confirmation server-side
                //    Close checkout immediately so user isn't stuck on "Processing"
                setProcessing(false);

                initializePayment(
                    (response) => { console.log("✅ Paystack payment complete:", response); },
                    () => { console.log("Paystack popup closed by user"); }
                );

                // 3. Dismiss the checkout modal & clear cart right away
                onSuccess();
            } else {
                // Crypto / Other Flow
                await new Promise(r => setTimeout(r, 1500));
                await createOrder(user.uid, cart, grandTotal, method, globalWallet?.address, form.address, "Paystack Online", form.phone, form.landmark, deliveryFee, 'pending', orderType);
                await saveUserProfile(user.uid, { address: form.address, phone: form.phone, landmark: form.landmark });
                setProcessing(false);
                onSuccess();
            }
        } catch (e) {
            setProcessing(false);
            alert("Error placing order: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-6 rounded-t-3xl md:rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
                <h3 className="text-xl font-bold text-center mb-4 dark:text-white">Complete Order</h3>

                {/* TOGGLE: Delivery / Pickup */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
                    <button onClick={() => setOrderType('delivery')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === 'delivery' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Delivery</button>
                    <button onClick={() => setOrderType('pickup')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${orderType === 'pickup' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Pickup</button>
                </div>

                <div className="space-y-3">
                    {orderType === 'delivery' && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-gray-500">Delivery Zone</label>
                                    <button onClick={handleUseGPS} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Navigation className="w-3 h-3" /> Use GPS</button>
                                </div>
                                {/* 🟢 NEW: ZONE DROPDOWN */}
                                <select
                                    className="w-full bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 dark:text-white mt-1"
                                    value={form.deliveryAreaName}
                                    onChange={e => setForm({ ...form, deliveryAreaName: e.target.value })}
                                >
                                    <option value="">Select Area...</option>
                                    {availableZones.map((zone, i) => <option key={i} value={zone.name}>{zone.name} - ₦{zone.price}</option>)}
                                </select>
                                {form.deliveryAreaName && <p className="text-xs text-orange-500 mt-1">Fee: ₦{deliveryFee}</p>}
                            </div>
                            <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Street" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                        </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                        <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-gray-500">Phone</label><input type="tel" className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="080..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                    </div>
                </div>

                {/* 🟢 ORDER SUMMARY (ITEMS LIST WITH ADDONS) */}
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Order Summary</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                        {cart.map((item, i) => {
                            const addonsTotal = item.selectedAddons ? item.selectedAddons.reduce((s, a) => s + (a.price || 0), 0) : 0;
                            return (
                                <div key={i} className="flex justify-between items-start text-sm border-b border-gray-200 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg overflow-hidden">
                                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : item.image}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white text-xs">{item.name}</p>
                                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                <p className="text-[10px] text-orange-500 font-bold">+ {item.selectedAddons.map(a => `${a.name} (₦${a.price})`).join(', ')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-bold text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">₦{(item.price + addonsTotal).toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700"><div className="text-sm text-gray-500">Total:</div><div className="text-2xl font-black text-green-600">₦{grandTotal.toLocaleString()}</div></div>

                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl flex gap-1">
                    <button onClick={() => setActiveMethod('paystack')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${activeMethod === 'paystack' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-white' : 'text-gray-400'}`}>
                        <div className="flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" /> Paystack</div>
                    </button>
                    <button onClick={() => setActiveMethod('crypto')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${activeMethod === 'crypto' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400'}`}>
                        <div className="flex items-center justify-center gap-2"><Wallet className="w-4 h-4" /> Crypto</div>
                    </button>
                </div>

                {activeMethod === 'paystack' ? (
                    (orderType === 'delivery' && (!form.address || !form.deliveryAreaName)) ?
                        <button disabled className="w-full mt-4 bg-gray-300 dark:bg-gray-700 text-white font-bold py-4 rounded-xl cursor-not-allowed">Enter Delivery Details</button> :
                        <button onClick={() => handlePayment('paystack')} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Pay Now'}</button>
                ) : (<button onClick={() => handlePayment('crypto')} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Confirm Crypto Transfer'}</button>)}
            </div>
        </div>
    );
};

export const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city }) => {
    const [paymentMethod, setPaymentMethod] = useState('paystack');
    const [showModal, setShowModal] = useState(false);
    return (
        <>
            <PaymentModal isOpen={showModal} onClose={() => setShowModal(false)} total={cartTotal} paymentMethod={paymentMethod} user={user} cart={cart} globalWallet={globalWallet} onSuccess={() => { setShowModal(false); setCart([]); setCurrentView('orders'); alert("Order Placed!"); }} city={city} />
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setCurrentView(marketSection ? 'market' : 'home')} />
                <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 transform ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center"><h2 className="text-2xl font-bold dark:text-white">Cart</h2><button onClick={() => setCurrentView('home')}><X className="w-6 h-6" /></button></div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? <div className="text-center text-gray-400 mt-10"><ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>Empty</p></div> :
                            cart.map(item => <div key={item.cartId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl"><div className="flex gap-3"><span className="text-2xl">{item.imageUrl ? <img src={item.imageUrl} className="w-12 h-12 object-cover rounded-lg" /> : item.image}</span><div><p className="font-bold text-sm dark:text-white">{item.name}</p>{item.selectedAddons && item.selectedAddons.length > 0 && <p className="text-[10px] text-orange-500 font-bold">+ {item.selectedAddons.map(a => a.name).join(', ')}</p>}<p className="text-xs text-gray-500">₦{(item.price + (item.selectedAddons ? item.selectedAddons.reduce((s, a) => s + (a.price || 0), 0) : 0)).toLocaleString()}</p></div></div><button onClick={() => removeFromCart(item.cartId)} className="text-red-500"><Minus className="w-4 h-4" /></button></div>)}
                    </div>
                    <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-4">
                        {cart.length > 0 && (
                            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
                                <button onClick={() => setPaymentMethod('paystack')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'paystack' ? 'bg-white shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}><CreditCard className="w-4 h-4" /> Paystack</button>
                                <button onClick={() => setPaymentMethod('crypto')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'crypto' ? 'bg-indigo-500 text-white shadow' : 'text-gray-500'}`}><Wallet className="w-4 h-4" /> Crypto</button>
                            </div>
                        )}
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-2xl font-black dark:text-white">₦{cartTotal.toLocaleString()}</span></div>
                        <button onClick={() => setShowModal(true)} disabled={cart.length === 0} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">Checkout</button>
                    </div>
                </div>
            </div>
        </>
    );
};