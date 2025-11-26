import React, { useState, useEffect } from 'react';
import { 
  ChefHat, ShoppingBag, Home, Search, ArrowLeft, Sparkles, 
  ShoppingCart, Heart, Flame, Baby, Droplet, Plus, Minus, X,
  Moon, Sun, Leaf, Beef, Zap, Cookie, LogOut, User, Wallet, 
  Copy, Eye, EyeOff, CreditCard, Package, Clock, CheckCircle, 
  Lock, Database, Trash2, Smile, Box, Landmark, MapPin, Truck, ShieldCheck
} from 'lucide-react';
import { 
  auth, signInWithGoogle, logout, saveWalletToProfile, createOrder, 
  getUserOrders, getAllProducts, seedDatabase, addProduct, deleteProduct,
  getAllOrders, updateOrderStatus
} from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ethers } from 'ethers';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- 🔒 CONFIGURATION 🔒 ---

// 1. REPLACE WITH YOUR GMAIL ADDRESS(ES)
const ADMIN_EMAILS = ["mannikdaniel@gmail.com", "ehijieizunyon28@gmail.com"]; 

// 2. REPLACE WITH YOUR BANK DETAILS
const BANK_DETAILS = {
  bank: "OPay",
  number: "7060632004", 
  name: "izunyon ehijie"
};

// --- REUSABLE COMPONENTS ---

const ViewContainer = ({ children, title, showBack, onBack }) => (
  <div className="p-6 max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
    </div>
    {children}
  </div>
);

const DietaryFilter = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
      active 
        ? 'bg-orange-500 text-white border-orange-500' 
        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

// --- VIEW COMPONENTS ---

const AdminView = ({ setCurrentView, marketData, refreshData }) => {
  const [activeTab, setActiveTab] = useState('orders'); // Default to orders so you see them first
  const [adminOrders, setAdminOrders] = useState([]);
  
  // Product Form State
  const [newItem, setNewItem] = useState({
    name: '', price: '', vendor: '', category: 'fullMeal', desc: '', stock: 10, image: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load orders when tab allows
  useEffect(() => {
    if (activeTab === 'orders') {
      const loadAdminOrders = async () => {
        const data = await getAllOrders();
        setAdminOrders(data);
      };
      loadAdminOrders();
    }
  }, [activeTab]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    if(confirm(`Mark this order as ${newStatus}?`)) {
        await updateOrderStatus(orderId, newStatus);
        // Optimistic update locally
        setAdminOrders(adminOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let imageIcon = newItem.image || '🍽️'; 

    await addProduct({ 
        ...newItem, 
        price: parseFloat(newItem.price), 
        stock: parseInt(newItem.stock),
        image: imageIcon
    });
    
    alert("Product Added!");
    setNewItem({ name: '', price: '', vendor: '', category: 'fullMeal', desc: '', stock: 10, image: '' });
    await refreshData();
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this item?")) {
      await deleteProduct(id);
      await refreshData();
    }
  };

  return (
    <ViewContainer title="Manager HQ" showBack onBack={() => setCurrentView('home')}>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}
        >
            Incoming Orders
        </button>
        <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}
        >
            Inventory
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4 pb-24">
            {adminOrders.length === 0 && <p className="text-center text-gray-400 mt-10">No orders found.</p>}
            
            {adminOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
                                'bg-green-100 text-green-800'
                            }`}>
                                {order.status.toUpperCase()}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-lg dark:text-white">₦{order.total.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 uppercase">{order.paymentMethod}</p>
                        </div>
                    </div>
                    
                    {/* Sender Info */}
                    {order.paymentMethod === 'transfer' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2 border border-blue-100 dark:border-blue-800">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Sender Name:</strong> {order.transferName}
                            </p>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-2">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Delivery Address:</p>
                        <p className="text-sm dark:text-gray-300 font-medium">{order.deliveryAddress}</p>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-2 mb-4">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>1x {item.name} ({item.vendor})</span>
                                <span>₦{item.price}</span>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    {order.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold shadow hover:bg-green-700">
                            Confirm Payment & Order
                        </button>
                    )}
                    {order.status === 'confirmed' && (
                        <button onClick={() => handleStatusUpdate(order.id, 'delivered')} className="w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg text-sm font-bold">
                            Mark as Delivered
                        </button>
                    )}
                </div>
            ))}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'products' && (
        <>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" /> Add New Item
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Name" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border-none w-full" 
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <input required type="number" placeholder="Price (₦)" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border-none w-full" 
                  value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Vendor" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border-none w-full" 
                  value={newItem.vendor} onChange={e => setNewItem({...newItem, vendor: e.target.value})} />
                <select className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white border-none w-full"
                  value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="fullMeal">Full Meal</option>
                  <option value="pregnancy">Pregnancy</option>
                  <option value="period">Period</option>
                  <option value="male">Male</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <Box className="w-5 h-5 text-gray-500" />
                    <input required type="number" placeholder="Stock" className="bg-transparent border-none w-full outline-none dark:text-white" 
                    value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <Smile className="w-5 h-5 text-gray-500" />
                    <input placeholder="Emoji" className="bg-transparent border-none w-full outline-none dark:text-white" 
                    value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                </div>
              </div>
              <button disabled={isSubmitting} className="w-full bg-gray-900 dark:bg-orange-600 text-white font-bold py-3 rounded-xl">
                {isSubmitting ? 'Saving...' : 'Save Item'}
              </button>
            </form>
          </div>

          <div className="space-y-3 pb-20">
            {marketData.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.image}</span>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">₦{item.price.toLocaleString()} • Stock: {item.stock}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </ViewContainer>
  );
};

const OrdersView = ({ setCurrentView, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await getUserOrders(user.uid);
      setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  return (
    <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-400 mt-10">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-24">
          {orders.map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8)}</span>
                
                {/* STATUS BADGE */}
                <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                }`}>
                  {order.status === 'pending' ? <Clock className="w-3 h-3" /> : 
                   order.status === 'confirmed' ? <ShieldCheck className="w-3 h-3" /> :
                   <CheckCircle className="w-3 h-3" />}
                  {order.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="flex-1 mr-4">
                  <p className="font-bold text-gray-800 dark:text-white">{order.items.length} Items</p>
                  <p className="text-xs text-gray-500 truncate">{order.deliveryAddress}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-400 capitalize">{order.paymentMethod}</p>
                   <p className="text-xl font-black text-orange-500">₦{order.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ViewContainer>
  );
};

const WalletView = ({ setCurrentView, user, setGlobalWallet }) => {
  const [wallet, setWallet] = useState(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedWallet = localStorage.getItem(`eatai_wallet_${user.uid}`);
    if (savedWallet) {
      const parsed = JSON.parse(savedWallet);
      setWallet(parsed);
      setGlobalWallet(parsed); 
    }
  }, [user]);

  const createWallet = async () => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const newWallet = ethers.Wallet.createRandom();
        const walletData = {
          address: newWallet.address,
          privateKey: newWallet.privateKey,
          mnemonic: newWallet.mnemonic?.phrase
        };
        localStorage.setItem(`eatai_wallet_${user.uid}`, JSON.stringify(walletData));
        await saveWalletToProfile(user.uid, newWallet.address);
        setWallet(walletData);
        setGlobalWallet(walletData);
      } catch (e) {
        console.error("Wallet creation failed", e);
      }
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <ViewContainer title="Crypto Kitchen" showBack onBack={() => setCurrentView('home')}>
      <div className="flex flex-col items-center justify-center space-y-6">
        {!wallet ? (
          <div className="text-center space-y-6 mt-10">
             <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto">
               <Wallet className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Wallet Connected</h3>
             <p className="text-gray-500 dark:text-gray-400 max-w-sm">
               Generate a secure Ethereum wallet linked to your account <strong>{user.displayName}</strong>.
             </p>
             <button 
              onClick={createWallet}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 mx-auto"
             >
               {isLoading ? <Sparkles className="animate-spin" /> : <Plus />}
               Generate Wallet
             </button>
          </div>
        ) : (
          <div className="w-full space-y-6 animate-slide-up">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                   <span className="bg-white/20 px-2 py-1 rounded text-xs font-mono">Connected</span>
                </div>
                <Wallet className="w-6 h-6 opacity-80" />
              </div>
              <p className="text-xs opacity-70 mb-1">Your Public Address</p>
              <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg cursor-pointer hover:bg-black/30 transition" onClick={() => copyToClipboard(wallet.address)}>
                <code className="text-sm font-mono truncate flex-1">{wallet.address}</code>
                <Copy className="w-4 h-4" />
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 rounded-xl flex gap-3">
              <Sparkles className="w-6 h-6 text-green-500 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-300">
                <strong>Success!</strong> This wallet is linked to your EatAi profile.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Private Key</label>
              <div className="relative">
                <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded-xl font-mono text-xs break-all border border-gray-200 dark:border-gray-700 ${!showPrivate ? 'blur-sm select-none' : ''}`}>
                  {wallet.privateKey}
                </div>
                <button 
                  onClick={() => setShowPrivate(!showPrivate)}
                  className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-50"
                >
                  {showPrivate ? <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ViewContainer>
  );
};

const LoginView = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
      <div className="w-32 h-32 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <ChefHat className="w-16 h-16 text-orange-500" />
      </div>
      <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Welcome to EatAi</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
        Your personal AI Chef and Cravings Market. Sign in to save recipes and order food.
      </p>
      <button 
        onClick={signInWithGoogle}
        className="bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-3 shadow-lg"
      >
        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
        </div>
        Sign in with Google
      </button>
    </div>
  );

const HomeView = ({ setCurrentView, user }) => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in p-6">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">EatAi</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Welcome back, {user?.displayName?.split(' ')[0]}!
        </p>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
        <button 
          onClick={() => setCurrentView('decider')}
          className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-orange-100 dark:border-gray-700 hover:border-orange-300 transition-all transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <ChefHat className="w-12 h-12 text-orange-500 mb-4 relative z-10" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">AI Chef</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Got ingredients? I'll make the recipe.</p>
        </button>
  
        <button 
          onClick={() => setCurrentView('market')}
          className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-green-100 dark:border-gray-700 hover:border-green-300 transition-all transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
          <ShoppingBag className="w-12 h-12 text-green-600 dark:text-green-400 mb-4 relative z-10" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">Market</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Meals & specialized cravings.</p>
        </button>
      </div>
    </div>
  );

const DeciderView = ({ ingredients, setIngredients, generateRecipes, isThinking, aiRecipe, setCurrentView, activeFilters, toggleFilter }) => (
    <ViewContainer title="AI Fridge Raider" showBack onBack={() => setCurrentView('home')}>
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <div className="bg-orange-50 dark:bg-gray-800 p-6 rounded-3xl mb-6 border border-orange-100 dark:border-gray-700 transition-colors">
          
          <div className="flex flex-wrap gap-2 mb-4">
            <DietaryFilter icon={Leaf} label="Vegan" active={activeFilters.includes('Vegan')} onClick={() => toggleFilter('Vegan')} />
            <DietaryFilter icon={Beef} label="High Protein" active={activeFilters.includes('High Protein')} onClick={() => toggleFilter('High Protein')} />
            <DietaryFilter icon={Zap} label="Keto" active={activeFilters.includes('Keto')} onClick={() => toggleFilter('Keto')} />
            <DietaryFilter icon={Cookie} label="Low Carb" active={activeFilters.includes('Low Carb')} onClick={() => toggleFilter('Low Carb')} />
          </div>
  
          <label className="block text-orange-800 dark:text-orange-300 font-semibold mb-3">What's in your kitchen?</label>
          <textarea
            autoFocus
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="e.g., 2 eggs, stale bread, milk, half an onion..."
            className="w-full p-4 rounded-xl border-2 border-orange-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 bg-white dark:bg-gray-700 dark:text-white h-32 resize-none transition-all placeholder-gray-400"
          />
          <button 
            onClick={generateRecipes}
            disabled={isThinking || !ingredients.trim()}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 dark:shadow-none"
          >
            {isThinking ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Invent Recipe</span>
              </>
            )}
          </button>
        </div>
  
        {aiRecipe && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 animate-slide-up whitespace-pre-wrap">
            <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">Chef EatAi Suggests:</h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {aiRecipe}
            </div>
          </div>
        )}
      </div>
    </ViewContainer>
  );
  
  const MarketView = ({ marketSection, setMarketSection, cravingsType, setCravingsType, setCurrentView, addToCart, marketData, loadingData }) => {
    if (loadingData) {
      return <div className="flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    }

    if (!marketData || marketData.length === 0) {
      return (
        <ViewContainer title="The Market" showBack onBack={() => setCurrentView('home')}>
          <div className="text-center mt-20">
            <p className="text-gray-500 mb-4">Market is empty.</p>
            <button onClick={() => setCurrentView('admin')} className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow">
              Go to Admin to Add Items
            </button>
          </div>
        </ViewContainer>
      )
    }

    if (!marketSection) {
      return (
        <ViewContainer title="The Market" showBack onBack={() => setCurrentView('home')}>
          <div className="space-y-4">
            <button 
              onClick={() => setMarketSection('fullMeal')}
              className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-400 to-red-500 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"
            >
              <div className="relative z-10 text-white">
                <h3 className="text-3xl font-black">Full Meals</h3>
                <p className="opacity-90">Hearty dinners & lunch combos</p>
              </div>
              <span className="absolute bottom-2 right-2 text-6xl opacity-20">🍱</span>
            </button>
  
            <button 
              onClick={() => setMarketSection('cravings')}
              className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"
            >
              <div className="relative z-10 text-white">
                <h3 className="text-3xl font-black">Cravings</h3>
                <p className="opacity-90">For those specific moments</p>
              </div>
              <span className="absolute bottom-2 right-2 text-6xl opacity-20">🍫</span>
            </button>
          </div>
        </ViewContainer>
      );
    }
  
    if (marketSection === 'cravings' && !cravingsType) {
      const cravingOptions = [
        { id: 'pregnancy', label: 'Pregnancy', icon: Baby, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-200' },
        { id: 'period', label: 'Period', icon: Droplet, color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' },
        { id: 'normal', label: 'Normal', icon: Heart, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' },
        { id: 'male', label: 'Male', icon: Flame, color: 'bg-slate-800 text-white dark:bg-slate-700' },
      ];
  
      return (
        <ViewContainer title="What are you craving?" showBack onBack={() => setMarketSection(null)}>
          <div className="grid grid-cols-2 gap-4">
            {cravingOptions.map((opt) => (
              <button 
                key={opt.id}
                onClick={() => setCravingsType(opt.id)}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl ${opt.color} h-40 shadow-sm hover:shadow-md transition-all`}
              >
                <opt.icon className="w-10 h-10 mb-3" />
                <span className="font-bold text-lg">{opt.label}</span>
              </button>
            ))}
          </div>
        </ViewContainer>
      );
    }
  
    const products = marketSection === 'fullMeal' 
      ? marketData.filter(p => p.category === 'fullMeal')
      : marketData.filter(p => p.category === cravingsType);
  
    const title = marketSection === 'fullMeal' ? 'Full Meals' : `${cravingsType.charAt(0).toUpperCase() + cravingsType.slice(1)} Cravings`;
  
    return (
      <ViewContainer title={title} showBack onBack={() => marketSection === 'cravings' ? setCravingsType(null) : setMarketSection(null)}>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-24 scrollbar-hide">
          {products.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 animate-fade-in transition-colors">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-4xl shrink-0 overflow-hidden">
                {/* Render Emoji or Image URL */}
                {item.image}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300 font-bold">{item.vendor}</span>
                    {/* Stock Badge */}
                    {(item.stock === 0) && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">Sold Out</span>}
                    {(item.stock > 0 && item.stock < 5) && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded font-bold">Low Stock</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.desc}</p>
                <div className="text-orange-600 dark:text-orange-400 font-bold">₦{item.price.toLocaleString()}</div>
              </div>
              <button 
                onClick={() => addToCart(item)}
                disabled={item.stock === 0}
                className={`p-3 text-white rounded-xl transition-colors ${item.stock === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 dark:bg-orange-500 hover:bg-gray-700 dark:hover:bg-orange-600'}`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </ViewContainer>
    );
  };

const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess }) => {
  if (!isOpen) return null;

  const [processing, setProcessing] = useState(false);
  const [transferName, setTransferName] = useState('');
  const [address, setAddress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handlePayment = async () => {
    // Simple Validation
    if (paymentMethod === 'transfer' && (!transferName || !address)) {
        alert("Please fill in all fields");
        return;
    }
    if (paymentMethod === 'card' && (!cardNumber || !expiry || !cvv || !address)) {
        alert("Please fill in all fields");
        return;
    }
    if (paymentMethod === 'crypto' && !address) {
        alert("Please enter delivery address");
        return;
    }

    setProcessing(true);
    
    // Simulate slight delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (paymentMethod === 'crypto') {
        try {
            if (!globalWallet) throw new Error("No wallet found");
        } catch (e) {}
    }

    await createOrder(user.uid, cart, total, paymentMethod, globalWallet?.address, address, transferName);
    setProcessing(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 relative animate-slide-up max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {paymentMethod === 'crypto' ? 'Confirm Crypto' : (paymentMethod === 'transfer' ? 'Bank Transfer' : 'Card Payment')}
                </h3>
                <p className="text-gray-500 text-sm">Total Amount: <span className="font-bold text-orange-500">₦{total.toLocaleString()}</span></p>
            </div>

            {/* PAYMENT FORMS */}
            <div className="space-y-4">
                
                {/* TRANSFER MODE */}
                {paymentMethod === 'transfer' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-300 uppercase font-bold mb-1">Pay to this Account:</p>
                        <p className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <Landmark className="w-5 h-5" /> {BANK_DETAILS.bank}
                        </p>
                        <p className="text-2xl font-mono tracking-wider text-blue-600 dark:text-blue-400 my-1 selection:bg-blue-200">{BANK_DETAILS.number}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{BANK_DETAILS.name}</p>
                    </div>
                )}

                {/* CRYPTO MODE */}
                {paymentMethod === 'crypto' && (
                    <div className="space-y-4 text-center py-4">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Wallet className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Paying from wallet: <br/>
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{globalWallet?.address.substring(0,10)}...</code>
                        </p>
                        <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
                            Note: This is a simulated transaction. No real ETH deducted.
                        </p>
                    </div>
                )}

                {/* CARD MODE (Simulated) */}
                {paymentMethod === 'card' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Card Number</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="0000 0000 0000 0000" 
                                    className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={cardNumber}
                                    onChange={e => setCardNumber(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Expiry</label>
                                <input type="text" placeholder="MM/YY" className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" value={expiry} onChange={e => setExpiry(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">CVV</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="123" className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none" value={cvv} onChange={e => setCvv(e.target.value)}/>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INPUT FIELDS (Address & Name) */}
                <div className="space-y-3 pt-2">
                    {paymentMethod === 'transfer' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sender Name</label>
                            <input 
                                type="text" 
                                placeholder="Name on Bank Account" 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                                value={transferName}
                                onChange={e => setTransferName(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Delivery Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Street, Area, City" 
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

            </div>

            <button 
                onClick={handlePayment}
                disabled={processing}
                className={`w-full mt-8 py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${processing ? 'opacity-75 cursor-not-allowed' : ''} ${paymentMethod === 'crypto' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {processing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        {paymentMethod === 'transfer' ? 'I Have Sent the Money' : 'Confirm Order'}
                    </>
                )}
            </button>
        </div>
    </div>
  );
};

const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart }) => {
  const [paymentMethod, setPaymentMethod] = useState('transfer'); // Default to Transfer
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const initiateCheckout = () => {
    if (paymentMethod === 'crypto' && !globalWallet) {
        alert("Please create a wallet in the Crypto section first!");
        return;
    }
    setShowPaymentModal(true);
  };

  const handleSuccess = () => {
      setShowPaymentModal(false);
      alert("Order Placed! Check 'Orders' tab for updates.");
      setCart([]);
      setCurrentView('orders');
  };

  return (
  <>
  <PaymentModal 
    isOpen={showPaymentModal} 
    onClose={() => setShowPaymentModal(false)}
    total={cartTotal}
    paymentMethod={paymentMethod}
    user={user}
    cart={cart}
    globalWallet={globalWallet}
    onSuccess={handleSuccess}
  />

  <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
    <div 
      className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
      onClick={() => setCurrentView(marketSection ? 'market' : 'home')}
    />
    
    <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 transform ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Cart</h2>
        <button onClick={() => setCurrentView(marketSection ? 'market' : 'home')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <ShoppingCart className="w-16 h-16 opacity-20" />
            <p>Your basket is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.cartId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.image}</span>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">₦{item.price.toLocaleString()}</div>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-4">
        
        {/* Payment Method Selector */}
        {cart.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
                <button 
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                >
                    <Landmark className="w-4 h-4" /> Transfer
                </button>
                <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
                >
                    <CreditCard className="w-4 h-4" /> Card
                </button>
                <button 
                    onClick={() => setPaymentMethod('crypto')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${paymentMethod === 'crypto' ? 'bg-indigo-500 shadow-sm text-white' : 'text-gray-500'}`}
                >
                    <Wallet className="w-4 h-4" /> Crypto
                </button>
            </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Total</span>
          <span className="text-3xl font-black text-gray-900 dark:text-white">₦{cartTotal.toLocaleString()}</span>
        </div>
        <button 
            onClick={initiateCheckout}
            className={`w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center ${paymentMethod === 'crypto' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'} dark:shadow-none`}
        >
          {paymentMethod === 'crypto' ? 'Pay with Ethereum' : 'Checkout'}
        </button>
      </div>
    </div>
  </div>
  </>
  );
};

// --- MAIN APP COMPONENT ---

export default function EatAi() {
  const [currentView, setCurrentView] = useState('home'); 
  const [ingredients, setIngredients] = useState('');
  const [aiRecipe, setAiRecipe] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [marketSection, setMarketSection] = useState(null); 
  const [cravingsType, setCravingsType] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [globalWallet, setGlobalWallet] = useState(null);
  
  const [marketData, setMarketData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('eatai_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [darkMode, setDarkMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  // --- 🔒 SECURITY CHECK: LIST YOUR ADMIN EMAIL HERE 🔒 ---
  const ADMIN_EMAILS = ["your-email@gmail.com", "partner@gmail.com"]; 
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if(currentUser) {
          const saved = localStorage.getItem(`eatai_wallet_${currentUser.uid}`);
          if(saved) setGlobalWallet(JSON.parse(saved));
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const products = await getAllProducts();
      setMarketData(products);
      setLoadingData(false);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('eatai_cart', JSON.stringify(cart));
  }, [cart]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleFilter = (filter) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(activeFilters.filter(f => f !== filter));
    } else {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const generateRecipes = async () => {
    if (!ingredients.trim()) return;
    
    setIsThinking(true);
    setAiRecipe(null);

    const dietString = activeFilters.length > 0 
      ? `Important Dietary Rules: The user follows these diets: ${activeFilters.join(', ')}. Ensure all recipes strictly adhere to this.` 
      : '';

    const systemPrompt = `You are a world-class chef. The user will give you a list of ingredients they have. 
    Suggest 2 distinct, creative, and delicious recipes they can make. 
    ${dietString}
    Format the output clearly with a Title, Ingredients list, and Instructions.
    Keep the tone encouraging and fun. Use emojis.`;
    
    const userQuery = `I have these ingredients: ${ingredients}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          }),
        }
      );

      if (!response.ok) throw new Error('API Failed');

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiRecipe(text);
    } catch (error) {
      setAiRecipe("Oops! My chef brain is a bit scrambled. Please try again later. 🍳");
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  const addToCart = (item) => setCart([...cart, { ...item, cartId: Date.now() }]);
  const removeFromCart = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans transition-colors duration-300">
           <div className="flex justify-end p-4">
              <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-600 dark:text-yellow-400">
                {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
           </div>
           <LoginView />
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300">
        
        <CartOverlay 
          cart={cart} 
          setCart={setCart}
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          marketSection={marketSection} 
          removeFromCart={removeFromCart} 
          cartTotal={cartTotal}
          globalWallet={globalWallet}
          user={user}
        />

        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 transition-colors">
          <div className="text-2xl font-black text-orange-500 cursor-pointer" onClick={() => setCurrentView('home')}>EatAi</div>
          <div className="flex items-center space-x-6">
            <button onClick={() => setCurrentView('decider')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">AI Chef</button>
            <button onClick={() => setCurrentView('market')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">Market</button>
            <button onClick={() => setCurrentView('orders')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">Orders</button>
            <button onClick={() => setCurrentView('wallet')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">Crypto</button>
            
            <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-yellow-400">
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            <button onClick={() => setCurrentView('cart')} className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-white" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
              {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-300" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-800 font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="md:hidden flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-900 sticky top-0 z-30 shadow-sm">
           <div className="text-xl font-black text-orange-500" onClick={() => setCurrentView('home')}>EatAi</div>
           <div className="flex items-center gap-3">
             <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-600 dark:text-yellow-400">
                {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
             </button>
             <button onClick={logout}>
                <LogOut className="w-6 h-6 text-gray-500" />
             </button>
           </div>
        </div>

        <main className="h-[calc(100vh-140px)] md:h-[calc(100vh-72px)] overflow-hidden">
          {currentView === 'home' && <HomeView setCurrentView={setCurrentView} user={user} />}
          {currentView === 'wallet' && <WalletView setCurrentView={setCurrentView} user={user} setGlobalWallet={setGlobalWallet} />}
          {currentView === 'orders' && <OrdersView setCurrentView={setCurrentView} user={user} />}
          {currentView === 'admin' && isAdmin && (
            <AdminView 
              setCurrentView={setCurrentView} 
              marketData={marketData} 
              refreshData={async () => {
                 const products = await getAllProducts();
                 setMarketData(products);
              }} 
            />
          )}
          
          {currentView === 'decider' && (
            <DeciderView 
              ingredients={ingredients}
              setIngredients={setIngredients}
              generateRecipes={generateRecipes}
              isThinking={isThinking}
              aiRecipe={aiRecipe}
              setCurrentView={setCurrentView}
              activeFilters={activeFilters}
              toggleFilter={toggleFilter}
            />
          )}

          {currentView === 'market' && (
            <MarketView 
              marketSection={marketSection}
              setMarketSection={setMarketSection}
              cravingsType={cravingsType}
              setCravingsType={setCravingsType}
              setCurrentView={setCurrentView}
              addToCart={addToCart}
              marketData={marketData}
              loadingData={loadingData}
            />
          )}
        </main>

        {/* ADMIN BUTTON: Only shows if user is in the ADMIN_EMAILS list */}
        {currentView === 'home' && isAdmin && (
          <div className="fixed bottom-24 left-6 z-50">
             <button onClick={() => setCurrentView('admin')} className="bg-gray-900 text-white font-bold text-sm px-4 py-2 rounded-full shadow-xl flex items-center gap-2 hover:bg-gray-700 transition-colors border border-gray-700">
               <Database className="w-4 h-4" /> Manager Mode
             </button>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-around items-center md:hidden z-40 safe-area-pb transition-colors">
          <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center space-y-1 ${currentView === 'home' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentView('wallet')} className={`flex flex-col items-center space-y-1 ${currentView === 'wallet' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Crypto</span>
          </button>
          <button onClick={() => setCurrentView('decider')} className={`flex flex-col items-center space-y-1 ${currentView === 'decider' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <ChefHat className="w-6 h-6" />
            <span className="text-xs font-medium">Chef</span>
          </button>
          <button onClick={() => setCurrentView('market')} className={`flex flex-col items-center space-y-1 ${currentView === 'market' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Market</span>
          </button>
          <button onClick={() => setCurrentView('cart')} className="flex flex-col items-center space-y-1 text-gray-400 dark:text-gray-500 relative">
            {cart.length > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {cart.length}
              </span>
            )}
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs font-medium">Cart</span>
          </button>
        </nav>

        <style>{`
          .safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.5s ease-out; }
          .animate-slide-up { animation: slideUp 0.5s ease-out; }
          .animate-bounce { animation: bounce 2s infinite; }
        `}</style>
      </div>
    </div>
  );
}