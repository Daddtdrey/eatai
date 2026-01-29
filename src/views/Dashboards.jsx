import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Truck, CheckCircle, History, Box, Smile, Image as ImageIcon, Upload, 
  Wrench, BarChart3, Package as PackageIcon, Volume2, Bell, PlayCircle, 
  MapPin, Phone, RefreshCw, Plus, X 
} from 'lucide-react';

// 🟢 IMPORTS: Added explicit extensions to fix build errors
import { ViewContainer, WakeLockToggle, ProductCard } from '../components/UI.jsx';
import { AnalyticsDashboard } from '../components/Analytic.jsx';
import { 
  db, collection, query, where, orderBy, limit, onSnapshot, 
  updateOrderStatus, addProduct, updateProduct, deleteProduct, 
  uploadImage, saveVendorLogo, getAdminRole, requestNotificationPermission
} from '../firebase.js';
import { SUPER_ADMINS, SUB_ADMINS, LOCATIONS, VENDORS_BY_LOCATION } from '../config.js';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// 🟢 HELPER: Group identical items for cleaner lists
const groupItems = (items) => {
    if (!items || !Array.isArray(items)) return [];
    const groups = {};
    items.forEach(item => {
        const key = item.id; 
        if (!groups[key]) groups[key] = { ...item, quantity: 0 };
        groups[key].quantity += 1;
    });
    return Object.values(groups);
};

// ==========================================
// 1. LOGISTICS VIEW (Drivers Only)
// ==========================================
export const LogisticsView = ({ setCurrentView, setNotification, user }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('active');

    useEffect(() => {
        // Query fetches Confirmed (Ready), Picked Up (On way), and Delivered (History)
        const q = query(
            collection(db, "orders"), 
            where("status", "in", ["confirmed", "picked_up", "delivered"])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // 1. Sort by Date (Newest first)
            const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // 2. 🟢 CRITICAL FIX: Hide 'pickup' orders from drivers
            const deliveryOnly = sortedData.filter(order => order.orderType !== 'pickup');
            
            setTasks(deliveryOnly);
            setLoading(false);
        }, (error) => {
            console.error("Logistics snapshot error:", error);
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
        <ViewContainer title="Logistics Hub" showBack onBack={() => setCurrentView('home')} actions={<WakeLockToggle />}>
             
             {/* Alert Setup */}
             <div onClick={() => requestNotificationPermission(user.uid, 'logistics', null)} className="mb-4 p-3 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-between cursor-pointer border border-purple-200 text-sm">
                <div className="flex items-center gap-2 font-bold"><Bell className="w-4 h-4"/> Driver Background Alerts</div>
                <span className="text-xs bg-white px-2 py-1 rounded border">Setup</span>
             </div>

             {/* Tabs */}
             <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
                 <button onClick={() => setViewMode('active')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'active' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>Active ({activeTasks.length})</button>
                 <button onClick={() => setViewMode('history')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${viewMode === 'history' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>History</button>
             </div>
            
            {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div> : (
                <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-4 min-h-0">
                    {displayedTasks.length === 0 && <p className="text-center text-gray-500 mt-10">No {viewMode} deliveries found.</p>}
                    {displayedTasks.map(task => (
                        <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden mb-4">
                            
                            {/* Header */}
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${task.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : task.status === 'delivered' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{task.status.toUpperCase()}</span>
                                <span className="text-xs font-mono text-gray-400">#{task.id.slice(0,6)}</span>
                            </div>
                            
                            {/* Items */}
                            <div className="mb-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Order Contents:</p>
                                {groupItems(task.items).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm mb-1 border-b border-gray-200 dark:border-gray-700 last:border-0 pb-1 last:pb-0">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                            {item.quantity > 1 && <span className="font-bold text-orange-600 mr-1">{item.quantity}x</span>}
                                            {item.name}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-1 rounded">{item.vendor}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Address & Actions */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg mb-3 text-sm space-y-2 border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{task.deliveryAddress}</p>
                                        {task.landmark && <p className="text-xs text-gray-500 mt-1">Landmark: {task.landmark}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-blue-200 dark:border-blue-800/30">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    <a href={`tel:${task.phone}`} className="font-mono text-blue-600 dark:text-blue-400 font-bold">{task.phone}</a>
                                </div>
                                {/* 🟢 MAP BUTTON */}
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.deliveryAddress + " " + (task.landmark || ""))}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block text-center bg-blue-600 text-white py-2 rounded-lg font-bold text-xs mt-2 hover:bg-blue-700"
                                >
                                    🗺️ Open in Google Maps
                                </a>
                            </div>
                            
                            {task.status === 'confirmed' && (
                                <button onClick={() => handleStatus(task.id, 'picked_up')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow hover:bg-purple-700 flex items-center justify-center gap-2"><Truck className="w-5 h-5" /> Confirm Pickup</button>
                            )}
                            {task.status === 'picked_up' && (
                                <button onClick={() => handleStatus(task.id, 'delivered')} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow hover:bg-green-700 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Mark Delivered</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </ViewContainer>
    );
};

// ==========================================
// 2. ADMIN VIEW (Vendors & Super Admin)
// ==========================================
export const AdminView = ({ setCurrentView, marketData, refreshData, user, setNotification, vendorsByLocation }) => { 
  const [activeTab, setActiveTab] = useState(localStorage.getItem('admin_active_tab') || 'orders');
  useEffect(() => { localStorage.setItem('admin_active_tab', activeTab); }, [activeTab]);

  const [adminOrders, setAdminOrders] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productFile, setProductFile] = useState(null);
  const [vendorLogoFile, setVendorLogoFile] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // 🟢 STATE: Toggle for Manual Vendor Entry
  const [isNewVendor, setIsNewVendor] = useState(false);

  const [role, setRole] = useState(null);
  const [myVendorName, setMyVendorName] = useState(null);
  const previousOrderCountRef = useRef(0);
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND));

  // 🟢 FLATTEN VENDORS: Convert { "Irrua": ["Nasco"] } -> ["Nasco"]
  const allVendorsList = useMemo(() => {
    // 1. Get from DB props
    const dbVendors = vendorsByLocation ? Object.values(vendorsByLocation).flat() : [];
    // 2. Get from Config
    const configVendors = VENDORS_BY_LOCATION ? Object.values(VENDORS_BY_LOCATION).flat() : [];
    // 3. Merge & Sort
    return [...new Set([...dbVendors, ...configVendors])].sort();
  }, [vendorsByLocation]);

  useEffect(() => {
     const checkRole = async () => {
         try {
             const roleData = await getAdminRole(user.email);
             if(roleData) {
                 setRole(roleData.type || roleData.role); 
                 if((roleData.type === 'sub' || roleData.role === 'sub' || roleData.role === 'vendor') && (roleData.vendor || roleData.vendorName)) {
                     setMyVendorName(roleData.vendor || roleData.vendorName);
                 }
             } else {
                 if(SUPER_ADMINS.includes(user.email)) setRole('super');
             }
         } catch(e) { console.error("Role check failed", e); }
     };
     checkRole();
  }, [user]);

  const isSuperAdmin = role === 'super';
  const defaultLocation = "Irrua"; 
  const defaultVendor = isSuperAdmin ? "" : (myVendorName || "");

  const [newItem, setNewItem] = useState({ 
      name: '', price: '', category: 'fullMeal', desc: '', stock: 10, 
      image: '', location: defaultLocation, vendor: defaultVendor 
  });
  
  // Keep vendor synced for sub-admins
  useEffect(() => {
     if(myVendorName && !isSuperAdmin) {
         setNewItem(prev => ({...prev, vendor: myVendorName}));
     }
  }, [myVendorName, isSuperAdmin]);

  const filteredMarketData = isSuperAdmin ? marketData : marketData.filter(item => item.vendor === myVendorName);

  const playNotificationSound = () => {
      if (!soundEnabled) return;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio blocked"));
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
  };

  useEffect(() => {
    if(!role) return;

    // Use simple query to avoid index issues.
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter logic for specific vendors
        const processedOrders = rawOrders.map(order => {
            if (isSuperAdmin) return order; 

            const myItems = order.items.filter(i => i.vendor === myVendorName);
            if (myItems.length === 0) return null;

            const myTotal = myItems.reduce((acc, item) => acc + item.price, 0);
            return { ...order, items: myItems, total: myTotal, grandTotal: order.total };
        }).filter(Boolean);

        const myOrders = processedOrders;
        
        const pendingCount = myOrders.filter(o => o.status === 'pending').length;
        if (pendingCount > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
             playNotificationSound();
             setNotification(`🔔 You have ${pendingCount} Pending Orders!`);
             setTimeout(() => setNotification(null), 5000);
        }
        previousOrderCountRef.current = pendingCount;
        setAdminOrders(myOrders);
    }, (error) => {
        console.error("Admin snapshot error:", error);
    });
    return () => unsubscribe();
  }, [role, myVendorName, soundEnabled]); 

  const enableAudio = () => {
      audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setSoundEnabled(true);
          alert("🔊 Sound Enabled! Keep this screen open.");
      }).catch(e => alert("Tap screen again to enable."));
  };

  const handleStatusUpdate = async (orderId, newStatus) => { 
      if(confirm(`Mark as ${newStatus}?`)) { 
          await updateOrderStatus(orderId, newStatus); 
      }
  };
  
  const handleEditClick = (item) => { 
      if (!isSuperAdmin && item.vendor !== myVendorName) return alert("Restricted!"); 
      
      setNewItem({ 
          ...item, 
          vendor: item.vendor || "", 
          location: item.location || "Irrua", 
          desc: item.desc || "", 
          image: item.image || "" 
      }); 
      setEditId(item.id); setIsEditing(true); setActiveTab('products');
      setTimeout(() => document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const handleCancelEdit = () => { 
      setIsEditing(false); setEditId(null); setProductFile(null); 
      setNewItem({ name: '', price: '', vendor: isSuperAdmin ? '' : (myVendorName || ""), category: 'fullMeal', desc: '', stock: 10, image: '', location: defaultLocation }); 
  };
  
  const handleSubmit = async (e) => { 
      e.preventDefault(); setIsSubmitting(true); 
      let imageUrl = newItem.image || '🍽️'; 
      if(productFile) { imageUrl = await uploadImage(productFile); }
      
      const finalVendor = isSuperAdmin ? newItem.vendor : myVendorName; 
      
      // Ensure numeric conversion
      const productPayload = { 
          ...newItem, 
          vendor: finalVendor, 
          price: parseFloat(newItem.price), 
          stock: parseInt(newItem.stock), 
          imageUrl: imageUrl 
      }; 
      
      if (isEditing) { await updateProduct(editId, productPayload); alert("Updated!"); } 
      else { await addProduct(productPayload); alert("Added!"); } 
      
      handleCancelEdit(); await refreshData(); setIsSubmitting(false); 
  };

  const handleVendorLogoUpload = async () => {
      if(!vendorLogoFile || !myVendorName) return alert("Select a file first");
      setIsSubmitting(true);
      await saveVendorLogo(myVendorName, vendorLogoFile);
      alert("Logo Updated!"); setIsSubmitting(false); setVendorLogoFile(null);
  }
  const handleDelete = async (id) => { if (confirm("Delete?")) { await deleteProduct(id); await refreshData(); } };

  return (
    <ViewContainer title="Manager HQ" showBack onBack={() => setCurrentView('home')} actions={<WakeLockToggle />}>
      {!soundEnabled && (
          <button onClick={enableAudio} className="mb-4 w-full p-4 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold animate-pulse shadow-xl"><PlayCircle className="w-6 h-6"/> TAP HERE TO START SHIFT</button>
      )}

      <div onClick={() => requestNotificationPermission(user.uid, role, myVendorName)} className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-between cursor-pointer border border-blue-100 text-sm">
           <div className="flex items-center gap-2 font-bold"><Bell className="w-4 h-4"/> Background Alerts</div>
           <span className="text-xs bg-white px-2 py-1 rounded border">Setup</span>
      </div>

      <div className="mb-4 p-3 bg-orange-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
          <div><p className="text-xs font-bold text-gray-500 uppercase">Logged in as</p><p className="font-bold text-orange-600">{isSuperAdmin ? "SUPER ADMIN" : `${myVendorName || 'LOADING'} ADMIN`}</p></div>
          {!isSuperAdmin && myVendorName && (
              <div className="flex gap-2 items-center"><label className="cursor-pointer bg-white p-2 rounded border border-gray-300"><input type="file" hidden onChange={e => setVendorLogoFile(e.target.files[0])} /><Upload className="w-4 h-4 text-gray-600" /></label>{vendorLogoFile && <button onClick={handleVendorLogoUpload} disabled={isSubmitting} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Save</button>}</div>
          )}
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
          <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><PackageIcon className="w-4 h-4"/> Orders</button>
          <button onClick={() => setActiveTab('products')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><Box className="w-4 h-4"/> Inventory</button>
          <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><BarChart3 className="w-4 h-4"/> Stats</button>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide min-h-0">
        
        {activeTab === 'analytics' && (
            <AnalyticsDashboard orders={adminOrders} role={role} myVendorName={myVendorName} />
        )}

        {activeTab === 'orders' && (
            <div className="space-y-4">{adminOrders.length === 0 ? <p className="text-center text-gray-400 mt-10">No orders found.</p> : adminOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-3"><div><span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-800'}`}>{order.status.replace('_', ' ')}</span><p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black text-lg dark:text-white">₦{order.total.toLocaleString()}</p><p className="text-xs text-gray-500 uppercase">{order.paymentMethod}</p></div></div>
                    
                    <div className="mb-2 bg-gray-50 dark:bg-gray-900/30 p-2 rounded text-sm border border-gray-100 dark:border-gray-700">
                        {groupItems(order.items).map((item, idx) => (
                                <div key={idx} className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    <span className="font-medium">{item.quantity > 1 && <span className="font-bold text-orange-600 mr-1">{item.quantity}x</span>}{item.name}</span>
                                    <span className="text-gray-500 text-xs">{item.vendor}</span>
                                </div>
                        ))}
                    </div>

                    {order.paymentMethod === 'transfer' && (<div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg mb-2 border border-blue-100 dark:border-blue-800"><p className="text-xs text-blue-800 dark:text-blue-200"><strong>Sender:</strong> {order.transferName}</p></div>)}<div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-2"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Delivery To:</p><p className="text-sm dark:text-gray-300 font-medium">{order.deliveryAddress}</p><p className="text-xs text-gray-500 mt-1">📞 {order.phone} | 🏛️ {order.landmark}</p></div><div className="text-xs text-gray-400 text-right mb-2">Fee: ₦{order.deliveryFee} included</div>
                    
                    {/* Only Show Confirm for Vendors/Admin */}
                    {order.status === 'pending' && (<button onClick={() => handleStatusUpdate(order.id, 'confirmed')} className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-bold shadow hover:bg-green-700">Confirm Payment</button>)}
                    
                </div>
            ))}</div>
        )}

        {activeTab === 'products' && (
            <>
            <div id="admin-form" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white">{isEditing ? 'Edit Item' : 'Add Item'}</h3>{isEditing && <button onClick={handleCancelEdit} className="text-xs text-red-500">Cancel</button>}</div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><input required placeholder="Name" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} /><input required type="number" placeholder="Price (₦)" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
                
                {/* 🟢 FIXED: HYBRID VENDOR SELECTOR (Dropdown + Type New) */}
                <div className="grid grid-cols-2 gap-4 relative">
                    {isSuperAdmin ? (
                        <>
                            {isNewVendor ? (
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        placeholder="Type New Vendor Name" 
                                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-orange-500 w-full dark:text-white" 
                                        value={newItem.vendor || ''} 
                                        onChange={e => setNewItem({...newItem, vendor: e.target.value})} 
                                    />
                                    <button type="button" onClick={() => setIsNewVendor(false)} className="p-3 bg-gray-200 rounded-xl"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select 
                                        className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-50 dark:bg-gray-700" 
                                        value={newItem.vendor || ''} 
                                        onChange={e => setNewItem({...newItem, vendor: e.target.value})}
                                    >
                                        <option value="">Select Vendor</option>
                                        {allVendorsList.map((v, i) => <option key={i} value={v}>{v}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsNewVendor(true)} className="p-3 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200" title="Add New Vendor"><Plus className="w-4 h-4"/></button>
                                </div>
                            )}
                        </>
                    ) : (
                        <input required placeholder="Vendor" disabled className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-200 dark:bg-gray-600" value={newItem.vendor || ''} />
                    )}
                    <select className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.category || 'fullMeal'} onChange={e => setNewItem({...newItem, category: e.target.value})}><option value="fullMeal">Meal</option><option value="fitness">Fitness</option><option value="pregnancy">Pregnancy</option><option value="period">Period</option><option value="male">Male</option><option value="normal">Normal</option></select>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl"><label className="text-xs text-gray-500 mb-1 block uppercase">Location</label>
                    {isSuperAdmin ? (
                        <div className="flex gap-2">{LOCATIONS.map(loc => (<button type="button" key={loc} onClick={() => setNewItem({...newItem, location: loc})} className={`flex-1 py-1 rounded text-xs font-bold ${newItem.location === loc ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{loc}</button>))}</div>
                    ) : (
                        <div className="text-sm font-bold dark:text-white">{newItem.location || 'Locked'} (Locked)</div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3"><Box className="w-5 h-5 text-gray-500" /><input required type="number" placeholder="Stock" className="bg-transparent border-none w-full outline-none dark:text-white" value={newItem.stock || ''} onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 relative">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setProductFile(e.target.files[0])} />
                        <span className="text-xs text-gray-400 ml-1 truncate">{productFile ? "Image Selected" : "Tap to Upload"}</span>
                    </div>
                </div>
                <textarea required placeholder="Description..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none h-20 resize-none dark:text-white" value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                <button disabled={isSubmitting} className="w-full bg-gray-900 dark:bg-orange-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? 'Uploading...' : 'Save Item'}</button>
            </form></div>
            <div className="space-y-3">{filteredMarketData.map(item => (<ProductCard key={item.id} item={item} isAdmin={true} onEdit={handleEditClick} onDelete={handleDelete} />))}</div>
            </>
        )}
      </div>
    </ViewContainer>
  );
};