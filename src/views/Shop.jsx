import React, { useState, useEffect } from 'react';
import { 
  ChefHat, ShoppingBag, Package, Store, ArrowLeft, LogIn, 
  ShoppingCart, CreditCard, Wallet, MapPin, Leaf, Beef, Zap, Cookie, 
  X, Minus, Sparkles, Box, Bell, Heart, Flame, Baby, Dumbbell, Plus, Eye,
  Mail, Lock, User
} from 'lucide-react';
import { PaystackButton } from 'react-paystack';
import { ethers } from 'ethers';

// 🟢 IMPORTS: Explicit file extensions to prevent build errors
import { ViewContainer, DietaryFilter, ProductCard, OrderDetailModal, Toast } from '../components/UI.jsx';
import { 
    signInWithGoogle, createOrder, getUserOrders, saveUserProfile, getUserProfile, 
    db, collection, onSnapshot, query, where, saveWalletToProfile, requestNotificationPermission,
    signUpWithEmail, logInWithEmail
} from '../firebase.js';
import { LOCATIONS, VENDORS_BY_LOCATION, PAYSTACK_KEY, calculateDeliveryFee, GEMINI_API_KEY } from '../config.js';

// --- 1. LOGIN VIEW (Google + Email/Password) ---
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
            if (isSignUp) {
                await signUpWithEmail(email, password, name);
            } else {
                await logInWithEmail(email, password);
            }
        } catch (err) {
            console.error(err);
            let msg = "Something went wrong.";
            if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
            if (err.code === 'auth/user-not-found') msg = "User not found.";
            if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
            if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
            if (err.code === 'auth/weak-password') msg = "Password should be at least 6 chars.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in bg-slate-50 dark:bg-gray-950 overflow-y-auto">
            <div className="w-full max-w-sm">
                 <div className="w-24 h-24 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce shadow-sm">
                    <ChefHat className="w-12 h-12 text-orange-500" />
                 </div>
                 <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">EatAi</h1>
                 <p className="text-gray-500 dark:text-gray-400 mb-8">AI-Powered Food Delivery</p>

                 <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">{error}</p>}

                    <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-all disabled:opacity-50">
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                 </form>

                 <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-50 dark:bg-gray-950 text-gray-500">Or continue with</span></div>
                 </div>

                 <button onClick={signInWithGoogle} className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <LogIn className="w-5 h-5" /> Google
                 </button>

                 <p className="mt-8 text-sm text-gray-500">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"} 
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-orange-500 font-bold hover:underline">
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                 </p>
            </div>
    </div>
    );
};

// --- 2. HOME VIEW ---
export const HomeView = ({ setCurrentView, user }) => {
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            setHasPermission(true);
        }
    }, []);

    const handleNotificationClick = async () => {
        const token = await requestNotificationPermission(user.uid);
        if (token) setHasPermission(true);
    };

    return (
        <div className="flex flex-col items-center h-full space-y-8 animate-fade-in p-6 overflow-y-auto pb-24">
        <div className="text-center space-y-2 mt-8"><h1 className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">EatAi</h1><p className="text-gray-500 dark:text-gray-400 text-lg">Welcome back, {user?.displayName?.split(' ')[0]}!</p>
            <div className="w-full max-w-md pt-4 space-y-3">
                <button onClick={() => setCurrentView('orders')} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-orange-200 transition-all"><Package className="w-5 h-5 text-orange-500" />View My Orders</button>
                
                {!hasPermission && (
                    <button onClick={handleNotificationClick} className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold py-3 rounded-3xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 transition-all text-sm">
                        <Bell className="w-4 h-4" /> Enable Notifications
                    </button>
                )}
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
            <button onClick={() => setCurrentView('decider')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-orange-100 dark:border-gray-700 hover:border-orange-300 transition-all transform hover:-translate-y-1 text-left"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ChefHat className="w-12 h-12 text-orange-500 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">AI Chef</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Generate recipes.</p></button>
            <button onClick={() => setCurrentView('location')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-green-100 dark:border-gray-700 hover:border-green-300 transition-all transform hover:-translate-y-1"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ShoppingBag className="w-12 h-12 text-green-600 dark:text-green-400 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">Market</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Meals & cravings.</p></button>
        </div>
        </div>
    );
};

// --- 3. LOCATION SELECTOR ---
export const LocationSelectionView = ({ setCity, setCurrentView, locations }) => {
    const displayLocations = locations && locations.length > 0 ? locations : LOCATIONS;

    return (
        <ViewContainer title="Select Location" showBack onBack={() => setCurrentView('home')}>
            <div className="grid grid-cols-1 gap-4 mt-4">
                {displayLocations.map((loc) => (
                    <button key={loc} onClick={() => { setCity(loc); setCurrentView('vendors'); }} className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-between hover:scale-[1.02] transition-transform shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-2xl">📍</div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{loc}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Find food in {loc}</p>
                            </div>
                        </div>
                        <ArrowLeft className="w-6 h-6 text-orange-500 rotate-180" />
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
            <div className="grid grid-cols-1 gap-4 mt-4">
                {vendors.map((vendor) => (
                    <button key={vendor} onClick={() => { setVendor(vendor); setCurrentView('market'); }} className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-orange-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                {vendorLogos && vendorLogos[vendor] ? (
                                    <img src={vendorLogos[vendor]} alt={vendor} className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-8 h-8 text-orange-600" />
                                )}
                            </div>
                            <div className="text-left"><h3 className="text-xl font-bold text-gray-800 dark:text-white">{vendor}</h3><p className="text-sm text-gray-500 dark:text-gray-400">Tap to see menu</p></div>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                    </button>
                ))}
                {vendors.length === 0 && <p className="text-center text-gray-500 mt-10">No vendors registered in this city yet.</p>}
            </div>
        </ViewContainer>
    );
};

// --- 5. MARKET VIEW ---
export const MarketView = ({ setCurrentView, addToCart, marketData, loadingData, city, vendor }) => {
    const [category, setCategory] = useState('All');
    
    // DEBUGGING
    console.log(`🔎 Searching for: City=${city}, Vendor=${vendor}`);

    if (loadingData && marketData.length === 0) return <div className="flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    
    // FILTER LOGIC
    const items = marketData.filter(p => {
        const productVendor = p.vendor ? p.vendor.toLowerCase() : "";
        const selectedVendor = vendor ? vendor.toLowerCase() : "";
        
        // Relaxed Vendor Check
        const vendorMatch = productVendor.includes(selectedVendor) || selectedVendor.includes(productVendor);
        const categoryMatch = category === 'All' ? true : p.category === category;
        
        if (vendorMatch) return categoryMatch;

        // Strict Location Check (Fallback)
        const locationMatch = !p.location || (p.location && city && p.location.toLowerCase() === city.toLowerCase());
        return locationMatch && vendorMatch && categoryMatch;
    });

    const categories = [{ id: 'All', label: 'All', icon: null }, { id: 'fullMeal', label: 'Meals', icon: ShoppingBag }, { id: 'cravings', label: 'Cravings', icon: Heart }, { id: 'pregnancy', label: 'Pregnancy', icon: Baby }, { id: 'fitness', label: 'Fitness', icon: Dumbbell }, { id: 'male', label: 'Male', icon: Flame }];
    
    return (
        <ViewContainer title={`${vendor} Menu`} showBack onBack={() => setCurrentView('vendors')}>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">{categories.map(cat => (<DietaryFilter key={cat.id} icon={cat.icon} label={cat.label} active={category === cat.id} onClick={() => setCategory(cat.id)} />))}</div>
            
            {items.length === 0 && (
                 <div className="mb-4 p-2 bg-yellow-50 rounded text-xs text-yellow-700 text-center">
                    DEBUG: Searching for "{vendor}" in "{city}". <br/>
                    Database has {marketData.length} items total.
                 </div>
            )}

            <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide min-h-0">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Box className="w-16 h-16 mb-4 opacity-20" />
                        <p>No items found.</p>
                        <p className="text-xs text-orange-500 mt-2">Vendor Name Mismatch?</p>
                        <button onClick={() => setCategory('All')} className="mt-4 text-xs bg-gray-200 px-3 py-1 rounded">Clear Filters</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">{items.map((item) => (<ProductCard key={item.id} item={item} addToCart={addToCart} isAdmin={false} />))}</div>
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
  return (
    <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div> : orders.length === 0 ? <div className="text-center mt-10 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No orders yet.</p></div> : <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-4">{orders.map(order => (<div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer active:scale-95 transition-transform"><div className="flex justify-between mb-2"><span className={`text-xs px-2 py-1 rounded-full font-bold ${order.status==='pending'?'bg-yellow-100 text-yellow-700': order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{order.status.toUpperCase()}</span><span className="text-xs text-gray-400 font-mono">#{order.id.slice(0,6)}</span></div><div className="flex justify-between items-end"><div><p className="font-bold dark:text-white">{order.items.length} Items</p><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-black text-orange-500 text-lg">₦{order.total.toLocaleString()}</p><p className="text-[10px] text-gray-400">Tap for details</p></div></div></div>))}</div>}
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
             <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs">Generate a secure wallet linked to {user.displayName}</p>
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

// --- 8. AI CHEF ---
export const DeciderView = ({ ingredients, setIngredients, generateRecipes, isThinking, aiRecipe, setCurrentView, activeFilters, toggleFilter }) => (
    <ViewContainer title="AI Fridge Raider" showBack onBack={() => setCurrentView('home')}>
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <div className="bg-orange-50 dark:bg-gray-800 p-6 rounded-3xl mb-6 border border-orange-100 dark:border-gray-700 transition-colors">
          <div className="flex flex-wrap gap-2 mb-4"><DietaryFilter icon={Leaf} label="Vegan" active={activeFilters.includes('Vegan')} onClick={() => toggleFilter('Vegan')} /><DietaryFilter icon={Beef} label="High Protein" active={activeFilters.includes('High Protein')} onClick={() => toggleFilter('High Protein')} /><DietaryFilter icon={Zap} label="Keto" active={activeFilters.includes('Keto')} onClick={() => toggleFilter('Keto')} /><DietaryFilter icon={Cookie} label="Low Carb" active={activeFilters.includes('Low Carb')} onClick={() => toggleFilter('Low Carb')} /></div>
          <label className="block text-orange-800 dark:text-orange-300 font-semibold mb-3">What's in your kitchen?</label>
          <textarea autoFocus value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="e.g., 2 eggs, stale bread..." className="w-full p-4 rounded-xl border-2 border-orange-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 bg-white dark:bg-gray-700 dark:text-white h-32 resize-none transition-all placeholder-gray-400" />
          <button onClick={generateRecipes} disabled={isThinking || !ingredients.trim()} className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 dark:shadow-none">{isThinking ? <><Sparkles className="w-5 h-5 animate-spin" /><span>Thinking...</span></> : <><Sparkles className="w-5 h-5" /><span>Invent Recipe</span></>}</button>
        </div>
        {aiRecipe && <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 animate-slide-up whitespace-pre-wrap"><h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">Chef EatAi Suggests:</h3><div className="text-gray-700 dark:text-gray-300 leading-loose font-medium whitespace-pre-line">{aiRecipe}</div></div>}
      </div>
    </ViewContainer>
);

// --- 9. CHECKOUT MODALS ---
export const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess, city }) => {
  if (!isOpen) return null;
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryArea: '' });
  
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

  const handlePayment = async (method = paymentMethod) => {
    // 🟢 FIX: Ensure Delivery Area is selected before paying
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
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-center mb-4 dark:text-white">Complete Order</h3>
            <div className="space-y-3">
                {paymentMethod === 'paystack' && <div className="text-center bg-green-50 p-4 rounded-xl"><p className="text-xs text-green-600">Secure Payment via Paystack</p></div>}
                {paymentMethod === 'crypto' && <div className="text-center bg-indigo-50 p-4 rounded-xl"><p className="text-xs text-indigo-600">Paying with linked wallet</p><p className="font-mono text-xs mt-1 truncate">{globalWallet?.address}</p></div>}
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                    <div><label className="text-xs font-bold text-gray-500">Delivery Area</label><select className="w-full bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 dark:text-white" value={form.deliveryArea} onChange={e => setForm({...form, deliveryArea: e.target.value})}><option value="">Select...</option>{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}</select>{form.deliveryArea && <p className="text-xs text-orange-500 mt-1">Delivery: ₦{deliveryFee}</p>}</div>
                    <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Street" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                    <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-gray-500">Phone</label><input type="tel" className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="080..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div><div className="flex-1"><label className="text-xs font-bold text-gray-500">Landmark</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Near..." value={form.landmark} onChange={e => setForm({...form, landmark: e.target.value})} /></div></div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700"><div className="text-sm text-gray-500">Total (+Del):</div><div className="text-2xl font-black text-green-600">₦{grandTotal.toLocaleString()}</div></div>
            {/* 🟢 FIX: DISABLE BUTTON IF NO AREA SELECTED */}
            {paymentMethod === 'paystack' ? ( 
                form.address && form.phone && form.deliveryArea ? 
                <PaystackButton {...paystackConfig} text="Pay Now" onSuccess={handlePaystackSuccess} onClose={() => alert("Payment Cancelled")} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg" /> 
                : <button disabled className="w-full mt-4 bg-gray-400 text-white font-bold py-4 rounded-xl cursor-not-allowed">Enter Delivery Details</button>
            ) : (
                <button onClick={() => handlePayment()} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Confirm Crypto Transfer'}</button>
            )}
        </div>
    </div>
  );
};

export const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city }) => {
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [showModal, setShowModal] = useState(false);
  return (
  <>
  <PaymentModal isOpen={showModal} onClose={() => setShowModal(false)} total={cartTotal} paymentMethod={paymentMethod} user={user} cart={cart} globalWallet={globalWallet} onSuccess={() => {setShowModal(false); setCart([]); setCurrentView('orders'); alert("Order Placed!");}} city={city} />
  <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
    <div className={`absolute inset-0 bg-black/50 transition-opacity ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setCurrentView(marketSection ? 'market' : 'home')} />
    <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 transform ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center"><h2 className="text-2xl font-bold dark:text-white">Cart</h2><button onClick={() => setCurrentView('home')}><X className="w-6 h-6" /></button></div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cart.length === 0 ? <div className="text-center text-gray-400 mt-10"><ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20"/><p>Empty</p></div> : 
         cart.map(item => <div key={item.cartId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl"><div className="flex gap-3"><span className="text-2xl">{item.image}</span><div><p className="font-bold text-sm dark:text-white">{item.name}</p><p className="text-xs text-gray-500">₦{item.price.toLocaleString()}</p></div></div><button onClick={() => removeFromCart(item.cartId)} className="text-red-500"><Minus className="w-4 h-4" /></button></div>)}
      </div>
      <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-4">
        {cart.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
                <button onClick={() => setPaymentMethod('paystack')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'paystack' ? 'bg-white shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}><CreditCard className="w-4 h-4" /> Paystack</button>
                <button onClick={() => setPaymentMethod('crypto')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'crypto' ? 'bg-indigo-500 text-white shadow' : 'text-gray-500'}`}><Wallet className="w-4 h-4" /> Crypto</button>
            </div>
        )}
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-2xl font-black dark:text-white">₦{cartTotal.toLocaleString()}</span></div>
        <button onClick={() => setShowModal(true)} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">Checkout</button>
      </div>
    </div>
  </div>
  </>
  );
};