import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Truck, CheckCircle, History, Box, Smile, Image as ImageIcon, Upload,
    Wrench, BarChart3, Package as PackageIcon, Volume2, Bell, PlayCircle,
    MapPin, Phone, RefreshCw, Plus, X, ListPlus
} from 'lucide-react';

// 🟢 IMPORTS: Added explicit extensions to fix build errors
import { ViewContainer, WakeLockToggle, ProductCard } from '../components/UI.jsx';
import { AnalyticsDashboard } from '../components/Analytic.jsx';
import {
    db, collection, query, where, orderBy, limit, onSnapshot,
    updateOrderStatus, deleteOrder, addProduct, updateProduct, deleteProduct,
    uploadImage, saveVendorLogo, getAdminRole, requestNotificationPermission,
    getBanners, saveBanner, deleteBanner, getTodayVisitors, saveVendorLocation,
    getVendorsWithLocation, getDeliveryPricingConfig, saveDeliveryPricingConfig
} from '../firebase.js';
import { SUPER_ADMINS, SUB_ADMINS, LOCATIONS, VENDORS_BY_LOCATION } from '../config.js';
import { DEFAULT_PRICING } from '../deliveryPricing.js';

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
                <div className="flex items-center gap-2 font-bold"><Bell className="w-4 h-4" /> Driver Background Alerts</div>
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
                                <span className="text-xs font-mono text-gray-400">#{task.id.slice(0, 6)}</span>
                            </div>

                            {/* Items */}
                            <div className="mb-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Order Contents:</p>
                                {groupItems(task.items).map((item, idx) => (
                                    <div key={idx} className="text-sm mb-2 border-b border-gray-200 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {item.quantity > 1 && <span className="font-bold text-orange-600 mr-1">{item.quantity}x</span>}
                                                {item.name}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-1 rounded">{item.vendor}</span>
                                        </div>
                                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                                            <p className="text-[11px] text-orange-500 font-bold mt-0.5 pl-1">
                                                + {item.selectedAddons.map(a => a.name).join(', ')}
                                            </p>
                                        )}
                                        {item.selectedSide && (
                                            <p className="text-[11px] text-orange-500 font-bold mt-0.5 pl-1">+ {item.selectedSide}</p>
                                        )}
                                        {item.note && (
                                            <p className="text-[11px] text-red-500 font-bold italic mt-0.5 pl-1">📝 {item.note}</p>
                                        )}
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
                                        {task.deliveryNote && <p className="text-xs text-orange-600 mt-1 font-bold bg-orange-50 dark:bg-orange-900/20 p-1 rounded">📝 {task.deliveryNote}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-blue-200 dark:border-blue-800/30">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    <a href={`tel:${task.phone}`} className="font-mono text-blue-600 dark:text-blue-400 font-bold">{task.phone}</a>
                                </div>
                                {/* 🟢 MAP BUTTON — uses GPS coords when available for maximum accuracy */}
                                <a
                                    href={
                                        task.customerLat && task.customerLng
                                            ? `https://www.google.com/maps/dir/?api=1&destination=${task.customerLat},${task.customerLng}`
                                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.deliveryAddress + " " + (task.landmark || ""))}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center bg-blue-600 text-white py-2 rounded-lg font-bold text-xs mt-2 hover:bg-blue-700"
                                >
                                    🗺️ {task.customerLat ? 'Navigate to Customer' : 'Open in Google Maps'}
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
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [editId, setEditId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productFile, setProductFile] = useState(null);
    const [vendorLogoFile, setVendorLogoFile] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    // Per-product addon editor state
    const [newAddonName, setNewAddonName] = useState('');
    const [newAddonPrice, setNewAddonPrice] = useState('');

    // 🟢 STATE: Toggle for Manual Vendor Entry
    const [isNewVendor, setIsNewVendor] = useState(false);

    const [role, setRole] = useState(null);
    const [myVendorName, setMyVendorName] = useState(null);
    const previousOrderCountRef = useRef(0);
    const audioRef = useRef(new Audio(NOTIFICATION_SOUND));

    // 🟢 Promos & Stats State
    const [banners, setBanners] = useState([]);
    const [todaysVisitors, setTodaysVisitors] = useState(0);
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerLink, setBannerLink] = useState('');
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);

    useEffect(() => {
        getBanners().then(setBanners);
        getTodayVisitors().then(setTodaysVisitors);
    }, []);

    // 🟢 Vendor Locations State (super admin)
    const [vendorsWithLocation, setVendorsWithLocation] = useState([]);
    const [locSearchQuery, setLocSearchQuery] = useState({});
    const [locSearchResults, setLocSearchResults] = useState({});
    const [locManualInput, setLocManualInput] = useState({}); // { vendorId: { lat, lng } }
    const [locSaving, setLocSaving] = useState({});

    // 🟢 Delivery Pricing State (super admin)
    const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING);
    const [isSavingPricing, setIsSavingPricing] = useState(false);

    useEffect(() => {
        if (activeTab === 'locations') {
            getVendorsWithLocation().then(setVendorsWithLocation);
        }
        if (activeTab === 'pricing') {
            getDeliveryPricingConfig().then(cfg => {
                if (cfg) setPricingConfig(cfg);
            });
        }
    }, [activeTab]);

    const handleSavePricingConfig = async () => {
        setIsSavingPricing(true);
        const success = await saveDeliveryPricingConfig(pricingConfig);
        setIsSavingPricing(false);
        if (success) alert('Delivery pricing updated successfully!');
        else alert('Failed to update pricing.');
    };

    const [locSearchLoading, setLocSearchLoading] = useState({});

    const handleAddressSearch = async (vendorId) => {
        const q = locSearchQuery[vendorId] || '';
        if (!q.trim()) return;
        setLocSearchLoading(prev => ({ ...prev, [vendorId]: true }));
        setLocSearchResults(prev => ({ ...prev, [vendorId]: null })); // null = searching
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&countrycodes=ng&addressdetails=1`;
            const resp = await fetch(url, {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'EatAi-Admin/1.0'
                }
            });
            const results = await resp.json();
            setLocSearchResults(prev => ({ ...prev, [vendorId]: results }));
        } catch (err) {
            setLocSearchResults(prev => ({ ...prev, [vendorId]: [] }));
            alert('Address search failed. Try entering coordinates manually.');
        } finally {
            setLocSearchLoading(prev => ({ ...prev, [vendorId]: false }));
        }
    };

    const handleSaveVendorLoc = async (vendorId, lat, lng) => {
        setLocSaving(prev => ({ ...prev, [vendorId]: true }));
        const ok = await saveVendorLocation(vendorId, parseFloat(lat), parseFloat(lng));
        if (ok) {
            setVendorsWithLocation(prev => prev.map(v => v.id === vendorId ? { ...v, lat: parseFloat(lat), lng: parseFloat(lng) } : v));
            setLocSearchResults(prev => ({ ...prev, [vendorId]: [] }));
            setLocManualInput(prev => ({ ...prev, [vendorId]: { lat: '', lng: '' } }));
        } else { alert('Failed to save location.'); }
        setLocSaving(prev => ({ ...prev, [vendorId]: false }));
    };

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
                if (roleData) {
                    setRole(roleData.type || roleData.role);
                    if ((roleData.type === 'sub' || roleData.role === 'sub' || roleData.role === 'vendor') && (roleData.vendor || roleData.vendorName)) {
                        setMyVendorName(roleData.vendor || roleData.vendorName);
                    }
                } else {
                    if (SUPER_ADMINS.includes(user.email)) setRole('super');
                }
            } catch (e) { console.error("Role check failed", e); }
        };
        checkRole();
    }, [user]);



    const isSuperAdmin = role === 'super';
    const defaultLocation = "Irrua";
    const defaultVendor = isSuperAdmin ? "" : (myVendorName || "");

    const [newItem, setNewItem] = useState({
        name: '', price: '', category: 'fullMeal', desc: '', stock: 10,
        image: '', location: defaultLocation, vendor: defaultVendor, hasAddons: true, addons: []
    });

    // Keep vendor synced for sub-admins
    useEffect(() => {
        if (myVendorName && !isSuperAdmin) {
            setNewItem(prev => ({ ...prev, vendor: myVendorName }));
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
        if (!role) return;

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
        if (confirm(`Mark as ${newStatus}?`)) {
            await updateOrderStatus(orderId, newStatus);
        }
    };

    const handleEditClick = (item) => {
        if (!isSuperAdmin && item.vendor !== myVendorName) return alert("Restricted!");

        setNewItem({
            ...item,
            vendor: item.vendor || "",
            addons: item.addons || [],
            location: item.location || "Irrua",
            desc: item.desc || "",
            image: item.image || "",
            hasAddons: item.hasAddons !== false
        });
        setEditId(item.id); setIsEditing(true); setActiveTab('products');
        setTimeout(() => document.getElementById('admin-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleCancelEdit = () => {
        setIsEditing(false); setEditId(null); setProductFile(null);
        setNewItem({ name: '', price: '', vendor: isSuperAdmin ? '' : (myVendorName || ""), category: 'fullMeal', desc: '', stock: 10, image: '', location: defaultLocation, hasAddons: true, addons: [] });
        setNewAddonName(''); setNewAddonPrice('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true);
        let imageUrl = newItem.image || '🍽️';
        if (productFile) { imageUrl = await uploadImage(productFile); }

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
        if (!vendorLogoFile || !myVendorName) return alert("Select a file first");
        setIsSubmitting(true);
        await saveVendorLogo(myVendorName, vendorLogoFile);
        alert("Logo Updated!"); setIsSubmitting(false); setVendorLogoFile(null);
    }
    const handleDelete = async (id) => { if (confirm("Delete?")) { await deleteProduct(id); await refreshData(); } };

    return (
        <ViewContainer title="Manager HQ" showBack onBack={() => setCurrentView('home')} actions={<WakeLockToggle />}>


            {!soundEnabled && (
                <button onClick={enableAudio} className="mb-4 w-full p-4 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold animate-pulse shadow-xl"><PlayCircle className="w-6 h-6" /> TAP HERE TO START SHIFT</button>
            )}

            <div onClick={() => requestNotificationPermission(user.uid, role, myVendorName)} className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-between cursor-pointer border border-blue-100 text-sm">
                <div className="flex items-center gap-2 font-bold"><Bell className="w-4 h-4" /> Background Alerts</div>
                <span className="text-xs bg-white px-2 py-1 rounded border">Setup</span>
            </div>

            <div className="mb-4 p-3 bg-orange-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                <div><p className="text-xs font-bold text-gray-500 uppercase">Logged in as</p><p className="font-bold text-orange-600">{isSuperAdmin ? "SUPER ADMIN" : `${myVendorName || 'LOADING'} ADMIN`}</p></div>
                {isSuperAdmin && (
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase">Today's Visitors</p>
                        <p className="font-black text-xl text-blue-600">{todaysVisitors}</p>
                    </div>
                )}
                {!isSuperAdmin && myVendorName && (
                    <div className="flex gap-2 items-center"><label className="cursor-pointer bg-white p-2 rounded border border-gray-300"><input type="file" hidden onChange={e => setVendorLogoFile(e.target.files[0])} /><Upload className="w-4 h-4 text-gray-600" /></label>{vendorLogoFile && <button onClick={handleVendorLogoUpload} disabled={isSubmitting} className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Save</button>}</div>
                )}
            </div>




            <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0 flex-wrap">
                <button onClick={() => setActiveTab('orders')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><PackageIcon className="w-4 h-4" /> Orders</button>
                <button onClick={() => setActiveTab('products')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><Box className="w-4 h-4" /> Inventory</button>
                <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><BarChart3 className="w-4 h-4" /> Stats</button>
                {isSuperAdmin && <button onClick={() => setActiveTab('banners')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'banners' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><ImageIcon className="w-4 h-4" /> Banners</button>}
                {isSuperAdmin && <button onClick={() => setActiveTab('locations')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'locations' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><MapPin className="w-4 h-4" /> Locations</button>}
                {isSuperAdmin && <button onClick={() => setActiveTab('pricing')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'pricing' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}><Wrench className="w-4 h-4" /> Pricing</button>}
            </div>

            <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide min-h-0">

                {activeTab === 'analytics' && (
                    <AnalyticsDashboard orders={adminOrders} role={role} myVendorName={myVendorName} />
                )}

                {/* 🟢 PRICING TAB (Super Admin Only) */}
                {activeTab === 'pricing' && isSuperAdmin && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-white">Delivery Pricing</h2>
                            <button onClick={handleSavePricingConfig} disabled={isSavingPricing} className="bg-orange-500 text-white px-4 py-2 text-sm font-bold rounded-xl shadow-lg disabled:opacity-50">
                                {isSavingPricing ? 'Saving...' : 'Save Pricing Config'}
                            </button>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 font-medium text-sm rounded-xl">
                            Adjust the distance-based auto-pricing logic. Changes are applied immediately to new orders.
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Base Fee (₦)</label>
                                <p className="text-[10px] text-gray-400 mb-2">The starting minimum delivery cost before distance is applied. Default: ₦1100.</p>
                                <input
                                    type="number"
                                    value={pricingConfig.baseFee}
                                    onChange={e => setPricingConfig({ ...pricingConfig, baseFee: Number(e.target.value) })}
                                    className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cost Per Kilometer (₦)</label>
                                <p className="text-[10px] text-gray-400 mb-2">How much to add for every 1km of distance from the vendor to customer. Default: ₦300.</p>
                                <input
                                    type="number"
                                    value={pricingConfig.perKmRate}
                                    onChange={e => setPricingConfig({ ...pricingConfig, perKmRate: Number(e.target.value) })}
                                    className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Maximum Fee Cap (₦)</label>
                                <p className="text-[10px] text-gray-400 mb-2">Delivery fee will never exceed this amount, no matter how far. Default: ₦3000.</p>
                                <input
                                    type="number"
                                    value={pricingConfig.maxFee}
                                    onChange={e => setPricingConfig({ ...pricingConfig, maxFee: Number(e.target.value) })}
                                    className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Multi-Vendor Surcharge (₦)</label>
                                <p className="text-[10px] text-gray-400 mb-2">Extra fee added if the customer's cart contains items from multiple different vendors. Default: ₦350.</p>
                                <input
                                    type="number"
                                    value={pricingConfig.multiVendorSurcharge}
                                    onChange={e => setPricingConfig({ ...pricingConfig, multiVendorSurcharge: Number(e.target.value) })}
                                    className="w-full p-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 🟢 LOCATIONS TAB (Super Admin Only) */}
                {activeTab === 'locations' && isSuperAdmin && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold dark:text-white">Vendor Locations</h2>
                            <button onClick={() => getVendorsWithLocation().then(setVendorsWithLocation)} className="text-xs text-orange-500 font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">Set each vendor's GPS coordinates so customers get accurate delivery fees. Search an address OR enter lat/lng manually.</p>

                        {vendorsWithLocation.length === 0 && (
                            <div className="text-center text-gray-400 py-10"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No vendors found</p></div>
                        )}

                        {vendorsWithLocation.map(v => (
                            <div key={v.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">{v.name || v.id}</p>
                                        {v.lat && v.lng ? (
                                            <p className="text-xs text-green-600 font-medium mt-0.5">✅ Location set: {parseFloat(v.lat).toFixed(5)}, {parseFloat(v.lng).toFixed(5)}</p>
                                        ) : (
                                            <p className="text-xs text-red-400 font-medium mt-0.5">⚠️ No location set</p>
                                        )}
                                    </div>
                                </div>

                                {/* Address Search */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Search Address</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. Nasco, Ekpoma, Edo State"
                                            value={locSearchQuery[v.id] || ''}
                                            onChange={e => setLocSearchQuery(prev => ({ ...prev, [v.id]: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && handleAddressSearch(v.id)}
                                            className="flex-1 p-2 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button onClick={() => handleAddressSearch(v.id)} className="bg-orange-500 text-white px-3 rounded-lg text-xs font-bold">Search</button>
                                    </div>
                                    {/* Search Results */}
                                    {locSearchLoading[v.id] && (
                                        <p className="text-xs text-orange-500 mt-2 animate-pulse">Searching...</p>
                                    )}
                                    {!locSearchLoading[v.id] && locSearchResults[v.id] !== undefined && locSearchResults[v.id] !== null && locSearchResults[v.id].length === 0 && (
                                        <p className="text-xs text-red-400 mt-2">No results found. Try more specific terms like <b>"Ekpoma, Edo State"</b> or use manual coordinates below.</p>
                                    )}
                                    {!locSearchLoading[v.id] && (locSearchResults[v.id] || []).length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {locSearchResults[v.id].map((result, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSaveVendorLoc(v.id, result.lat, result.lon)}
                                                    className="w-full text-left p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors border border-transparent hover:border-orange-300"
                                                >
                                                    <span className="font-bold text-orange-600">{parseFloat(result.lat).toFixed(5)}, {parseFloat(result.lon).toFixed(5)}</span>{' '}
                                                    <span className="text-gray-500">{result.display_name?.split(',').slice(0, 3).join(',')}</span>
                                                    <span className="ml-2 text-green-600 font-bold">→ Use this</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Manual Lat/Lng */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Or Enter Coordinates Manually</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number" step="0.00001" placeholder="Latitude (e.g. 6.7356)"
                                            value={locManualInput[v.id]?.lat || ''}
                                            onChange={e => setLocManualInput(prev => ({ ...prev, [v.id]: { ...prev[v.id], lat: e.target.value } }))}
                                            className="flex-1 p-2 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <input
                                            type="number" step="0.00001" placeholder="Longitude (e.g. 6.1298)"
                                            value={locManualInput[v.id]?.lng || ''}
                                            onChange={e => setLocManualInput(prev => ({ ...prev, [v.id]: { ...prev[v.id], lng: e.target.value } }))}
                                            className="flex-1 p-2 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button
                                            disabled={!locManualInput[v.id]?.lat || !locManualInput[v.id]?.lng || locSaving[v.id]}
                                            onClick={() => handleSaveVendorLoc(v.id, locManualInput[v.id].lat, locManualInput[v.id].lng)}
                                            className="bg-blue-500 text-white px-3 rounded-lg text-xs font-bold disabled:opacity-40"
                                        >
                                            {locSaving[v.id] ? '...' : 'Save'}
                                        </button>
                                    </div>
                                </div>

                                {/* Opening Hours */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">⏰ Opening Hours</label>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-400 mb-0.5">Opens</p>
                                            <input
                                                type="time"
                                                value={locManualInput[v.id]?.openTime ?? (v.openTime || '')}
                                                onChange={e => setLocManualInput(prev => ({ ...prev, [v.id]: { ...prev[v.id], openTime: e.target.value } }))}
                                                className="w-full p-2 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-gray-400 mb-0.5">Closes</p>
                                            <input
                                                type="time"
                                                value={locManualInput[v.id]?.closeTime ?? (v.closeTime || '')}
                                                onChange={e => setLocManualInput(prev => ({ ...prev, [v.id]: { ...prev[v.id], closeTime: e.target.value } }))}
                                                className="w-full p-2 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                        <button
                                            className="mt-4 bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                                            disabled={!locManualInput[v.id]?.openTime && !locManualInput[v.id]?.closeTime}
                                            onClick={async () => {
                                                const { openTime, closeTime } = locManualInput[v.id] || {};
                                                if (!openTime || !closeTime) return;
                                                setLocSaving(prev => ({ ...prev, [v.id]: true }));
                                                await saveVendorLocation(v.id, v.lat, v.lng, openTime, closeTime);
                                                setLocSaving(prev => ({ ...prev, [v.id]: false }));
                                                getVendorsWithLocation().then(setVendorsWithLocation);
                                            }}
                                        >
                                            Save Hours
                                        </button>
                                    </div>
                                    {v.openTime && v.closeTime && (
                                        <p className="text-[11px] text-green-600 font-bold mt-1">✅ Set: {v.openTime} – {v.closeTime}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'banners' && isSuperAdmin && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold dark:text-white mb-2">Manage Promo Banners</h2>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                            <input type="text" placeholder="Banner Title" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                            <input type="text" placeholder="Link to Vendor (Optional, precise name)" value={bannerLink} onChange={e => setBannerLink(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                            <input type="file" onChange={e => setBannerFile(e.target.files[0])} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-sm" accept="image/*" />
                            <button
                                onClick={async () => {
                                    if (!bannerFile || !bannerTitle) return alert('File and title required');
                                    setIsUploadingBanner(true);
                                    await saveBanner(bannerFile, bannerTitle, bannerLink);
                                    setBannerFile(null); setBannerTitle(''); setBannerLink('');
                                    getBanners().then(setBanners);
                                    setIsUploadingBanner(false);
                                }}
                                disabled={isUploadingBanner}
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow hover:bg-blue-700 transition"
                            >
                                {isUploadingBanner ? 'Uploading...' : 'Add Banner'}
                            </button>
                        </div>

                        <div className="space-y-3 mt-6">
                            {banners.length === 0 ? <p className="text-center text-gray-400 mt-6">No active banners.</p> : banners.map(b => (
                                <div key={b.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-gray-100 dark:border-gray-700">
                                    <img src={b.imageUrl} className="w-24 h-16 object-cover rounded-lg" />
                                    <div className="flex-1">
                                        <h4 className="font-bold dark:text-gray-200">{b.title}</h4>
                                        {b.linkToVendor && <p className="text-xs text-blue-500 mt-1">🏷️ Loops to: {b.linkToVendor}</p>}
                                    </div>
                                    <button onClick={async () => { if (confirm('Delete banner?')) { await deleteBanner(b.id); getBanners().then(setBanners); } }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <>
                        {/* 🟢 ORDER FILTERS */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            {['all', 'pending', 'confirmed', 'picked_up', 'delivered'].map(status => (
                                <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all ${statusFilter === status ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'}`}>
                                    {status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {adminOrders.filter(o => statusFilter === 'all' || o.status === statusFilter).length === 0 ? <p className="text-center text-gray-400 mt-10">No {statusFilter === 'all' ? '' : statusFilter} orders found.</p> :
                                adminOrders.filter(o => statusFilter === 'all' || o.status === statusFilter).map(order => (
                                    <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800 transition-all active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-2"><div><span className={`text-xs font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-800'}`}>{order.status.replace('_', ' ')}</span><p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p></div><div className="text-right"><p className="font-black text-lg dark:text-white">₦{order.total.toLocaleString()}</p><p className="text-xs text-gray-500 uppercase">{order.paymentMethod}</p></div></div>
                                        <div className="text-xs text-gray-400 truncate">📍 {order.deliveryAddress} • {groupItems(order.items).length} item(s)</div>
                                    </div>))}
                        </div>

                        {/* ===== ORDER DETAIL MODAL ===== */}
                        {selectedOrder && (
                            <>
                                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
                                <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
                                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl pointer-events-auto max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50 dark:border-gray-700/50">

                                        {/* Header */}
                                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                                            <div>
                                                <h3 className="text-lg font-black dark:text-white">Order #{selectedOrder.id.slice(0, 5).toUpperCase()}</h3>
                                                <p className="text-xs text-gray-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : selectedOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : selectedOrder.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-800'}`}>{selectedOrder.status.replace('_', ' ')}</span>
                                                <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"><X className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        {/* Scrollable Content */}
                                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">

                                            {/* Total */}
                                            <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Total Amount</p>
                                                    <p className="text-3xl font-black text-gray-900 dark:text-white">₦{selectedOrder.total.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Payment</p>
                                                    <p className="text-sm font-bold text-orange-600 uppercase">{selectedOrder.paymentMethod}</p>
                                                    {selectedOrder.deliveryFee > 0 && <p className="text-[10px] text-gray-400 mt-1">incl. ₦{selectedOrder.deliveryFee} delivery</p>}
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Items Ordered</p>
                                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 space-y-2">
                                                    {groupItems(selectedOrder.items).map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                                            <div className="flex-1">
                                                                <p className="font-bold text-sm dark:text-white">{item.quantity > 1 && <span className="text-orange-600 mr-1">{item.quantity}x</span>}{item.name}</p>
                                                                {item.selectedAddons && item.selectedAddons.length > 0 && <p className="text-[10px] text-orange-500 font-bold mt-0.5">+ {item.selectedAddons.map(a => `${a.name} (₦${a.price})`).join(', ')}</p>}
                                                                {item.selectedSide && <p className="text-[10px] text-orange-500 font-bold mt-0.5">+ {item.selectedSide} (₦{item.sidePrice})</p>}
                                                                {item.note && <p className="text-[10px] text-red-500 font-bold italic mt-0.5">📝 {item.note}</p>}
                                                            </div>
                                                            <span className="text-xs text-gray-400 ml-2">{item.vendor}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Transfer Info */}
                                            {selectedOrder.paymentMethod === 'transfer' && selectedOrder.transferName && (
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800">
                                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Transfer Sender</p>
                                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{selectedOrder.transferName}</p>
                                                </div>
                                            )}

                                            {/* Delivery Info */}
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{selectedOrder.orderType === 'pickup' ? 'Pickup' : 'Delivery'} Details</p>
                                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-sm mt-0.5">📍</span>
                                                        <p className="text-sm font-medium dark:text-gray-300">{selectedOrder.deliveryAddress}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">📞</span>
                                                        <p className="text-sm dark:text-gray-300">{selectedOrder.phone}</p>
                                                    </div>
                                                    {selectedOrder.landmark && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">🏛️</span>
                                                            <p className="text-sm dark:text-gray-300">{selectedOrder.landmark}</p>
                                                        </div>
                                                    )}
                                                    {selectedOrder.deliveryNote && (
                                                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl mt-1">
                                                            <p className="text-xs text-orange-600 font-bold">📝 Note: {selectedOrder.deliveryNote}</p>
                                                        </div>
                                                    )}
                                                    {/* 🗺️ Map link — uses GPS coords for accuracy */}
                                                    {selectedOrder.orderType !== 'pickup' && (
                                                        <a
                                                            href={
                                                                selectedOrder.customerLat && selectedOrder.customerLng
                                                                    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.customerLat},${selectedOrder.customerLng}`
                                                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.deliveryAddress + ' ' + (selectedOrder.landmark || ''))}`
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex justify-center items-center gap-2 bg-blue-500 text-white py-2 rounded-xl font-bold text-xs hover:bg-blue-600 transition-colors"
                                                        >
                                                            🗺️ {selectedOrder.customerLat ? 'Navigate to Customer' : 'Open in Google Maps'}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2 bg-gray-50/80 dark:bg-gray-900/80">
                                            {selectedOrder.status === 'pending' && (
                                                <button onClick={() => { handleStatusUpdate(selectedOrder.id, 'confirmed'); setSelectedOrder(null); }} className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">✅ Confirm Payment</button>
                                            )}
                                            {isSuperAdmin && (
                                                <button onClick={async () => { if (confirm(`Delete order ${selectedOrder.id.slice(0, 5).toUpperCase()}? This cannot be undone.`)) { await deleteOrder(selectedOrder.id); setSelectedOrder(null); } }} className="w-full bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors">🗑️ Delete Order</button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {activeTab === 'products' && (
                    <>
                        <div id="admin-form" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white">{isEditing ? 'Edit Item' : 'Add Item'}</h3>{isEditing && <button onClick={handleCancelEdit} className="text-xs text-red-500">Cancel</button>}</div>

                            {/* 🟢 MANAGE ADDONS BUTTON */}


                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4"><input required placeholder="Name" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /><input required type="number" placeholder="Price (₦)" className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: e.target.value })} /></div>

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
                                                        onChange={e => setNewItem({ ...newItem, vendor: e.target.value })}
                                                    />
                                                    <button type="button" onClick={() => setIsNewVendor(false)} className="p-3 bg-gray-200 rounded-xl"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <select
                                                        className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-50 dark:bg-gray-700"
                                                        value={newItem.vendor || ''}
                                                        onChange={e => setNewItem({ ...newItem, vendor: e.target.value })}
                                                    >
                                                        <option value="">Select Vendor</option>
                                                        {allVendorsList.map((v, i) => <option key={i} value={v}>{v}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => setIsNewVendor(true)} className="p-3 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200" title="Add New Vendor"><Plus className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <input required placeholder="Vendor" disabled className="p-3 rounded-xl border-none w-full dark:text-white bg-gray-200 dark:bg-gray-600" value={newItem.vendor || ''} />
                                    )}
                                    <select className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none w-full dark:text-white" value={newItem.category || 'fullMeal'} onChange={e => setNewItem({ ...newItem, category: e.target.value })}><option value="fullMeal">Meal</option><option value="fitness">Fitness</option><option value="pregnancy">Pregnancy</option><option value="period">Period</option><option value="male">Male</option><option value="normal">Normal</option></select>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl"><label className="text-xs text-gray-500 mb-1 block uppercase">Location</label>
                                    {isSuperAdmin ? (
                                        <div className="flex gap-2">{LOCATIONS.map(loc => (<button type="button" key={loc} onClick={() => setNewItem({ ...newItem, location: loc })} className={`flex-1 py-1 rounded text-xs font-bold ${newItem.location === loc ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{loc}</button>))}</div>
                                    ) : (
                                        <div className="text-sm font-bold dark:text-white">{newItem.location || 'Locked'} (Locked)</div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3"><Box className="w-5 h-5 text-gray-500" /><input required type="number" placeholder="Stock" className="bg-transparent border-none w-full outline-none dark:text-white" value={newItem.stock || ''} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} /></div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 relative">
                                        <ImageIcon className="w-5 h-5 text-gray-500" />
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setProductFile(e.target.files[0])} />
                                        <span className="text-xs text-gray-400 ml-1 truncate">{productFile ? "Image Selected" : "Tap to Upload"}</span>
                                    </div>
                                </div>

                                {/* 🟢 HAS ADDONS TOGGLE */}
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                                    <input type="checkbox" id="hasAddons" className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500" checked={newItem.hasAddons !== false} onChange={e => setNewItem({ ...newItem, hasAddons: e.target.checked })} />
                                    <label htmlFor="hasAddons" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer">Allow Add-ons</label>
                                </div>

                                {/* 🟢 PER-PRODUCT ADDON EDITOR */}
                                {newItem.hasAddons !== false && (
                                    <div className="bg-blue-50 dark:bg-gray-700 p-3 rounded-xl border border-blue-100 dark:border-gray-600">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase mb-2">Product Add-ons ({(newItem.addons || []).length})</p>
                                        <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                                            {(newItem.addons || []).map((addon, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-lg text-sm">
                                                    <span className="font-medium dark:text-white">{addon.name} — ₦{addon.price}</span>
                                                    <button type="button" onClick={() => setNewItem({ ...newItem, addons: newItem.addons.filter((_, i) => i !== idx) })} className="text-red-500 text-xs font-bold">✕</button>
                                                </div>
                                            ))}
                                            {(newItem.addons || []).length === 0 && <p className="text-xs text-gray-400 italic">No add-ons yet. Add below.</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <input placeholder="Name" className="flex-1 p-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" value={newAddonName} onChange={e => setNewAddonName(e.target.value)} />
                                            <input type="number" placeholder="₦" className="w-20 p-2 rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm" value={newAddonPrice} onChange={e => setNewAddonPrice(e.target.value)} />
                                            <button type="button" onClick={() => {
                                                if (newAddonName && newAddonPrice) {
                                                    setNewItem({ ...newItem, addons: [...(newItem.addons || []), { name: newAddonName, price: parseInt(newAddonPrice) }] });
                                                    setNewAddonName(''); setNewAddonPrice('');
                                                }
                                            }} className="bg-blue-500 text-white px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )}

                                <textarea required placeholder="Description..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-none h-20 resize-none dark:text-white" value={newItem.desc || ''} onChange={e => setNewItem({ ...newItem, desc: e.target.value })} />
                                <button disabled={isSubmitting} className="w-full bg-gray-900 dark:bg-orange-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? 'Uploading...' : 'Save Item'}</button>
                            </form></div>
                        <div className="space-y-6">
                            {isSuperAdmin ? (
                                // Group by vendor for super admin
                                Object.entries(
                                    filteredMarketData.reduce((groups, item) => {
                                        const v = item.vendor || 'Unknown';
                                        if (!groups[v]) groups[v] = [];
                                        groups[v].push(item);
                                        return groups;
                                    }, {})
                                ).sort(([a], [b]) => a.localeCompare(b)).map(([vendorName, items]) => (
                                    <div key={vendorName}>
                                        {/* Vendor header */}
                                        <div className="flex items-center gap-3 mb-2 sticky top-0 bg-gray-50 dark:bg-gray-950 py-1 z-10">
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                            <span className="text-xs font-black uppercase tracking-widest text-orange-500 whitespace-nowrap">
                                                🏪 {vendorName} <span className="text-gray-400 font-normal">({items.length})</span>
                                            </span>
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                        </div>
                                        <div className="space-y-3">
                                            {items.map(item => (
                                                <ProductCard key={item.id} item={item} isAdmin={true} onEdit={handleEditClick} onDelete={handleDelete} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Flat list for vendor-specific admins (they only see their own)
                                filteredMarketData.map(item => (
                                    <ProductCard key={item.id} item={item} isAdmin={true} onEdit={handleEditClick} onDelete={handleDelete} />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </ViewContainer>
    );
};