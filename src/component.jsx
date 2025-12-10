import React, { useState, useEffect } from 'react';
import { 
  ChefHat, ShoppingBag, ArrowLeft, Sparkles, ShoppingCart, Heart, Flame, 
  Baby, Droplet, Plus, Minus, X, Moon, Sun, Leaf, Beef, Zap, Cookie, 
  Wallet, Copy, Eye, EyeOff, CreditCard, Package, Clock, CheckCircle, 
  Lock, Database, Trash2, Smile, Box, Landmark, MapPin, ShieldCheck, 
  Edit, Info, ChevronDown, ChevronUp, Dumbbell
} from 'lucide-react';
import { ethers } from 'ethers';
import { 
  saveWalletToProfile, createOrder, getUserOrders, getAllOrders, 
  updateOrderStatus, addProduct, deleteProduct, updateProduct, signInWithGoogle 
} from './firebase';

// --- CONFIGURATION ---
const BANK_DETAILS = { bank: "OPay", number: "8012345678", name: "EatAi Ventures" };
const LOCATIONS = ["Irrua", "Ekpoma", "Uromi"];

// --- HELPERS ---
export const calculateDeliveryFee = (origin, destination) => {
    if (!destination) return 0;
    if (origin === 'Irrua') return destination === 'Irrua' ? 1000 : (destination === 'Ekpoma' ? 2000 : 2500);
    if (origin === 'Ekpoma') return destination === 'Irrua' ? 2000 : (destination === 'Ekpoma' ? 1500 : 2000);
    if (origin === 'Uromi') return destination === 'Uromi' ? 1000 : 3000; 
    return 2000; 
};

export const ViewContainer = ({ children, title, showBack, onBack }) => (
  <div className="p-6 max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
    <div className="flex items-center justify-between mb-6 shrink-0">
      <div className="flex items-center">
        {showBack && <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2 transition-colors"><ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" /></button>}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
    </div>
    {children}
  </div>
);

export const DietaryFilter = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300'}`}>
    <Icon className="w-4 h-4" /><span>{label}</span>
  </button>
);

export const ProductCard = ({ item, addToCart, isAdmin, onDelete, onEdit }) => {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden">{item.image}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-800 dark:text-white truncate pr-2">{item.name}</h4>
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

export const LoginView = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
    <div className="w-32 h-32 bg-orange-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-8 animate-bounce"><ChefHat className="w-16 h-16 text-orange-500" /></div>
    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">EatAi</h1>
    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">Your personal AI Chef and Cravings Market.</p>
    <button onClick={signInWithGoogle} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-3 shadow-lg">Sign in with Google</button>
  </div>
);

export const HomeView = ({ setCurrentView, user }) => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in p-6">
      <div className="text-center space-y-2"><h1 className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">EatAi</h1><p className="text-gray-500 dark:text-gray-400 text-lg">Welcome back, {user?.displayName?.split(' ')[0]}!</p><div className="grid grid-cols-1 gap-4 w-full max-w-md pt-4"><button onClick={() => setCurrentView('orders')} className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-orange-200 transition-all"><Package className="w-5 h-5 text-orange-500" />View My Orders</button></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
        <button onClick={() => setCurrentView('decider')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-orange-100 dark:border-gray-700 hover:border-orange-300 transition-all transform hover:-translate-y-1"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ChefHat className="w-12 h-12 text-orange-500 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">AI Chef</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Generate recipes.</p></button>
        <button onClick={() => setCurrentView('location')} className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-green-100 dark:border-gray-700 hover:border-green-300 transition-all transform hover:-translate-y-1"><div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" /><ShoppingBag className="w-12 h-12 text-green-600 dark:text-green-400 mb-4 relative z-10" /><h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">Market</h3><p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Meals & cravings.</p></button>
      </div>
    </div>
);

export const LocationSelectionView = ({ setCity, setCurrentView }) => (
    <ViewContainer title="Select Location" showBack onBack={() => setCurrentView('home')}>
        <div className="grid grid-cols-1 gap-4 mt-4">
            {LOCATIONS.map((loc) => (
                <button key={loc} onClick={() => { setCity(loc); setCurrentView('market'); }} className="p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-between hover:scale-[1.02] transition-transform shadow-sm">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-2xl">📍</div><div className="text-left"><h3 className="text-xl font-bold text-gray-800 dark:text-white">{loc}</h3><p className="text-sm text-gray-500 dark:text-gray-400">Find food in {loc}</p></div></div><ArrowLeft className="w-6 h-6 text-orange-500 rotate-180" />
                </button>
            ))}
        </div>
    </ViewContainer>
);

export const AdminView = ({ setCurrentView, marketData, refreshData }) => {
  const [activeTab, setActiveTab] = useState('orders'); 
  const [adminOrders, setAdminOrders] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', vendor: '', category: 'fullMeal', desc: '', stock: 10, image: '', location: 'Irrua' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (activeTab === 'orders') getAllOrders().then(setAdminOrders); }, [activeTab]);
  const handleStatusUpdate = async (orderId, newStatus) => { if(confirm(`Mark order as ${newStatus}?`)) { await updateOrderStatus(orderId, newStatus); setAdminOrders(adminOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o)); }};
  const handleSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true); let imageIcon = newItem.image || '🍽️'; 
    const productPayload = { ...newItem, price: parseFloat(newItem.price), stock: parseInt(newItem.stock), image: imageIcon };
    if (isEditing) { await updateProduct(editId, productPayload); alert("Updated!"); } else { await addProduct(productPayload); alert("Added!"); }
    setIsEditing(false); setEditId(null); setNewItem({ name: '', price: '', vendor: '', category: 'fullMeal', desc: '', stock: 10, image: '', location: 'Irrua' }); await refreshData(); setIsSubmitting(false);
  };
  const handleEditClick = (item) => { setNewItem(item); setEditId(item.id); setIsEditing(true); document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' }); };
  const handleCancelEdit = () => { setIsEditing(false); setEditId(null); setNewItem({ name: '', price: '', vendor: '', category: 'fullMeal', desc: '', stock: 10, image: '', location: 'Irrua' }); };
  const handleDelete = async (id) => { if (confirm("Delete?")) { await deleteProduct(id); await refreshData(); } };

  return (
    <ViewContainer title="Manager HQ" showBack onBack={() => setCurrentView('home')}>
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
        <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>Incoming Orders</button>
        <button onClick={() => setActiveTab('products')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>Inventory</button>
      </div>
      <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        {activeTab === 'orders' && (
            <div className="space-y-4">{adminOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-3"><div><span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.status.toUpperCase()}</span><p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black text-lg dark:text-white">₦{order.total.toLocaleString()}</p><p className="text-xs text-gray-500 uppercase">{order.paymentMethod}</p></div></div>
                    {order.paymentMethod === 'transfer' && (<div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2 border border-blue-100 dark:border-blue-800"><p className="text-xs text-blue-800 dark:text-blue-200"><strong>Sender:</strong> {order.transferName}</p></div>)}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-2"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Delivery To:</p><p className="text-sm dark:text-gray-300 font-medium">{order.deliveryAddress}</p><p className="text-xs text-gray-500 mt-1">📞 {order.phone} | 🏛️ {order.landmark}</p></div>
                    <div className="border-t dark:border-gray-700 pt-2 mb-4">{order.items.map((item, i) => (<div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1"><span>1x {item.name} ({item.vendor})</span><span>₦{item.price}</span></div>))}</div>
                    <div className="text-xs text-gray-400 text-right mb-2">Fee: ₦{order.deliveryFee} included</div>
                    {order.status === 'pending' && (<button onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold shadow hover:bg-green-700">Confirm Payment</button>)}
                    {order.status === 'confirmed' && (<button onClick={() => handleStatusUpdate(order.id, 'delivered')} className="w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg text-sm font-bold">Mark Delivered</button>)}
                </div>))}</div>
        )}
        {activeTab === 'products' && (
            <>
            <div id="admin-form" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white">{isEditing ? 'Edit Item' : 'Add Item'}</h3>{isEditing && <button onClick={handleCancelEdit} className="text-xs text-red-500">Cancel</button>}</div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4"><input required placeholder="Name" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /><input required type="number" placeholder="Price (₦)" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4"><input required placeholder="Vendor" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.vendor} onChange={e => setNewItem({...newItem, vendor: e.target.value})} /><select className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option value="fullMeal">Meal</option><option value="fitness">Fitness</option><option value="pregnancy">Pregnancy</option><option value="period">Period</option><option value="male">Male</option><option value="normal">Normal</option></select></div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl"><label className="text-xs text-gray-500 mb-1 block uppercase">Location</label><div className="flex gap-2">{LOCATIONS.map(loc => (<button type="button" key={loc} onClick={() => setNewItem({...newItem, location: loc})} className={`flex-1 py-1 rounded text-xs font-bold ${newItem.location === loc ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{loc}</button>))}</div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3"><Box className="w-5 h-5 text-gray-500" /><input required type="number" placeholder="Stock" className="bg-transparent border-none w-full outline-none dark:text-white" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div><div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3"><Smile className="w-5 h-5 text-gray-500" /><input placeholder="Emoji" className="bg-transparent border-none w-full outline-none dark:text-white" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} /></div></div>
                  <textarea required placeholder="Description..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none h-20 resize-none dark:text-white" value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                  <button disabled={isSubmitting} className="w-full bg-gray-900 dark:bg-orange-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? 'Saving...' : 'Save Item'}</button>
                </form>
            </div>
            <div className="space-y-3">{marketData.map(item => (<ProductCard key={item.id} item={item} isAdmin={true} onEdit={handleEditClick} onDelete={handleDelete} />))}</div>
            </>
        )}
      </div>
    </ViewContainer>
  );
};

export const OrdersView = ({ setCurrentView, user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getUserOrders(user.uid).then(setOrders).finally(() => setLoading(false)); }, [user]);
  return (
    <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
      {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div> : orders.length === 0 ? <div className="text-center mt-10 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No orders yet.</p></div> : <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-4">{orders.map(order => (<div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"><div className="flex justify-between mb-2"><span className={`text-xs px-2 py-1 rounded-full font-bold ${order.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{order.status.toUpperCase()}</span><span className="text-xs text-gray-400">#{order.id.slice(0,6)}</span></div><div className="flex justify-between"><p className="font-bold dark:text-white">{order.items.length} Items</p><p className="font-black text-orange-500">₦{order.total.toLocaleString()}</p></div><p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p></div>))}</div>}
    </ViewContainer>
  );
};

export const WalletView = ({ setCurrentView, user, setGlobalWallet }) => {
  const [wallet, setWallet] = useState(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => { const saved = localStorage.getItem(`eatai_wallet_${user.uid}`); if (saved) { const parsed = JSON.parse(saved); setWallet(parsed); setGlobalWallet(parsed); } }, [user]);
  const createWallet = async () => {
    setIsLoading(true);
    setTimeout(async () => {
      const w = ethers.Wallet.createRandom();
      const wd = { address: w.address, privateKey: w.privateKey, mnemonic: w.mnemonic?.phrase };
      localStorage.setItem(`eatai_wallet_${user.uid}`, JSON.stringify(wd));
      await saveWalletToProfile(user.uid, w.address); setWallet(wd); setGlobalWallet(wd); setIsLoading(false);
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

export const MarketView = ({ marketSection, setMarketSection, cravingsType, setCravingsType, setCurrentView, addToCart, marketData, loadingData, city }) => {
    if (loadingData) return <div className="flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;
    const cityProducts = marketData.filter(p => p.location === city || !p.location);
    if (!cityProducts || cityProducts.length === 0) return <ViewContainer title={`${city || 'Market'} Area`} showBack onBack={() => setCurrentView('location')}><div className="text-center mt-20"><p className="text-gray-500 mb-4">No vendors here yet.</p></div></ViewContainer>;
    if (!marketSection) return <ViewContainer title="The Market" showBack onBack={() => setCurrentView('location')}><div className="space-y-4"><button onClick={() => setMarketSection('fullMeal')} className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-400 to-red-500 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"><div className="relative z-10 text-white"><h3 className="text-3xl font-black">Full Meals</h3><p className="opacity-90">Hearty dinners</p></div><span className="absolute bottom-2 right-2 text-6xl opacity-20">🍱</span></button><button onClick={() => { setMarketSection('cravings'); setCravingsType(null); }} className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"><div className="relative z-10 text-white"><h3 className="text-3xl font-black">Cravings</h3><p className="opacity-90">For specific moments</p></div><span className="absolute bottom-2 right-2 text-6xl opacity-20">🍫</span></button></div></ViewContainer>;
    if (marketSection === 'cravings' && !cravingsType) {
      const cravingOptions = [{ id: 'pregnancy', label: 'Pregnancy', icon: Baby, color: 'bg-pink-100 text-pink-600' }, { id: 'period', label: 'Period', icon: Droplet, color: 'bg-red-100 text-red-600' }, { id: 'normal', label: 'Normal', icon: Heart, color: 'bg-blue-100 text-blue-600' }, { id: 'male', label: 'Male', icon: Flame, color: 'bg-slate-800 text-white' }, { id: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'bg-emerald-800 text-white' }];
      return <ViewContainer title="What are you craving?" showBack onBack={() => setMarketSection(null)}><div className="grid grid-cols-2 gap-4">{cravingOptions.map((opt) => (<button key={opt.id} onClick={() => setCravingsType(opt.id)} className={`flex flex-col items-center justify-center p-6 rounded-3xl ${opt.color} h-40 shadow-sm hover:shadow-md transition-all`}><opt.icon className="w-10 h-10 mb-3" /><span className="font-bold text-lg">{opt.label}</span></button>))}</div></ViewContainer>;
    }
    const products = marketSection === 'fullMeal' ? cityProducts.filter(p => p.category === 'fullMeal') : cityProducts.filter(p => p.category === cravingsType);
    const title = marketSection === 'fullMeal' ? 'Full Meals' : `${cravingsType.charAt(0).toUpperCase() + cravingsType.slice(1)} Cravings`;
    return <ViewContainer title={title} showBack onBack={() => marketSection === 'cravings' ? setCravingsType(null) : setMarketSection(null)}>{products.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-gray-400"><Box className="w-16 h-16 mb-4 opacity-20" /><p>No items found.</p></div> : <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-24 scrollbar-hide">{products.map((item) => (<ProductCard key={item.id} item={item} addToCart={addToCart} isAdmin={false} />))}</div>}</ViewContainer>;
};

export const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess, city }) => {
  if (!isOpen) return null;
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryArea: '' });
  const deliveryFee = calculateDeliveryFee(city, form.deliveryArea);
  const grandTotal = total + deliveryFee;

  const handlePayment = async () => {
    if (!form.address || !form.phone || !form.deliveryArea) return alert("Delivery details required");
    if (paymentMethod === 'transfer' && !form.transferName) return alert("Sender name required");
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    await createOrder(user.uid, cart, grandTotal, paymentMethod, globalWallet?.address, form.address, form.transferName, form.phone, form.landmark, deliveryFee);
    setProcessing(false); onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-center mb-4 dark:text-white">Complete Order</h3>
            <div className="space-y-3">
                {paymentMethod === 'transfer' && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center"><p className="text-xs text-blue-600 font-bold">PAY TO:</p><p className="text-xl font-black text-gray-800">{BANK_DETAILS.bank}</p><p className="text-2xl font-mono text-blue-600 my-1">{BANK_DETAILS.number}</p><p className="text-sm text-gray-600">{BANK_DETAILS.name}</p></div>
                )}
                {paymentMethod === 'crypto' && (
                    <div className="text-center bg-indigo-50 p-4 rounded-xl"><p className="text-xs text-indigo-600">Paying with linked wallet</p><p className="font-mono text-xs mt-1 truncate">{globalWallet?.address}</p></div>
                )}
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                    <div><label className="text-xs font-bold text-gray-500">Delivery Area</label>
                    <select className="w-full bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 dark:text-white" value={form.deliveryArea} onChange={e => setForm({...form, deliveryArea: e.target.value})}>
                        <option value="">Select...</option>{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    {form.deliveryArea && <p className="text-xs text-orange-500 mt-1">Delivery: ₦{deliveryFee}</p>}</div>
                    <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Street" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="text-xs font-bold text-gray-500">Phone</label><input type="tel" className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="080..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                        <div className="flex-1"><label className="text-xs font-bold text-gray-500">Landmark</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Near..." value={form.landmark} onChange={e => setForm({...form, landmark: e.target.value})} /></div>
                    </div>
                    {paymentMethod === 'transfer' && <div><label className="text-xs font-bold text-gray-500">Sender Name</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="For confirmation" value={form.transferName} onChange={e => setForm({...form, transferName: e.target.value})} /></div>}
                </div>
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700"><div className="text-sm text-gray-500">Total (+Del):</div><div className="text-2xl font-black text-green-600">₦{grandTotal.toLocaleString()}</div></div>
            <button onClick={handlePayment} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : (paymentMethod === 'transfer' ? 'I Have Sent Money' : 'Confirm Order')}</button>
        </div>
    </div>
  );
};

export const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city }) => {
  const [paymentMethod, setPaymentMethod] = useState('transfer');
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
                <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'transfer' ? 'bg-white shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}><Landmark className="w-4 h-4" /> Transfer</button>
                <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'card' ? 'bg-white shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}><CreditCard className="w-4 h-4" /> Card</button>
                <button onClick={() => setPaymentMethod('crypto')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${paymentMethod === 'crypto' ? 'bg-indigo-500 text-white shadow' : 'text-gray-500'}`}><Wallet className="w-4 h-4" /> Crypto</button>
            </div>
        )}
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-2xl font-black dark:text-white">₦{cartTotal.toLocaleString()}</span></div>
        <button onClick={() => {if(paymentMethod==='crypto' && !globalWallet) return alert("Create wallet first"); setShowModal(true);}} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">Checkout</button>
      </div>
    </div>
  </div>
  </>
  );
};
