import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Bell, CheckCircle, Power, PowerOff, Info, ChevronUp, ChevronDown, 
  Edit, Trash2, Plus, Package, MapPin, Store, X, Minus, Ban, ShoppingBag, BellRing
} from 'lucide-react';

// --- TOAST ---
export const Toast = ({ message, type = 'success' }) => {
  if (!message) return null;
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce w-max max-w-[90%]">
      <div className={`px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border-2 ${
        type === 'alert' 
          ? 'bg-red-500 border-red-600 text-white' 
          : 'bg-orange-500 border-orange-600 text-white'
      }`}>
        <div className="rounded-full p-1 bg-white/20">
            {type === 'alert' ? <Bell className="w-4 h-4 text-white" /> : <CheckCircle className="w-4 h-4 text-white" />}
        </div>
        <span className="font-bold text-sm tracking-wide font-[Fredoka]">{message}</span>
      </div>
    </div>
  );
};

// --- WAKE LOCK ---
export const WakeLockToggle = () => {
    const [isLocked, setIsLocked] = useState(false);
    const wakeLockRef = useRef(null);
    const toggleLock = async () => {
        if (isLocked) { if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; } setIsLocked(false); } 
        else { try { if ('wakeLock' in navigator) { wakeLockRef.current = await navigator.wakeLock.request('screen'); setIsLocked(true); } } catch (err) { console.error(err); } }
    };
    return (
        <button onClick={toggleLock} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
            isLocked 
            ? 'bg-orange-100 text-orange-800 border-orange-200' 
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
            {isLocked ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
            {isLocked ? "Screen ON" : "Screen OFF"}
        </button>
    );
};

// --- MAIN LAYOUT ---
export const ViewContainer = ({ children, title, showBack, onBack, actions }) => (
  <div className="p-4 md:p-6 w-full max-w-5xl mx-auto h-full flex flex-col animate-fade-in bg-white dark:bg-gray-950 md:shadow-2xl md:my-4 md:rounded-3xl border-x border-gray-50 dark:border-gray-900">
    <div className="flex items-center justify-between mb-6 shrink-0 pt-2">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="p-3 bg-orange-50 hover:bg-orange-100 dark:bg-gray-800 rounded-2xl transition-all active:scale-90 border border-orange-100 dark:border-gray-700">
            <ArrowLeft className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </button>
        )}
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight font-[Fredoka]">{title}</h2>
      </div>
      {actions}
    </div>
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden pb-24">
        {children}
    </div>
  </div>
);

// --- PILL FILTER ---
export const DietaryFilter = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border-2 whitespace-nowrap active:scale-95 ${
      active 
      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' 
      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-orange-200'
  }`}>
    {Icon && <Icon className="w-4 h-4" />}<span>{label}</span>
  </button>
);

// --- 🍊 ORANGE PRODUCT CARD ---
export const ProductCard = ({ item, addToCart, isAdmin, onDelete, onEdit, onNotify }) => {
  const [showDesc, setShowDesc] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const stock = item.stock || 0;
  const isSoldOut = stock === 0;
  const isLowStock = stock > 0 && stock < 10;

  return (
    <div className={`relative bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-50 dark:border-gray-800 p-3 flex gap-4 transition-all active:scale-[0.99] ${isSoldOut ? 'opacity-75' : ''}`}>
      
      {/* IMAGE */}
      <div className="w-28 h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shrink-0 relative shadow-inner">
         {item.imageUrl && !imgError ? ( 
            <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${isSoldOut ? 'grayscale' : ''}`} onError={() => setImgError(true)} /> 
         ) : ( 
            <div className="flex items-center justify-center h-full text-4xl"><span>{item.image || '🥘'}</span></div>
         )}
         
         {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-[10px] font-black uppercase bg-red-500 px-2 py-1 rounded-lg transform -rotate-12">Sold Out</span>
            </div>
         )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight line-clamp-2 font-[Fredoka]">{item.name}</h4>
                
                {/* 🔔 NOTIFY BUTTON (For Customers) */}
                {isSoldOut && !isAdmin && (
                    <button onClick={() => onNotify(item)} className="p-2 bg-orange-100 dark:bg-gray-800 rounded-xl text-orange-600 hover:bg-orange-200 active:scale-90 transition-all">
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
            
            {isAdmin ? (
                <div className="flex gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
            ) : (
                <button 
                    onClick={() => addToCart(item)} 
                    disabled={isSoldOut} 
                    className={`h-10 px-5 rounded-2xl font-bold text-xs flex items-center gap-1 transition-all shadow-lg ${
                        isSoldOut 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30 active:scale-90'
                    }`}
                >
                    {isSoldOut ? "Closed" : <>Add <Plus className="w-4 h-4 stroke-[3]" /></>}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

// --- ORDER TICKET ---
export const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 md:p-4">
        <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Order Details</h3>
                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>{order.status}</span>
            </div>

            {/* Item List */}
            <div className="space-y-3 mb-6">
                {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                             <div className="bg-gray-100 dark:bg-gray-800 w-8 h-8 rounded-lg flex items-center justify-center text-sm">{item.image || '🍲'}</div>
                             <span className="font-bold text-gray-700 dark:text-gray-300">1x {item.name}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">₦{item.price.toLocaleString()}</span>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex justify-between items-center mb-6">
                <span className="text-gray-500 font-bold">Total Paid</span>
                <span className="text-2xl font-black text-green-700 dark:text-green-400">₦{order.total.toLocaleString()}</span>
            </div>

            <button onClick={onClose} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold">Close</button>
        </div>
    </div>
  );
};