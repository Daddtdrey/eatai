import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Bell, CheckCircle, Power, PowerOff, Info, ChevronUp, ChevronDown, 
  Edit, Trash2, Plus, Package, MapPin, Store, X, Minus, Ban
} from 'lucide-react';

// --- TOAST NOTIFICATION ---
export const Toast = ({ message, type = 'success' }) => {
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce transition-all duration-300 pointer-events-none w-max max-w-[90%]">
      <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700 ${type === 'alert' ? 'bg-orange-600 text-white' : 'bg-gray-900 text-white'}`}>
        <div className={`rounded-full p-1 ${type === 'alert' ? 'bg-white/20' : 'bg-green-500'}`}>
            {type === 'alert' ? <Bell className="w-4 h-4 text-white" /> : <CheckCircle className="w-4 h-4 text-white" />}
        </div>
        <span className="font-bold text-sm truncate">{message}</span>
      </div>
    </div>
  );
};

// --- WAKE LOCK TOGGLE ---
export const WakeLockToggle = () => {
    const [isLocked, setIsLocked] = useState(false);
    const wakeLockRef = useRef(null);
    const toggleLock = async () => {
        if (isLocked) { if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; } setIsLocked(false); } 
        else { try { if ('wakeLock' in navigator) { wakeLockRef.current = await navigator.wakeLock.request('screen'); setIsLocked(true); } } catch (err) { console.error(err); } }
    };
    return (
        <button onClick={toggleLock} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-all ${isLocked ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{isLocked ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}{isLocked ? "ON" : "OFF"}</button>
    );
};

// --- MAIN LAYOUT CONTAINER ---
export const ViewContainer = ({ children, title, showBack, onBack, actions }) => (
  <div className="p-4 md:p-6 w-full max-w-5xl mx-auto h-full flex flex-col animate-fade-in bg-white dark:bg-gray-900 md:shadow-xl md:my-4 md:rounded-2xl border-x border-gray-100 dark:border-gray-800">
    <div className="flex items-center justify-between mb-6 shrink-0">
      <div className="flex items-center">
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
      {actions}
    </div>
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {children}
    </div>
  </div>
);

// --- DIETARY FILTER PILL ---
export const DietaryFilter = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300'}`}>
    {Icon && <Icon className="w-3 h-3" />}<span>{label}</span>
  </button>
);

// --- 🟢 UPDATED PRODUCT CARD (STOCK LOGIC) ---
export const ProductCard = ({ item, addToCart, isAdmin, onDelete, onEdit }) => {
  const [showDesc, setShowDesc] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Safe stock handling (default to 0 if undefined)
  const stock = item.stock || 0;
  const isSoldOut = stock === 0;
  const isLowStock = stock > 0 && stock < 10;

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-xl border transition-all hover:shadow-md overflow-hidden ${isSoldOut ? 'border-gray-200 dark:border-gray-700 opacity-80 grayscale-[0.5]' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-start gap-4">
        {/* IMAGE */}
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden relative border border-gray-100 dark:border-gray-600">
            {item.imageUrl && !imgError ? ( <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={() => setImgError(true)} /> ) : ( <span>{item.image || '🍽️'}</span> )}
            
            {/* OVERLAY BADGE FOR SOLD OUT */}
            {isSoldOut && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-red-600 px-2 py-1 rounded-sm rotate-12">Sold Out</span>
                </div>
            )}
        </div>
        
        {/* CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[6rem]">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base leading-snug line-clamp-2">{item.name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
                 <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded">{item.vendor}</span>
                 
                 {/* 🟢 DYNAMIC STOCK BADGES */}
                 {isSoldOut ? (
                     <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">0 Left</span>
                 ) : isLowStock ? (
                     <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold animate-pulse">Only {stock} Left!</span>
                 ) : (
                     <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded font-bold">{stock} Available</span>
                 )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className={`text-lg font-black ${isSoldOut ? 'text-gray-400 decoration-line-through' : 'text-orange-600 dark:text-orange-400'}`}>₦{item.price.toLocaleString()}</div>
            
            {isAdmin ? (
                <div className="flex gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
            ) : (
                <button 
                    onClick={() => addToCart(item)} 
                    disabled={isSoldOut} 
                    className={`p-2 px-4 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center ${isSoldOut ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'}`}
                >
                    {isSoldOut ? <Ban className="w-5 h-5"/> : <Plus className="w-5 h-5" />}
                </button>
            )}
          </div>
        </div>
      </div>
      
      {/* DETAILS DROPDOWN */}
      <div className="mt-3 border-t border-dashed border-gray-200 dark:border-gray-700 pt-2">
        <button onClick={() => setShowDesc(!showDesc)} className="flex items-center justify-between w-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors py-1"><span className="flex items-center gap-1"><Info className="w-3 h-3" /> {showDesc ? 'Hide Details' : 'View Details'}</span>{showDesc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>
        {showDesc && <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg animate-fade-in leading-relaxed">{item.desc || "No additional description available for this item."}</div>}
      </div>
    </div>
  );
};

// --- ORDER DETAIL MODAL ---
export const OrderDetailModal = ({ order, onClose }) => {
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