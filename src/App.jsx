import React, { useState, useEffect, useRef } from 'react';
import { PaystackButton } from 'react-paystack';
import { 
  ChefHat, ShoppingBag, Home, Search, ArrowLeft, Sparkles, 
  ShoppingCart, Heart, Flame, Baby, Droplet, Plus, Minus, X,
  Moon, Sun, Leaf, Beef, Zap, Cookie, LogOut, User, Wallet, 
  Copy, Eye, EyeOff, CreditCard, Package, Clock, CheckCircle, 
  Lock, Database, Trash2, Smile, Box, Landmark, MapPin, Truck, 
  ShieldCheck, Edit, Info, ChevronDown, ChevronUp, Dumbbell, Store, LogIn, Filter, Bell, Bike, History, Image as ImageIcon, Upload
} from 'lucide-react';
import { 
  auth, signInWithGoogle, logout, saveWalletToProfile, createOrder, 
  getUserOrders, getAllProducts, seedDatabase, addProduct, deleteProduct,
  getAllOrders, updateOrderStatus, updateProduct, db, collection, onSnapshot, query, where, orderBy, uploadImage, saveVendorLogo
} from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ethers } from 'ethers';

// --- 🔒 CONFIGURATION 🔒 ---
const PAYSTACK_KEY = "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // REPLACE WITH YOUR KEY
const SUPER_ADMINS = ["mannikdaniel@gmail.com"]; // REPLACE WITH YOUR EMAIL
const LOGISTICS_EMAILS = ["kayscourierlogistics@gmail.com"]; 

const SUB_ADMINS = {
    "nascokitchen82@gmail.com": "NASCO",
    "contact@naishatfoodies.com": "NAISHAT",
    "favourobehi20@gmail.com": "OBest",
    "amaazepat@gmail.com": "Phattie Chop Box",
    "yummy.manager@gmail.com": "Yummy You",
    "bigtaste.manager@gmail.com": "Big Taste",
    "affluence.manager@gmail.com": "Affluence",
    "bigjoe.manager@gmail.com": "Big Joe"
};

const BANK_DETAILS = { bank: "OPay", number: "8012345678", name: "EatAi Ventures" };
const LOCATIONS = ["Irrua", "Ekpoma", "Uromi"];
const VENDORS_BY_LOCATION = {
    "Irrua": ["NASCO", "NAISHAT", "OBest", "Phattie Chop Box"],
    "Ekpoma": ["Yummy You", "Big Taste", "Affluence"],
    "Uromi": ["Big Joe", "Uromi Grill"]
};
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const calculateDeliveryFee = (origin, destination) => {
    if (!destination) return 0;
    if (origin === 'Irrua') return destination === 'Irrua' ? 1000 : (destination === 'Ekpoma' ? 2000 : 2500);
    if (origin === 'Ekpoma') return destination === 'Irrua' ? 2000 : (destination === 'Ekpoma' ? 1500 : 2000);
    if (origin === 'Uromi') return destination === 'Uromi' ? 1000 : 3000; 
    return 2000; 
};

// --- UI COMPONENTS ---

const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce transition-all duration-300 pointer-events-none">
      <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700">
        <div className="bg-green-500 rounded-full p-1">
            <CheckCircle className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};

const ViewContainer = ({ children, title, showBack, onBack }) => (
  <div className="p-6 max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
    <div className="flex items-center justify-between mb-6 shrink-0">
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
  <button onClick={onClick} className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300'}`}>
    {Icon && <Icon className="w-3 h-3" />}<span>{label}</span>
  </button>
);

const ProductCard = ({ item, addToCart, isAdmin, onDelete, onEdit }) => {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden relative">
            {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
                <span>{item.image || '🍽️'}</span>
            )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-800 dark:text-white truncate pr-2 text-sm">{item.name}</h4>
            {isAdmin && <div className="flex gap-1"><button onClick={() => onEdit(item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => onDelete(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div>}
          </div>
          <div className="flex items-center gap-2 mt-1"><span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300 font-bold truncate max-w-[100px]">{item.vendor}</span><span className="text-[10px] border border-orange-200 text-orange-600 px-1.5 rounded">{item.location || 'HQ'}</span></div>
          <div className="flex items-center gap-2 mt-1">{(item.stock === 0) && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">Sold Out</span>}{(item.stock > 0 && item.stock < 5) && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded font-bold">Low Stock</span>}</div>
          <div className="flex items-center justify-between mt-2"><div className="text-orange-600 dark:text-orange-400 font-bold">₦{item.price.toLocaleString()}</div>{!isAdmin && <button onClick={() => addToCart(item)} disabled={item.stock === 0} className={`p-2 rounded-lg transition-colors ${item.stock === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 dark:bg-orange-500 text-white hover:scale-105'}`}><Plus className="w-4 h-4" /></button>}</div>
        </div>
      </div>
      <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-2"><button onClick={() => setShowDesc(!showDesc)} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors w-full"><Info className="w-3 h-3" />{showDesc ? 'Hide Details' : 'View Details'}{showDesc ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}</button>{showDesc && <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg animate-fade-in">{item.desc || "No description available."}</div>}</div>
    </div>
  );
};

// --- SCREENS ---

const LoginView = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
      <div className="w-32 h-32 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-8 animate-bounce"><ChefHat className="w-16 h-16 text-orange-500" /></div>
      <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Welcome to EatAi</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">Your personal AI Chef and Cravings Market. Sign in to save recipes and order food.</p>
      <button onClick={signInWithGoogle} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-3 shadow-lg"><LogIn className="w-5 h-5" /> Sign in with Google</button>
    </div>
);

const HomeView = ({ setCurrentView, user }) => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in p-6">
      <div className="text-center space-y-2"><h1 className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">EatAi</h1><p className="text-gray-500 dark:text-gray-400 text-lg">Welcome back, {user?.displayName?.split(' ')[0]}!</p><div className="grid grid-cols-1 gap-4 w-full max-w-md pt-4"><button onClick={() => setCurrentView('orders')} className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-orange-200 transition-all"><Package className="w-5 h-5 text-orange-500" />View My Orders</button></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
        <button onClick={() => setCurrentView('decider')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-orange-100 dark:border-gray-700 hover:border-orange-300 transition-all transform hover:-translate-y-1"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ChefHat className="w-12 h-12 text-orange-500 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">AI Chef</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Generate recipes.</p></button>
        <button onClick={() => setCurrentView('location')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-green-100 dark:border-gray-700 hover:border-green-300 transition-all transform hover:-translate-y-1"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ShoppingBag className="w-12 h-12 text-green-600 dark:text-green-400 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">Market</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Meals & cravings.</p></button>
      </div>
    </div>
);

const LocationSelectionView = ({ setCity, setCurrentView }) => (
    <ViewContainer title="Select Location" showBack onBack={() => setCurrentView('home')}>
        <div className="grid grid-cols-1 gap-4 mt-4">{LOCATIONS.map((loc) => (<button key={loc} onClick={() => { setCity(loc); setCurrentView('vendors'); }} className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-between hover:scale-[1.02] transition-transform shadow-sm"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-2xl">📍</div><div className="text-left"><h3 className="text-xl font-bold text-gray-800 dark:text-white">{loc}</h3><p className="text-sm text-gray-500 dark:text-gray-400">Find food in {loc}</p></div></div><ArrowLeft className="w-6 h-6 text-orange-500 rotate-180" /></button>))}</div>
    </ViewContainer>
);

const VendorSelectionView = ({ city, setVendor, setCurrentView }) => {
    const vendors = VENDORS_BY_LOCATION[city] || [];
    return (
        <ViewContainer title={`${city} Vendors`} showBack onBack={() => setCurrentView('location')}>
            <div className="grid grid-cols-1 gap-4 mt-4">
                {vendors.map((vendor) => (
                    <button key={vendor} onClick={() => { setVendor(vendor); setCurrentView('market'); }} className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-orange-500 transition-all shadow-sm"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-orange-600"><Store className="w-6 h-6" /></div><div className="text-left"><h3 className="text-xl font-bold text-gray-800 dark:text-white">{vendor}</h3><p className="text-sm text-gray-500 dark:text-gray-400">Tap to see menu</p></div></div><ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" /></button>
                ))}
                {vendors.length === 0 && <p className="text-center text-gray-500 mt-10">No vendors registered in this city yet.</p>}
            </div>
        </ViewContainer>
    );
};

const LogisticsView = ({ setCurrentView, user, setNotification }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('active');

    useEffect(() => {
        const q = query(collection(db, "orders"), where("status", "in", ["confirmed", "picked_up", "delivered"]), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatus = async (id, status) => {
        await updateOrderStatus(id, status);
        setNotification(status === 'picked_up' ? "Order Picked Up! 🚴" : "Order Delivered! ✅");
        setTimeout(() => setNotification(null), 3000);
    };

    const activeTasks = tasks.filter(t => t.status === 'confirmed' || t.status === 'picked_up');
    const historyTasks = tasks.filter(t => t.status === 'delivered');
    const displayedTasks = viewMode === 'active' ? activeTasks : historyTasks;

    return (
        <ViewContainer title="Logistics Hub" showBack onBack={() => setCurrentView('home')}>
             <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0"><button onClick={() => setViewMode('active')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'active' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>Active ({activeTasks.length})</button><button onClick={() => setViewMode('history')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'history' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>History</button></div>
            {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div> : (
                <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-4">
                    {displayedTasks.length === 0 && <p className="text-center text-gray-500 mt-10">No {viewMode} deliveries.</p>}
                    {displayedTasks.map(task => (
                        <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-2"><span className={`text-xs font-bold px-2 py-1 rounded-full ${task.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : task.status === 'delivered' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{task.status.toUpperCase()}</span><span className="text-xs font-mono text-gray-400">#{task.id.slice(0,6)}</span></div>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg mb-3 text-sm"><p><strong>To:</strong> {task.deliveryAddress}</p><p><strong>Contact:</strong> {task.phone}</p><p className="text-xs text-gray-500 mt-1">{task.items.length} Items | Fee: ₦{task.deliveryFee}</p></div>
                            {task.status === 'confirmed' && <button onClick={() => handleStatus(task.id, 'picked_up')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow hover:bg-purple-700 flex items-center justify-center gap-2"><Truck className="w-5 h-5" /> Confirm Pickup</button>}
                            {task.status === 'picked_up' && <button onClick={() => handleStatus(task.id, 'delivered')} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow hover:bg-green-700 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Mark Delivered</button>}
                            {task.status === 'delivered' && <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"><History className="w-3 h-3"/> Delivered on {new Date(task.createdAt).toLocaleDateString()}</div>}
                        </div>
                    ))}
                </div>
            )}
        </ViewContainer>
    );
};

const MarketView = ({ setCurrentView, addToCart, marketData, loadingData, city, vendor }) => {
    const [category, setCategory] = useState('All');
    if (loadingData) return <div className="flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    
    const items = marketData.filter(p => (p.location === city || !p.location) && p.vendor === vendor && (category === 'All' ? true : p.category === category));
    const categories = [{ id: 'All', label: 'All', icon: null }, { id: 'fullMeal', label: 'Meals', icon: ShoppingBag }, { id: 'cravings', label: 'Cravings', icon: Heart }, { id: 'pregnancy', label: 'Pregnancy', icon: Baby }, { id: 'fitness', label: 'Fitness', icon: Dumbbell }, { id: 'male', label: 'Male', icon: Flame }];
    return (
        <ViewContainer title={`${vendor} Menu`} showBack onBack={() => setCurrentView('vendors')}>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">{categories.map(cat => (<DietaryFilter key={cat.id} icon={cat.icon} label={cat.label} active={category === cat.id} onClick={() => setCategory(cat.id)} />))}</div>
            {items.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-gray-400"><Box className="w-16 h-16 mb-4 opacity-20" /><p>No items found.</p><p className="text-xs text-orange-500 mt-2">Tip: Add items in Manager Mode</p></div> : <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-24 scrollbar-hide">{items.map((item) => (<ProductCard key={item.id} item={item} addToCart={addToCart} isAdmin={false} />))}</div>}
        </ViewContainer>
    );
};

const AdminView = ({ setCurrentView, marketData, refreshData, user, setNotification }) => {
  const [activeTab, setActiveTab] = useState('products'); 
  const [adminOrders, setAdminOrders] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productFile, setProductFile] = useState(null);
  const [vendorLogoFile, setVendorLogoFile] = useState(null);

  const userEmail = user.email.toLowerCase();
  const isSuperAdmin = SUPER_ADMINS.map(e => e.toLowerCase()).includes(userEmail);
  const myVendorName = SUB_ADMINS[userEmail]; 

  const defaultLocation = isSuperAdmin ? "Irrua" : "Irrua"; 
  const defaultVendor = isSuperAdmin ? "" : myVendorName;

  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'fullMeal', desc: '', stock: 10, image: '', location: defaultLocation, vendor: defaultVendor });
  const filteredMarketData = isSuperAdmin ? marketData : marketData.filter(item => item.vendor === myVendorName);
  const audioRef = useRef(null);

  useEffect(() => {
    const q = isSuperAdmin ? collection(db, "orders") : query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const myOrders = isSuperAdmin ? allOrders : allOrders.filter(o => o.items.some(i => i.vendor === myVendorName));
        const previousCount = adminOrders.filter(o => o.status === 'pending').length;
        const newCount = myOrders.filter(o => o.status === 'pending').length;
        if (newCount > previousCount) {
             const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
             audio.play().catch(e => console.log("Audio blocked"));
             setNotification("🔔 New Order Received!");
             setTimeout(() => setNotification(null), 5000);
        }
        setAdminOrders(myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
    return () => unsubscribe();
  }, [isSuperAdmin, myVendorName]);

  const handleStatusUpdate = async (orderId, newStatus) => { if(confirm(`Mark as ${newStatus}?`)) { await updateOrderStatus(orderId, newStatus); }};
  const handleEditClick = (item) => { if (!isSuperAdmin && item.vendor !== myVendorName) return alert("Restricted!"); setNewItem(item); setEditId(item.id); setIsEditing(true); document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' }); };
  const handleCancelEdit = () => { setIsEditing(false); setEditId(null); setProductFile(null); setNewItem({ name: '', price: '', vendor: isSuperAdmin ? '' : myVendorName, category: 'fullMeal', desc: '', stock: 10, image: '', location: defaultLocation }); };
  
  const handleSubmit = async (e) => { 
      e.preventDefault(); setIsSubmitting(true); 
      let imageUrl = newItem.image || '🍽️'; 
      if(productFile) { imageUrl = await uploadImage(productFile, `products/${Date.now()}_${productFile.name}`); }
      
      const finalVendor = isSuperAdmin ? newItem.vendor : myVendorName; 
      const productPayload = { ...newItem, vendor: finalVendor, price: parseFloat(newItem.price), stock: parseInt(newItem.stock), imageUrl: imageUrl }; 
      if (isEditing) { await updateProduct(editId, productPayload); alert("Updated!"); } else { await addProduct(productPayload); alert("Added!"); } 
      handleCancelEdit(); await refreshData(); setIsSubmitting(false); 
  };
  const handleVendorLogoUpload = async () => {
      if(!vendorLogoFile || !myVendorName) return alert("Select a file first (Sub-admins only)");
      setIsSubmitting(true);
      await saveVendorLogo(myVendorName, vendorLogoFile);
      alert("Logo Updated!");
      setIsSubmitting(false);
      setVendorLogoFile(null);
  }
  const handleDelete = async (id) => { if (confirm("Delete?")) { await deleteProduct(id); await refreshData(); } };

  return (
    <ViewContainer title="Manager HQ" showBack onBack={() => setCurrentView('home')}>
      <div className="mb-4 p-3 bg-orange-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
          <div><p className="text-xs font-bold text-gray-500 uppercase">Logged in as</p><p className="font-bold text-orange-600">{isSuperAdmin ? "SUPER ADMIN" : `${myVendorName} ADMIN`}</p></div>
          {!isSuperAdmin && myVendorName && (
              <div className="flex gap-2 items-center"><label className="cursor-pointer bg-white p-2 rounded border border-gray-300"><input type="file" hidden onChange={e => setVendorLogoFile(e.target.files[0])} /><Upload className="w-4 h-4 text-gray-600" /></label>{vendorLogoFile && <button onClick={handleVendorLogoUpload} disabled={isSubmitting} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Save</button>}</div>
          )}
      </div>
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0"><button onClick={() => setActiveTab('products')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>Inventory</button>{(isSuperAdmin || myVendorName) && <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>Orders</button>}</div>
      <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        {activeTab === 'orders' && (
            <div className="space-y-4">{adminOrders.length === 0 ? <p className="text-center text-gray-400 mt-10">No orders found.</p> : adminOrders.map(order => (<div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"><div className="flex justify-between items-start mb-3"><div><span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.status.toUpperCase()}</span><p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black text-lg dark:text-white">₦{order.total.toLocaleString()}</p><p className="text-xs text-gray-500 uppercase">{order.paymentMethod}</p></div></div>{order.paymentMethod === 'transfer' && (<div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2 border border-blue-100 dark:border-blue-800"><p className="text-xs text-blue-800 dark:text-blue-200"><strong>Sender:</strong> {order.transferName}</p></div>)}<div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-2"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Delivery To:</p><p className="text-sm dark:text-gray-300 font-medium">{order.deliveryAddress}</p><p className="text-xs text-gray-500 mt-1">📞 {order.phone} | 🏛️ {order.landmark}</p></div><div className="text-xs text-gray-400 text-right mb-2">Fee: ₦{order.deliveryFee} included</div>{order.status === 'pending' && (<button onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold shadow hover:bg-green-700">Confirm Payment</button>)}{order.status === 'confirmed' && (<button onClick={() => handleStatusUpdate(order.id, 'delivered')} className="w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg text-sm font-bold">Mark Delivered</button>)}</div>))}</div>
        )}
        {activeTab === 'products' && (
            <>
            <div id="admin-form" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white">{isEditing ? 'Edit Item' : 'Add Item'}</h3>{isEditing && <button onClick={handleCancelEdit} className="text-xs text-red-500">Cancel</button>}</div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><input required placeholder="Name" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /><input required type="number" placeholder="Price (₦)" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
                
                {/* UPDATED VENDOR INPUT: DROPDOWN FOR SUPER ADMIN */}
                <div className="grid grid-cols-2 gap-4">
                    {isSuperAdmin ? (
                        <select className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-50 dark:bg-gray-700" value={newItem.vendor} onChange={e => setNewItem({...newItem, vendor: e.target.value})}>
                            <option value="">Select Vendor</option>
                            {(VENDORS_BY_LOCATION[newItem.location] || []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    ) : (
                        <input required placeholder="Vendor" disabled className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-200 dark:bg-gray-600" value={newItem.vendor} />
                    )}
                    <select className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option value="fullMeal">Meal</option><option value="fitness">Fitness</option><option value="pregnancy">Pregnancy</option><option value="period">Period</option><option value="male">Male</option><option value="normal">Normal</option></select>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl"><label className="text-xs text-gray-500 mb-1 block uppercase">Location</label>
                    {isSuperAdmin ? (
                        <div className="flex gap-2">{LOCATIONS.map(loc => (<button type="button" key={loc} onClick={() => setNewItem({...newItem, location: loc})} className={`flex-1 py-1 rounded text-xs font-bold ${newItem.location === loc ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{loc}</button>))}</div>
                    ) : (
                        <div className="text-sm font-bold dark:text-white">{newItem.location} (Locked)</div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3"><Box className="w-5 h-5 text-gray-500" /><input required type="number" placeholder="Stock" className="bg-transparent border-none w-full outline-none dark:text-white" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 relative">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setProductFile(e.target.files[0])} />
                        <span className="text-xs text-gray-400 ml-1 truncate">{productFile ? "Image Selected" : "Tap to Upload"}</span>
                    </div>
                </div>
                <textarea required placeholder="Description..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none h-20 resize-none dark:text-white" value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                <button disabled={isSubmitting} className="w-full bg-gray-900 dark:bg-orange-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? 'Uploading...' : 'Save Item'}</button>
            </form></div>
            <div className="space-y-3">{filteredMarketData.map(item => (<ProductCard key={item.id} item={item} isAdmin={true} onEdit={handleEditClick} onDelete={handleDelete} />))}</div>
            </>
        )}
      </div>
    </ViewContainer>
  );
};

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 relative animate-slide-up max-h-[85vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            <div className="text-center mb-6"><div className="inline-block p-3 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-3"><Package className="w-8 h-8 text-orange-500" /></div><h3 className="text-xl font-black text-gray-900 dark:text-white">Order Details</h3><p className="text-sm text-gray-500 font-mono">#{order.id.slice(0, 8)}</p></div>
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl"><span className="text-sm font-bold text-gray-500">Status</span><span className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{order.status}</span></div>
                <div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Items</h4><div className="space-y-2">{order.items.map((item, i) => (<div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl"><div className="flex items-center gap-3"><span className="text-xl">{item.image}</span><div><p className="font-bold text-sm text-gray-800 dark:text-white">{item.name}</p><p className="text-xs text-gray-500">{item.vendor}</p></div></div><span className="font-bold text-gray-800 dark:text-white">₦{item.price.toLocaleString()}</span></div>))}</div></div>
                <div className="space-y-2"><h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Delivery</h4><div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl space-y-3 text-sm text-gray-600 dark:text-gray-300"><div className="flex gap-3 items-start"><MapPin className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" /><div><p className="font-bold text-gray-900 dark:text-white">Address</p><p>{order.deliveryAddress}</p><p className="text-xs text-gray-400 mt-1">Landmark: {order.landmark || 'N/A'}</p></div></div><div className="flex gap-3 items-center border-t border-gray-200 dark:border-gray-700 pt-2"><div className="w-4 h-4 flex items-center justify-center">📞</div><span className="font-mono">{order.phone || 'N/A'}</span></div></div></div>
                <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 pt-4 space-y-2"><div className="flex justify-between text-sm text-gray-500"><span>Delivery Fee</span><span>₦{order.deliveryFee?.toLocaleString() || 0}</span></div><div className="flex justify-between text-xl font-black text-gray-900 dark:text-white"><span>Total Paid</span><span>₦{order.total.toLocaleString()}</span></div><div className="text-center mt-2"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Paid via {order.paymentMethod}</span></div></div>
            </div>
        </div>
    </div>
  );
};

const OrdersView = ({ setCurrentView, user }) => {
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

const WalletView = ({ setCurrentView, user, setGlobalWallet }) => {
  const [wallet, setWallet] = useState(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { const saved = localStorage.getItem(`eatai_wallet_${user.uid}`); if (saved) { const parsed = JSON.parse(saved); setWallet(parsed); setGlobalWallet(parsed); } }, [user]);
  const createWallet = async () => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const w = ethers.Wallet.createRandom();
        const wd = { address: w.address, privateKey: w.privateKey, mnemonic: w.mnemonic?.phrase };
        localStorage.setItem(`eatai_wallet_${user.uid}`, JSON.stringify(wd));
        await saveWalletToProfile(user.uid, w.address); setWallet(wd); setGlobalWallet(wd); setIsLoading(false);
      } catch(e) { console.error(e); }
    }, 1000);
  };
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert("Copied!"); };
  return (
    <ViewContainer title="Crypto Kitchen" showBack onBack={() => setCurrentView('home')}>
      <div className="flex flex-col items-center justify-center space-y-6 mt-10">
        {!wallet ? (
          <>
             <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center"><Wallet className="w-12 h-12 text-indigo-600" /></div>
             <p className="text-gray-500 text-center max-w-xs">Generate a secure wallet linked to {user.displayName}</p>
             <button onClick={createWallet} disabled={isLoading} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2">{isLoading ? <Sparkles className="animate-spin" /> : <Plus />} Generate Wallet</button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl"><p className="text-xs opacity-70">Address</p><code className="text-sm break-all">{wallet.address}</code></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-500">Private Key</label><div className="relative"><div className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs break-all ${!showPrivate?'blur-sm':''}`}>{wallet.privateKey}</div><button onClick={()=>setShowPrivate(!showPrivate)} className="absolute top-2 right-2"><Eye className="w-4 h-4" /></button></div></div>
          </div>
        )}
      </div>
    </ViewContainer>
  );
};

const DeciderView = ({ ingredients, setIngredients, generateRecipes, isThinking, aiRecipe, setCurrentView, activeFilters, toggleFilter }) => (
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

const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess, city }) => {
  if (!isOpen) return null;
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryArea: '' });
  const deliveryFee = calculateDeliveryFee(city, form.deliveryArea);
  const grandTotal = total + deliveryFee;

  const paystackConfig = { reference: (new Date()).getTime().toString(), email: user.email, amount: grandTotal * 100, publicKey: PAYSTACK_KEY };
  const handlePaystackSuccess = (reference) => { handlePayment("paystack"); };

  const handlePayment = async (method = paymentMethod) => {
    if (!form.address || !form.phone || !form.deliveryArea) return alert("Delivery details required");
    setProcessing(true);
    if (method !== 'paystack') await new Promise(r => setTimeout(r, 1500));
    try {
        await createOrder(user.uid, cart, grandTotal, method, globalWallet?.address, form.address, "Paystack Online", form.phone, form.landmark, deliveryFee, method === 'paystack' ? 'confirmed' : 'pending');
        setProcessing(false); onSuccess();
    } catch (e) { setProcessing(false); alert("Error placing order"); }
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
            {paymentMethod === 'paystack' ? ( form.address && form.phone ? <PaystackButton {...paystackConfig} text="Pay Now" onSuccess={handlePaystackSuccess} onClose={() => alert("Payment Cancelled")} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg" /> : <button disabled className="w-full mt-4 bg-gray-400 text-white font-bold py-4 rounded-xl cursor-not-allowed">Enter Delivery Details</button>) : (<button onClick={() => handlePayment()} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Confirm Crypto Transfer'}</button>)}
        </div>
    </div>
  );
};

const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city }) => {
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

// --- MAIN APP COMPONENT ---

export default function EatAi() {
  const [currentView, setCurrentView] = useState(localStorage.getItem('eatai_view') || 'home');
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
  const [city, setCity] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [cart, setCart] = useState(() => { const saved = localStorage.getItem('eatai_cart'); return saved ? JSON.parse(saved) : []; });
  const [darkMode, setDarkMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [notification, setNotification] = useState(null);
  const [vendorLogos, setVendorLogos] = useState({});

  const currentEmail = user?.email?.toLowerCase();
  const isAdmin = user && (SUPER_ADMINS.map(e=>e.toLowerCase()).includes(currentEmail) || Object.keys(SUB_ADMINS).includes(currentEmail));
  const isLogistics = user && LOGISTICS_EMAILS.includes(currentEmail);

  useEffect(() => { localStorage.setItem('eatai_view', currentView); }, [currentView]);
  useEffect(() => { const u = onAuthStateChanged(auth, (c) => { setUser(c); if(c) { const w = localStorage.getItem(`eatai_wallet_${c.uid}`); if(w) setGlobalWallet(JSON.parse(w)); } setAuthLoading(false); }); return () => u(); }, []);
  useEffect(() => { getAllProducts().then(p => { setMarketData(p); setLoadingData(false); }); }, []);
  useEffect(() => { localStorage.setItem('eatai_cart', JSON.stringify(cart)); }, [cart]);
  
  useEffect(() => {
      const fetchLogos = async () => {
          try {
            const { getVendorLogos } = await import('./firebase');
            if(getVendorLogos) {
                const logos = await getVendorLogos();
                setVendorLogos(logos);
            }
          } catch(e) { console.log("Logos not ready"); }
      }
      fetchLogos();
  }, []);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleFilter = (f) => { setActiveFilters(activeFilters.includes(f) ? activeFilters.filter(x => x !== f) : [...activeFilters, f]); };

  const generateRecipes = async () => {
    if (!ingredients.trim()) return;
    setIsThinking(true); setAiRecipe(null);
    const diet = activeFilters.length ? `Diet: ${activeFilters.join(', ')}` : '';
    const prompt = `Chef mode. Ingredients: ${ingredients}. ${diet}. 2 Recipes. Format: Title, Ingredients, Steps. No markdown.`;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await res.json();
        setAiRecipe(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch(e) { setAiRecipe("Chef is busy. Try again."); } finally { setIsThinking(false); }
  };

  const addToCart = (item) => {
    setCart([...cart, { ...item, cartId: Date.now() }]);
    setNotification(`Added ${item.name} to cart!`);
    setTimeout(() => setNotification(null), 2000);
  };
  
  const removeFromCart = (id) => setCart(cart.filter(i => i.cartId !== id));
  const cartTotal = cart.reduce((s, i) => s + i.price, 0).toFixed(2);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <div className={darkMode ? "dark" : ""}><div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans transition-colors duration-300"><div className="flex justify-end p-4"><button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full text-gray-600 dark:text-yellow-400">{darkMode ? <Sun /> : <Moon />}</button></div><LoginView /></div></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white relative overflow-hidden">
        
        {notification && <Toast message={notification} />}

        <CartOverlay cart={cart} setCart={setCart} currentView={currentView} setCurrentView={setCurrentView} marketSection={marketSection} removeFromCart={removeFromCart} cartTotal={Number(cartTotal)} globalWallet={globalWallet} user={user} city={city} />
        
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 transition-colors">
            <div className="text-2xl font-black text-orange-500 cursor-pointer" onClick={() => setCurrentView('home')}>EatAi</div>
            <div className="flex items-center space-x-6">
                <button onClick={() => setCurrentView('decider')}>AI Chef</button>
                <button onClick={() => setCurrentView('location')}>Market</button>
                <button onClick={() => setCurrentView('orders')}>Orders</button>
                <button onClick={() => setCurrentView('wallet')}>Crypto</button>
                <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun /> : <Moon />}</button>
                <button onClick={() => setCurrentView('cart')} className="relative"><ShoppingCart />{cart.length > 0 && <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">{cart.length}</span>}</button>
                <button onClick={logout}><LogOut /></button>
            </div>
        </header>

        <div className="md:hidden flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-900 sticky top-0 z-30 shadow-sm">
            <div className="text-xl font-black text-orange-500" onClick={() => setCurrentView('home')}>EatAi</div>
            <div className="flex items-center gap-3"><button onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun /> : <Moon />}</button><button onClick={logout}><LogOut /></button></div>
        </div>

        <main className="h-[calc(100vh-140px)] md:h-[calc(100vh-72px)] overflow-hidden">
            {currentView === 'home' && <HomeView setCurrentView={setCurrentView} user={user} />}
            {currentView === 'location' && <LocationSelectionView setCity={setCity} setCurrentView={setCurrentView} />}
            {currentView === 'vendors' && <VendorSelectionView city={city} setVendor={setVendor} setCurrentView={setCurrentView} vendorLogos={vendorLogos} />}
            {currentView === 'wallet' && <WalletView setCurrentView={setCurrentView} user={user} setGlobalWallet={setGlobalWallet} />}
            {currentView === 'orders' && <OrdersView setCurrentView={setCurrentView} user={user} />}
            {currentView === 'admin' && isAdmin && <AdminView setCurrentView={setCurrentView} marketData={marketData} refreshData={async () => setMarketData(await getAllProducts())} user={user} setNotification={setNotification} />}
            {currentView === 'logistics' && isLogistics && <LogisticsView setCurrentView={setCurrentView} user={user} setNotification={setNotification} />}
            {currentView === 'decider' && <DeciderView ingredients={ingredients} setIngredients={setIngredients} generateRecipes={generateRecipes} isThinking={isThinking} aiRecipe={aiRecipe} setCurrentView={setCurrentView} activeFilters={activeFilters} toggleFilter={toggleFilter} />}
            {currentView === 'market' && <MarketView marketSection={marketSection} setMarketSection={setMarketSection} cravingsType={cravingsType} setCravingsType={setCravingsType} setCurrentView={setCurrentView} addToCart={addToCart} marketData={marketData} loadingData={loadingData} city={city} vendor={vendor} />}
        </main>

        {currentView === 'home' && isAdmin && (
             <div className="fixed bottom-24 left-6 z-50"><button onClick={() => setCurrentView('admin')} className="bg-gray-900 text-white font-bold text-sm px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-gray-700"><Database className="w-4 h-4" /> Manager Mode</button></div>
        )}

        {currentView === 'home' && isLogistics && (
             <div className="fixed bottom-24 right-6 z-50"><button onClick={() => setCurrentView('logistics')} className="bg-purple-900 text-white font-bold text-sm px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-purple-700"><Bike className="w-4 h-4" /> Logistics Hub</button></div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-around items-center md:hidden z-40 safe-area-pb transition-colors">
            <button onClick={() => setCurrentView('home')} className="flex flex-col items-center"><Home /><span className="text-xs">Home</span></button>
            <button onClick={() => setCurrentView('wallet')} className="flex flex-col items-center"><Wallet /><span className="text-xs">Crypto</span></button>
            <button onClick={() => setCurrentView('decider')} className="flex flex-col items-center"><ChefHat /><span className="text-xs">Chef</span></button>
            <button onClick={() => setCurrentView('location')} className="flex flex-col items-center"><Search /><span className="text-xs">Market</span></button>
            <button onClick={() => setCurrentView('cart')} className="flex flex-col items-center relative"><ShoppingCart />{cart.length > 0 && <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">{cart.length}</span>}<span className="text-xs">Cart</span></button>
        </nav>
        <style>{`.safe-area-pb { padding-bottom: env(safe-area-inset-bottom); } .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes bounce { 0%, 100% { transform: translateY(-5%); } 50% { transform: translateY(0); } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.5s ease-out; } .animate-slide-up { animation: slideUp 0.5s ease-out; } .animate-bounce { animation: bounce 2s infinite; }`}</style>
      </div>
    </div>
  );
}