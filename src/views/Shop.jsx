import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ChefHat, ShoppingBag, Package, Store, ArrowLeft, LogIn,
    ShoppingCart, CreditCard, Wallet, MapPin, Leaf, Beef, Zap, Cookie,
    X, Minus, Sparkles, Box, Bell, Heart, Flame, Dumbbell, Plus, Eye,
    Mail, Lock, User, Search, Home, Navigation, ChevronDown, Percent, Trash2, BellRing, CheckCircle, Clock, Edit2, AlertTriangle
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';

// 🟢 FIX: Sub-component with its own hook so it always initializes with the CORRECT server amount.
// Using a key prop on this component forces React to fully remount it with fresh values.
const PaystackTrigger = ({ amount, email, reference, publicKey, onSuccess, onClose }) => {
    const initializePayment = usePaystackPayment({ 
        reference, 
        email, 
        amount: amount * 100, 
        publicKey
    });
    useEffect(() => { initializePayment(onSuccess, onClose); }, []);
    return null;
};
import { ethers } from 'ethers';

// 🟢 IMPORTS
import { ViewContainer, DietaryFilter, ProductCard, OrderDetailModal, Toast } from '../components/UI.jsx';
import { ProductDetailModal } from '../components/ProductDetailModal.jsx';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import {
    signInWithGoogle, createOrder, getUserOrders, saveUserProfile, getUserProfile,
    db, saveWalletToProfile, requestNotificationPermission,
    signUpWithEmail, logInWithEmail, saveStockRequest, getBanners, functions, resetPassword, deleteUserAccount,
    getReferralCode, getUserCredits, getUserReferralStats
} from '../firebase.js';
import { httpsCallable } from "firebase/functions";
import { LOCATIONS, VENDORS_BY_LOCATION, PAYSTACK_KEY, BANK_DETAILS, calculateDeliveryFee, GEMINI_API_KEY, DELIVERY_ZONES } from '../config.js';
import { getAutoDeliveryFee, isMultiVendorCart, DEFAULT_PRICING } from '../deliveryPricing.js';

// ==========================================
// 1.5. 🟢 USER PROFILE OVERLAY
// ==========================================

const ReferralView = ({ user }) => {
    const [stats, setStats] = useState({ referralCode: null, referralCount: 0, totalEarned: 0 });
    const [creditBalance, setCreditBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            getUserReferralStats(user.uid),
            getUserCredits(user.uid),
            getReferralCode(user.uid, user.displayName),
        ]).then(([s, c, code]) => {
            setStats({ ...s, referralCode: s.referralCode || code });
            setCreditBalance(c.total);
            setLoading(false);
        });
    }, [user]);

    const handleCopy = () => {
        if (!stats.referralCode) return;
        navigator.clipboard.writeText(stats.referralCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleShare = () => {
        if (!stats.referralCode) return;
        const shareUrl = `https://eatai.ng/${stats.referralCode}`;
        if (navigator.share) {
            navigator.share({
                title: 'EatAi Referral',
                text: `Join EatAi and get free credits on your first order! Use my link: ${shareUrl}`,
                url: shareUrl,
            });
        } else {
            // Provide fallback if share is not supported
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const expiryDays = 35;

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" /></div>;

    return (
        <div className="space-y-5 pb-6">
            {/* Code card */}
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-500/30">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Your Referral Code</p>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-3xl font-black tracking-widest">{stats.referralCode || '...'}</span>
                </div>
                <p className="text-xs opacity-70 mt-2">Share with friends. Both of you earn ₦500 when they order!</p>
                <div className="flex gap-2 mt-4">
                    <button onClick={handleCopy} className="flex-1 bg-white/20 backdrop-blur text-white font-bold py-2 rounded-xl text-sm active:scale-95 transition-all">
                        {copied ? '✅ Copied!' : '📋 Copy Code'}
                    </button>
                    <button onClick={handleShare} className="flex-1 bg-white text-orange-600 font-bold py-2 rounded-xl text-sm active:scale-95 transition-all shadow">
                        🚀 Share
                    </button>
                </div>
            </div>

            {/* Credit balance */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">💰 Your Credit Balance</p>
                <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">₦{creditBalance.toLocaleString()}</span>
                    {creditBalance > 0 && <span className="text-xs text-orange-500 font-bold bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-full">Expires in {expiryDays} days</span>}
                </div>
                {creditBalance === 0 && <p className="text-xs text-gray-400 mt-1">Credits appear here after your friend completes their first order.</p>}
                {creditBalance > 0 && <p className="text-xs text-gray-400 mt-1">Use at checkout on orders ≥ ₦2,500</p>}
            </div>

            {/* Monthly stats */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">📊 This Month</p>
                    <span className="text-xs font-bold text-gray-400">{stats.referralCount}/15 referrals</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${Math.min((stats.referralCount / 15) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">Total earned: <b className="text-gray-700 dark:text-gray-200">₦{stats.totalEarned.toLocaleString()}</b></p>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">How It Works</p>
                <div className="space-y-2">
                    {[
                        ['1️⃣', 'Share your referral code with a friend'],
                        ['2️⃣', 'They sign up and enter your code'],
                        ['3️⃣', 'They place their first order ≥ ₦3,000'],
                        ['4️⃣', 'You both earn ₦500 credit automatically!'],
                    ].map(([icon, text]) => (
                        <div key={text} className="flex items-start gap-2">
                            <span className="text-sm">{icon}</span>
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ProfileOverlay = ({ user, onClose, setCurrentView }) => {
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'referral' | 'chef'

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then(data => {
            if (data) {
                if (data.phone) setPhone(data.phone);
                if (data.address) setAddress(data.address);
            }
        });
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        await saveUserProfile(user.uid, { phone, address });
        setLoading(false);
        alert("Profile saved successfully!");
        onClose();
    };

    const handleDelete = async () => {
        const confirm1 = window.confirm("WARNING: You are about to permanently delete your account and all associated data. This action CANNOT be undone. Proceed?");
        if (!confirm1) return;
        const confirm2 = window.confirm("Are you 100% sure you want to permanently delete your account?");
        if (!confirm2) return;
        
        try {
            await deleteUserAccount();
            window.location.reload();
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex animate-fade-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-4/5 max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col pt-12 pb-6 px-6 slide-in-left overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center mb-5">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg mb-4 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${user?.displayName}&background=ffedd5&color=f97316&size=128`} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white font-[Fredoka]">{user?.displayName}</h2>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
                    <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500'}`}>👤 Profile</button>
                    <button onClick={() => setActiveTab('referral')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'referral' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>🎁 Referrals</button>
                    <button onClick={() => setActiveTab('chef')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'chef' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>🍳 Chef</button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {activeTab === 'profile' ? (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Default Delivery Address</label>
                                <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Room number, Hall/Hostel..." className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none h-24" />
                            </div>
                            <button onClick={handleSave} disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all outline-none">
                                {loading ? "Saving..." : "Save Profile"}
                            </button>
                            <div className="h-px w-full bg-gray-100 dark:bg-gray-800 my-2"></div>
                            <button onClick={handleDelete} className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-bold py-3.5 rounded-xl border border-red-100 dark:border-red-500/20 hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                <Trash2 className="w-5 h-5" /> Delete Account
                            </button>
                        </div>
                    ) : activeTab === 'referral' ? (
                        <ReferralView user={user} />
                    ) : (
                        <div className="space-y-5">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/30">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-white/20 p-2.5 rounded-xl"><ChefHat className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="font-black text-lg">AI Chef</h3>
                                        <p className="text-xs opacity-75">Powered by Gemini AI</p>
                                    </div>
                                </div>
                                <p className="text-sm opacity-90 mb-4">Tell the AI what ingredients you have and get personalised recipe ideas instantly.</p>
                                <button
                                    onClick={() => { onClose(); setCurrentView && setCurrentView('decider'); }}
                                    className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl text-sm active:scale-95 transition-all shadow"
                                >
                                    🍳 Open AI Chef
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 1. 🟢 REDESIGNED LOGIN VIEW (Full Screen + Background)
// ==========================================
export const LoginView = ({ defaultMode = 'signup' }) => {
    const [isSignUp, setIsSignUp] = useState(defaultMode !== 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [referralCode, setReferralCode] = useState(() => localStorage.getItem('eatai_pending_referral') || '');
    const [referralValid, setReferralValid] = useState(null); // null | true | false
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleResetPassword = async () => {
        if (!email) return setError("Please enter your email in the field above to reset your password.");
        setLoading(true);
        setError('');
        try {
            await resetPassword(email);
            alert('Password reset link sent! Check your email inbox.');
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to send reset email.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isSignUp) { 
                await signUpWithEmail(email, password, name, referralCode.trim() || null); 
                localStorage.removeItem('eatai_pending_referral');
            }
            else { await logInWithEmail(email, password); }
        } catch (err) {
            console.error(err);
            setError("Authentication failed. Please check your credentials.");
        }
        finally { setLoading(false); }
    };

    // Validate referral code on change (debounced check)
    useEffect(() => {
        if (!referralCode.trim() || !isSignUp) { setReferralValid(null); return; }
        const timeout = setTimeout(async () => {
            try {
                const { getDoc, doc } = await import('firebase/firestore');
                const { db } = await import('../firebase.js');
                const snap = await getDoc(doc(db, 'referralCodes', referralCode.trim().toUpperCase()));
                setReferralValid(snap.exists());
            } catch { setReferralValid(false); }
        }, 600);
        return () => clearTimeout(timeout);
    }, [referralCode, isSignUp]);

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

                    {/* 🎁 Referral code — signup only */}
                    {isSignUp && (
                        <div className="relative">
                            <span className="absolute left-3 top-3.5 text-base">🎁</span>
                            <input
                                type="text"
                                placeholder="Referral code (optional)"
                                className={`w-full pl-10 pr-16 p-3.5 rounded-xl bg-black/40 border text-white placeholder-gray-400 focus:ring-1 outline-none transition-all uppercase font-bold tracking-wider text-sm
                                    ${referralValid === true ? 'border-green-500 focus:ring-green-500' : referralValid === false ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-orange-500 focus:ring-orange-500'}`}
                                value={referralCode}
                                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                                maxLength={9}
                            />
                            {referralValid === true && <span className="absolute right-3 top-3.5 text-green-400 text-sm font-bold">✅</span>}
                            {referralValid === false && <span className="absolute right-3 top-3.5 text-red-400 text-xs font-bold">✗</span>}
                        </div>
                    )}

                    {!isSignUp && (

                        <div className="flex justify-end">
                            <button type="button" onClick={handleResetPassword} className="text-sm font-bold text-orange-400 hover:text-orange-300">
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

                    <button disabled={loading} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-70">
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                    
                    {isSignUp && (
                        <p className="mt-4 text-xs text-gray-400 text-center font-medium px-4">
                            By creating an account, you agree to EatAi's <a href="/terms" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">Terms of Service</a> and <a href="/privacy" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">Privacy Policy</a>.
                        </p>
                    )}
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

// --- 2. HOME VIEW ---
export const HomeView = ({ setCurrentView, user, setVendor, setCity, vendorsByLocation, vendorMetadata, marketData = [], addToCart, loadingData }) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [banners, setBanners] = useState([]);
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            setHasPermission(true);
        }
        getBanners().then(b => setBanners(b.filter(banner => banner.active !== false)));
    }, []);

    const handleNotificationClick = async () => {
        const token = await requestNotificationPermission(user.uid);
        if (token) setHasPermission(true);
    };

    // Food categories — each links to the vendor that sells it
    const FOOD_CATEGORIES = [
        {
            label: 'Shawarma',
            emoji: '🌯',
            img: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=200&q=80',
            vendor: 'Jaybee Shawarma',
            city: 'Ekpoma',
        },
        {
            label: 'Jollof Rice',
            emoji: '🍚',
            img: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=200&q=80',
            vendor: 'Big taste',
            city: 'Ekpoma',
        },
        {
            label: 'Burger',
            emoji: '🍔',
            img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80',
            vendor: 'Phattie Burger',
            city: 'Ekpoma',
        },
        {
            label: 'Snacks',
            emoji: '🍟',
            img: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=200&q=80',
            vendor: 'Golden Bite',
            city: 'Ekpoma',
        },
        {
            label: 'Drinks',
            emoji: '🥤',
            img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&q=80',
            vendor: 'Obest',
            city: 'Ekpoma',
        },
    ];

    const handleFoodCategoryTap = (cat) => {
        if (setCity) setCity(cat.city);
        if (setVendor) setVendor(cat.vendor);
        setCurrentView('market');
    };

    // Dynamic Top Vendors from Firebase — includes city for direct market routing
    const uniqueVendors = [...new Set(Object.values(vendorsByLocation || {}).flat())];

    const allTopVendors = uniqueVendors.map(vName => {
        const meta = vendorMetadata?.[vName] || {};
        const logo = meta.logo || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80';
        // Find which city this vendor belongs to
        const vendorCity = Object.keys(vendorsByLocation || {}).find(loc =>
            (vendorsByLocation[loc] || []).includes(vName)
        ) || null;
        const open = isVendorOpen(vName, vendorMetadata);
        return { name: vName, img: logo, city: vendorCity, meta, open };
    });

    const q = searchQuery.toLowerCase();
    const filteredVendors = allTopVendors.filter(v => v.name.toLowerCase().includes(q));

    // Full-site item search — food items across all vendors
    const filteredItems = q
        ? marketData.filter(item =>
            item.name?.toLowerCase().includes(q) ||
            item.vendor?.toLowerCase().includes(q) ||
            item.desc?.toLowerCase().includes(q)
          )
        : [];

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="flex flex-col h-full animate-fade-in pb-32 bg-gray-50 dark:bg-gray-950 overflow-y-auto">

            {/* HEADER */}
            <div className="px-5 pt-5 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <p className="text-gray-400 text-[11px] font-semibold uppercase tracking-widest">{greeting}</p>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight font-[Fredoka]">
                            {user ? user.displayName?.split(' ')[0] : 'Guest'} 👋
                        </h1>
                    </div>
                    {user ? (
                        <div onClick={() => setShowProfile(true)} className="w-10 h-10 cursor-pointer active:scale-95 transition-transform rounded-full overflow-hidden ring-2 ring-orange-400 ring-offset-2 shadow-md">
                            <img src={`https://ui-avatars.com/api/?name=${user?.displayName}&background=f97316&color=fff&bold=true`} alt="User" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <button onClick={() => setCurrentView('login')} className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-sm active:scale-95 transition-transform">
                            <User className="w-3.5 h-3.5" /> Sign In
                        </button>
                    )}
                </div>

                {/* SEARCH BAR */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl flex items-center gap-3 focus-within:ring-2 focus-within:ring-orange-400 transition-all shadow-sm">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search vendors or food..."
                        className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-white font-medium placeholder-gray-400 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* CATEGORIES ROW — sticky below header */}
            <div className="px-5 pt-3 pb-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-[116px] z-10">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
                    {FOOD_CATEGORIES.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleFoodCategoryTap(cat)}
                            className="shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
                        >
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-orange-50 dark:bg-gray-800 shadow-sm relative border-2 border-transparent group-hover:border-orange-400 transition-all">
                                <img
                                    src={cat.img}
                                    alt={cat.label}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div class='w-full h-full flex items-center justify-center text-2xl'>${cat.emoji}</div>`; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* PROMO BANNERS */}
                {banners.length > 0 && (
                    <div className="-mx-6 px-6 pb-2 pt-2 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4">
                        {banners.map(b => (
                            <div
                                key={b.id}
                                onClick={() => {
                                    if (!b.linkToVendor) return;
                                    const vendorName = b.linkToVendor.trim();
                                    // Find the city that contains this vendor
                                    const foundCity = Object.keys(vendorsByLocation || {}).find(loc =>
                                        (vendorsByLocation[loc] || []).some(v => v.toLowerCase() === vendorName.toLowerCase())
                                    );
                                    // Find exact-case vendor name from the list
                                    const exactVendor = foundCity
                                        ? (vendorsByLocation[foundCity] || []).find(v => v.toLowerCase() === vendorName.toLowerCase()) || vendorName
                                        : vendorName;
                                    if (foundCity) setCity(foundCity);
                                    setVendor(exactVendor);
                                    setCurrentView('market');
                                }}
                                className="snap-center shrink-0 w-[85%] sm:w-[60%] md:w-[45%] h-36 md:h-48 relative rounded-[1.5rem] overflow-hidden shadow-lg border-2 border-transparent hover:border-orange-500 transition-colors cursor-pointer group"
                            >
                                <img src={b.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                                    <h3 className="text-white font-black text-lg md:text-xl leading-tight font-[Fredoka] drop-shadow-md">{b.title}</h3>
                                    {b.linkToVendor && <span className="text-orange-400 text-xs font-bold mt-1 flex items-center gap-1">Shop {b.linkToVendor} <ArrowLeft className="w-3 h-3 rotate-180" /></span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* HERO BANNER */}
                <div className="relative w-full h-52 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-3xl overflow-hidden shadow-lg shadow-orange-400/30 flex items-center group cursor-pointer transition-transform active:scale-[0.99]" onClick={() => setCurrentView('location')}>
                    <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_80%,#fff_1px,transparent_1px),radial-gradient(circle_at_80%_20%,#fff_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                    <div className="relative z-10 pl-7 w-[55%] flex flex-col justify-center h-full">
                        <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-1 rounded-full mb-2.5 inline-flex items-center gap-1 w-fit border border-white/20 backdrop-blur-sm">⚡ FAST DELIVERY</span>
                        <h2 className="text-3xl font-black text-white leading-tight mb-3 font-[Fredoka] drop-shadow">Hungry?<br /><span className="text-orange-100">Order Now.</span></h2>
                        <span className="inline-flex items-center gap-2 bg-white text-orange-600 text-xs font-black px-3.5 py-2 rounded-full shadow-md w-fit group-hover:bg-orange-50 transition-colors active:scale-95">
                            Browse Vendors <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </span>
                    </div>

                    <div className="absolute -right-4 -bottom-4 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                    <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80" className="absolute right-0 bottom-0 w-52 h-52 object-cover rounded-full shadow-2xl transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 z-20 border-4 border-white/20 -mr-6 -mb-4" alt="Burger" />
                    <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80" className="absolute right-28 top-4 w-20 h-20 object-cover rounded-full shadow-lg opacity-80 rotate-12 z-10 border-2 border-white/30 group-hover:-rotate-12 transition-all duration-500" alt="Pizza" />
                </div>

                {/* FEATURED PICKS — right below the hero */}
                {(() => {
                    const featured = marketData.filter(item => item.featured);
                    if (featured.length === 0) return null;
                    return (
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-gray-900 dark:text-white font-bold text-lg font-[Fredoka]">⭐ Featured Picks</h3>
                                <span onClick={() => setCurrentView('location')} className="text-orange-500 text-xs font-bold cursor-pointer">See all</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                                {featured.map((item, idx) => (
                                    <div key={item.id || idx} className="shrink-0 w-44 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md active:scale-95 transition-transform relative">
                                        <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">{item.image || '🍽️'}</div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">⭐ FEATURED</span>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-black text-gray-900 dark:text-white leading-tight line-clamp-1 font-[Fredoka]">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 mb-2">{item.vendor}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-black text-orange-500">₦{(item.price || 0).toLocaleString()}</p>
                                                <button
                                                    onClick={() => addToCart && addToCart({ ...item, quantity: 1 })}
                                                    className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold h-7 w-7 rounded-full transition-colors flex items-center justify-center active:scale-90 shadow-sm shadow-orange-300"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* ALL VENDORS */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-900 dark:text-white font-bold text-lg font-[Fredoka]">All Vendors</h3>
                        {!searchQuery && <span onClick={() => setCurrentView('location')} className="text-orange-500 text-xs font-bold cursor-pointer hover:underline">Browse by city</span>}
                    </div>

                    {filteredVendors.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-6">No vendors found</p>
                    )}

                    {/* List view when searching, grid when browsing */}
                    {searchQuery ? (
                        <div className="flex flex-col gap-3">
                            {/* VENDOR MATCHES */}
                            {filteredVendors.length > 0 && (
                                <>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vendors</p>
                                    {filteredVendors.map((v, i) => (
                                        <div
                                            key={i}
                                            onClick={() => { if (v.city) setCity(v.city); setVendor(v.name); setCurrentView('market'); }}
                                            className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer group"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0">
                                                <img src={v.img} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.target.style.display = 'none'; }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-gray-900 dark:text-white text-sm font-[Fredoka] leading-tight">{v.name}</h4>
                                                {v.meta?.category && <p className="text-[10px] text-orange-500 font-bold capitalize">{v.meta.category}</p>}
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {v.meta?.avgWaitTime && <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {v.meta.avgWaitTime} min</span>}
                                                    {v.city && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-3 h-3 text-orange-400" /> {v.city}</span>}
                                                </div>
                                            </div>
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${v.open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {v.open ? 'OPEN' : 'CLOSED'}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* FOOD ITEM MATCHES */}
                            {filteredItems.length > 0 && (
                                <>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mt-2">Food Items</p>
                                    {filteredItems.map((item, idx) => {
                                        const itemCity = Object.keys(vendorsByLocation || {}).find(loc => (vendorsByLocation[loc] || []).includes(item.vendor)) || null;
                                        return (
                                            <div
                                                key={item.id || idx}
                                                onClick={() => { if (itemCity) setCity(itemCity); if (item.vendor) setVendor(item.vendor); setCurrentView('market'); }}
                                                className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer group"
                                            >
                                                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                                    {item.imageUrl
                                                        ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-2xl">{item.image || '🍽️'}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-1">{item.name}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{item.vendor}</p>
                                                    <p className="text-xs font-black text-orange-500 mt-0.5">₦{(item.price || 0).toLocaleString()}</p>
                                                </div>
                                                <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 shrink-0" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {filteredVendors.length === 0 && filteredItems.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-8">No results for "{searchQuery}"</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredVendors.map((v, i) => (
                                <div
                                    key={i}
                                    onClick={() => { if (v.city) setCity(v.city); setVendor(v.name); setCurrentView('market'); }}
                                    className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md border border-gray-100/80 dark:border-gray-800 active:scale-95 transition-all duration-150 cursor-pointer group"
                                >
                                    {/* Cover image */}
                                    <div className="relative h-32 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                        <img
                                            src={v.img}
                                            alt={v.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            onError={e => { e.target.style.display = 'none'; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                        {/* Open/Closed badge */}
                                        <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm ${v.open ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                            {v.open ? 'OPEN' : 'CLOSED'}
                                        </span>
                                        {/* Menu badge */}
                                        <span className="absolute top-2 right-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">MENU</span>
                                        {/* City pill at bottom of image */}
                                        {v.city && (
                                            <span className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                <MapPin className="w-2.5 h-2.5 text-orange-300" /> {v.city}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info section */}
                                    <div className="p-3">
                                        <h4 className="font-black text-gray-900 dark:text-white text-sm font-[Fredoka] leading-tight line-clamp-1">{v.name}</h4>
                                        {v.meta?.category && <p className="text-[10px] text-orange-500 font-bold mt-0.5 capitalize">{v.meta.category}</p>}
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Clock className="w-3 h-3 text-orange-400" />
                                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{v.meta?.avgWaitTime ? `${v.meta.avgWaitTime} min` : '15–30 min'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* NOTIFICATION PROMPT — only shown to logged-in users who haven't granted */}
                {user && !hasPermission && (
                    <button
                        onClick={handleNotificationClick}
                        className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 rounded-3xl px-4 py-3.5 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <div className="bg-blue-500 p-2.5 rounded-2xl text-white shrink-0 shadow-sm shadow-blue-300">
                            <Bell className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-blue-200">Enable order alerts</p>
                            <p className="text-xs text-gray-500 dark:text-blue-400 mt-0.5">Know the moment your food is ready</p>
                        </div>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 shrink-0 bg-blue-100 dark:bg-blue-800 px-2.5 py-1 rounded-full">Enable</span>
                    </button>
                )}



            </div>

            {/* OVERLAYS MOUNTED AT ROOT TO PREVENT CSS CLIPPING */}
            {showProfile && <ProfileOverlay user={user} onClose={() => setShowProfile(false)} setCurrentView={setCurrentView} />}

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
export const MarketView = ({ setCurrentView, addToCart, city, vendor, user, vendorMetadata }) => {
    const [category, setCategory] = useState('All');
    const [vendorSearch, setVendorSearch] = useState('');
    const [page, setPage] = useState(0);
    // Vendor-specific products fetched directly — no global pagination dependency
    const [vendorItems, setVendorItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const PAGE_SIZE = 7;

    // Fetch this vendor's products directly from Firestore on mount / vendor change
    useEffect(() => {
        if (!vendor) return;
        setLoadingItems(true);
        setVendorItems([]);
        import('../firebase.js').then(({ getProductsByVendor }) => {
            getProductsByVendor(vendor).then(data => {
                setVendorItems(data);
                setLoadingItems(false);
            });
        });
    }, [vendor]);

    // 🟢 CHECK HOURS
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = currentHour + (currentMinute / 60);

    const vendorInfo = vendorMetadata?.[vendor] || {};
    const openTime = parseFloat(vendorInfo.openTime?.replace(':', '.') || "8.00");
    const closeTime = parseFloat(vendorInfo.closeTime?.replace(':', '.') || "22.00");

    const isWithinHours = currentTime >= openTime && currentTime < closeTime;
    const isManuallyOffline = vendorInfo.isAcceptingOrders === false;
    const isOpen = isWithinHours && !isManuallyOffline;

    const handleNotify = async (item) => {
        if (!user) return alert("Please login first.");
        try {
            const success = await saveStockRequest(item, user.uid, user.email);
            if (success) alert(`🔔 Alert set for ${item.name}!`);
        } catch (e) { console.error(e); }
    };

    const items = vendorItems.filter(p => {
        const categoryMatch = category === 'All' ? true : p.category === category;
        const searchMatch = vendorSearch
            ? p.name?.toLowerCase().includes(vendorSearch.toLowerCase()) || p.desc?.toLowerCase().includes(vendorSearch.toLowerCase())
            : true;
        return categoryMatch && searchMatch;
    });

    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const safePage = Math.min(page, Math.max(0, totalPages - 1));
    const pageItems = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

    const categories = [{ id: 'All', label: 'All', icon: null }, { id: 'drinks', label: 'Drinks', icon: Zap }, { id: 'snacks', label: 'Snacks', icon: Cookie }];

    return (
        <ViewContainer title={`${vendor} Menu`} showBack onBack={() => setCurrentView('vendors')}>
            {/* CLOSED BANNER */}
            {!isOpen && (
                <div className="bg-red-500 text-white p-3 rounded-xl mb-4 flex items-center gap-2 shadow-md">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-sm">
                        {isManuallyOffline ? "Store is currently Offline" : `Closed · Opens ${vendorInfo.openTime || "8:00"}`}
                    </span>
                </div>
            )}

            {/* PREP TIME BANNER */}
            {isOpen && vendorInfo.avgWaitTime && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 mb-4 flex items-center gap-2 shadow-sm">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                        <span className="font-bold text-sm text-blue-800 dark:text-blue-300">Prep time: ~{vendorInfo.avgWaitTime} mins</span>
                        <span className="text-[10px] text-blue-400 dark:text-blue-500 block">Total delivery: ~{parseInt(vendorInfo.avgWaitTime) + 15}–{parseInt(vendorInfo.avgWaitTime) + 35} mins</span>
                    </div>
                </div>
            )}

            {/* SEARCH BAR */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl mb-3 focus-within:ring-2 focus-within:ring-orange-400 transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                    type="text"
                    placeholder={`Search ${vendor || 'menu'}...`}
                    value={vendorSearch}
                    onChange={e => { setVendorSearch(e.target.value); setPage(0); }}
                    className="bg-transparent border-none outline-none w-full text-sm text-gray-700 dark:text-white placeholder-gray-400 font-medium"
                />
                {vendorSearch && (
                    <button onClick={() => setVendorSearch('')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                {categories.map(cat => (
                    <DietaryFilter key={cat.id} icon={cat.icon} label={cat.label} active={category === cat.id} onClick={() => { setCategory(cat.id); setPage(0); }} />
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide min-h-0">
                {loadingItems ? (
                    <div className="grid grid-cols-1 gap-4 pb-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-32 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-4xl mb-3">🍽️</p>
                        <p className="font-bold text-gray-500 dark:text-gray-400">
                            {vendorSearch ? `No results for "${vendorSearch}"` : 'No items on the menu right now'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 pb-3">
                            {pageItems.map(item => (
                                <MarketProductCard
                                    key={item.id}
                                    item={item}
                                    onInteract={isOpen ? addToCart : () => alert("Vendor is currently closed.")}
                                    isOpen={isOpen}
                                    onNotify={handleNotify}
                                />
                            ))}
                        </div>

                        {/* PAGE NAVIGATION */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-1 py-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <button
                                    onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo(0,0); }}
                                    disabled={safePage === 0}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 active:scale-95 transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Prev
                                </button>
                                <span className="text-xs font-black text-gray-500 dark:text-gray-400">
                                    Page {safePage + 1} of {totalPages}
                                    <span className="text-gray-400 font-normal ml-1">({items.length} items)</span>
                                </span>
                                <button
                                    onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo(0,0); }}
                                    disabled={safePage >= totalPages - 1}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm bg-orange-500 text-white disabled:opacity-30 active:scale-95 transition-all shadow-md shadow-orange-300"
                                >
                                    Next <ArrowLeft className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </ViewContainer>
    );
};

// --- 5.5. DISPUTE MODAL ---
export const DisputeModal = ({ order, user, onClose }) => {
    const [issue, setIssue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!issue.trim()) return alert("Please describe your issue.");
        setSubmitting(true);
        try {
            const { submitDispute } = await import('../firebase.js');
            const vendor = order.items && order.items.length > 0 ? order.items[0].vendor : "Unknown";
            await submitDispute(order.id, user.uid, user.email, vendor, issue);
            alert("Dispute submitted. Support will contact you shortly.");
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to submit dispute.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in px-6">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative slide-up">
                <button onClick={onClose} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90 transition-all"><X className="w-5 h-5" /></button>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white font-[Fredoka] mb-2">Get Help With Order</h2>
                <p className="text-xs text-gray-500 mb-4 font-bold font-mono">#{order.id.slice(0, 6)}</p>
                <textarea
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="Describe the issue (e.g., missing items, food spilled, vendor closed)..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 resize-none h-32 text-sm mb-4"
                />
                <button onClick={handleSubmit} disabled={submitting} className="w-full bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-red-600 active:scale-95 transition-all text-sm outline-none">
                    {submitting ? "Submitting..." : "Submit to Live Support"}
                </button>
            </div>
        </div>
    );
};

// --- 6. ORDERS VIEW ---
export const OrdersView = ({ setCurrentView, user }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [retryingOrderId, setRetryingOrderId] = useState(null);
    const [disputingOrder, setDisputingOrder] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "orders"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

    // 🟢 RETRY: Reopen Paystack for a pending order
    const RetryPayButton = ({ order }) => {
        const retryRef = `${order.id}_retry_${Date.now()}`;
        const initRetryPayment = usePaystackPayment({
            reference: retryRef,
            email: user?.email,
            amount: order.total * 100,
            publicKey: PAYSTACK_KEY,
            metadata: { orderId: order.id },
        });

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setRetryingOrderId(order.id);
                    initRetryPayment(
                        (res) => { console.log('✅ Retry payment success:', res); setRetryingOrderId(null); },
                        () => { console.log('Retry popup closed'); setRetryingOrderId(null); }
                    );
                }}
                className="w-full mt-2 bg-orange-500 text-white py-2 rounded-xl text-xs font-bold shadow hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-1"
            >
                {retryingOrderId === order.id ? (
                    <><div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div> Opening...</>
                ) : (
                    <><CreditCard className="w-3 h-3" /> Pay Now — ₦{order.total.toLocaleString()}</>
                )}
            </button>
        );
    };

    return (
        <ViewContainer title="My Orders" showBack onBack={() => setCurrentView('home')}>
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onRate={handleRateProduct} />}
            {loading ? <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div> : orders.length === 0 ? <div className="text-center mt-10 text-gray-400"><Package className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>No orders yet.</p></div> : <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide space-y-3">{orders.map(order => (<div key={order.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div onClick={() => setSelectedOrder(order)} className="cursor-pointer active:scale-95 transition-transform">
                    <div className="flex justify-between mb-2"><span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : order.status === 'ready' ? 'bg-orange-100 text-orange-700 animate-pulse' : order.status === 'picked_up' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{order.status === 'ready' ? '🍽️ Food Ready! Rider on the way' : order.status.replace('_', ' ')}</span><span className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 6)}</span></div>
                    <div className="flex justify-between items-end"><div><p className="font-bold dark:text-white text-sm">{order.items.length} Items</p><p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="font-black text-orange-500 text-lg">₦{order.total.toLocaleString()}</p><p className="text-[10px] text-gray-400 font-medium">Tap for details</p></div></div>
                </div>
                {/* 🟢 RETRY: Show Pay Now button for pending Paystack orders */}
                {order.status === 'pending' && order.paymentMethod === 'paystack' && (
                    <RetryPayButton order={order} />
                )}
                {/* 🟢 DISPUTE: Show Get Help button for all active or past non-dead orders */}
                {order.status !== 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); setDisputingOrder(order); }} className="w-full mt-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Report Issue / Get Help
                    </button>
                )}
            </div>))}</div>}
            
            {disputingOrder && <DisputeModal order={disputingOrder} user={user} onClose={() => setDisputingOrder(null)} />}
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

// --- 9. CHECKOUT MODALS (WITH AUTO DISTANCE PRICING) ---
export const PaymentModal = ({ isOpen, onClose, total, paymentMethod, user, cart, globalWallet, onSuccess, city, vendorMetadata, vendor, deliveryPricingConfig, globalCustomerCoords }) => {
    if (!isOpen) return null;
    const [processing, setProcessing] = useState(false);
    const [paymentStage, setPaymentStage] = useState(null);
    const [orderType, setOrderType] = useState('delivery');
    const [form, setForm] = useState({ transferName: '', address: '', phone: '', landmark: '', deliveryAreaName: '' });
    const [activeMethod, setActiveMethod] = useState(paymentMethod || 'paystack');

    // 🟢 GPS State
    const [gpsState, setGpsState] = useState('idle'); // idle | loading | success | denied
    const [autoFeeResult, setAutoFeeResult] = useState(null); // result from getAutoDeliveryFee
    const [detectedAddress, setDetectedAddress] = useState(null); // human-readable address from Nominatim
    const [vendorHasGPS, setVendorHasGPS] = useState(true); // false if vendor hasn't set their location

    // 🟢 Address autocomplete state (used when GPS is missing or user prefers typing)
    const [customerCoords, setCustomerCoords] = useState(globalCustomerCoords); // local override
    
    // 🟢 Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [secureTotals, setSecureTotals] = useState(null);
    const [calculatingTotals, setCalculatingTotals] = useState(false);

    // 🎁 Credit State
    const [creditBalance, setCreditBalance] = useState(0);
    const [useCredits, setUseCredits] = useState(false);

    // Load credit balance on mount
    useEffect(() => {
        if (user?.uid) {
            import('../firebase.js').then(({ getUserCredits }) => {
                getUserCredits(user.uid).then(({ total }) => setCreditBalance(total));
            });
        }
    }, [user]);

    // 🟢 Calculate Max Wait Time
    const maxWaitTime = useMemo(() => {
        let max = 0;
        cart.forEach(item => {
            if (item.vendor && vendorMetadata && vendorMetadata[item.vendor]) {
                const vendorInfo = vendorMetadata[item.vendor];
                if (vendorInfo.avgWaitTime) {
                    const wait = parseInt(vendorInfo.avgWaitTime);
                    if (wait > max) max = wait;
                }
            }
        });
        return max;
    }, [cart, vendorMetadata]);

    // 🟢 Reverse geocode coords using OpenStreetMap Nominatim (free, no API key)
    const reverseGeocode = async (lat, lng) => {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await resp.json();
            // Build a short readable address from the response
            const a = data.address || {};
            const parts = [
                a.road || a.pedestrian || a.footway,
                a.suburb || a.neighbourhood || a.quarter,
                a.city || a.town || a.village || a.county,
            ].filter(Boolean);
            return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || 'Location detected';
        } catch {
            return 'Location detected';
        }
    };

    // 🟢 Reverse geocode global/local coords on mount or change if not already done
    useEffect(() => {
        const coordsToUse = customerCoords || globalCustomerCoords;
        if (!coordsToUse || detectedAddress) return;
        reverseGeocode(coordsToUse.lat, coordsToUse.lng).then(addr => {
            setDetectedAddress(addr);
            setForm(prev => ({ ...prev, address: prev.address || addr }));
        });
    }, [customerCoords, globalCustomerCoords, detectedAddress]);

    // 🟢 Auto-calculate fee whenever customer coords update
    useEffect(() => {
        const coordsToUse = customerCoords || globalCustomerCoords;
        if (!coordsToUse) return;
        const meta = vendorMetadata?.[vendor];
        if (meta?.lat && meta?.lng) {
            setVendorHasGPS(true);
            const result = getAutoDeliveryFee(meta.lat, meta.lng, coordsToUse.lat, coordsToUse.lng, cart, deliveryPricingConfig);
            setAutoFeeResult(result);
        } else {
            // Vendor has no GPS set — use base fee and warn
            setVendorHasGPS(false);
            setAutoFeeResult({ fee: deliveryPricingConfig?.baseFee || DEFAULT_PRICING.baseFee, distance: null, isAuto: false });
        }
    }, [customerCoords, globalCustomerCoords, vendor, vendorMetadata, cart, deliveryPricingConfig]);

    // 🟢 Delivery fee: auto distance if coords captured, else base fee
    const handleUseGPS = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported on this device.");

        // Try cached coords first — saves iOS users from repeated permission prompts
        try {
            const cached = localStorage.getItem('eatai_last_coords');
            if (cached) {
                const { lat, lng } = JSON.parse(cached);
                setCustomerCoords({ lat, lng });
                setGpsState('success');
                reverseGeocode(lat, lng).then(addr => {
                    setDetectedAddress(addr);
                    setForm(prev => ({ ...prev, address: prev.address || addr }));
                });
                return;
            }
        } catch { /* ignore */ }

        setGpsState('loading');
        setShowAddressSearch(false);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setCustomerCoords({ lat, lng });
                setGpsState('success');
                // Cache for future sessions
                try { localStorage.setItem('eatai_last_coords', JSON.stringify({ lat, lng })); } catch { }
                const addr = await reverseGeocode(lat, lng);
                setDetectedAddress(addr);
                setForm(prev => ({ ...prev, address: prev.address || addr }));
            },
            () => {
                setGpsState('denied');
            },
            // enableHighAccuracy: false is essential on older iOS to avoid GPS timeout
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
        );
    };

    // 🟢 Delivery fee: auto distance if coords captured, else base fee
    const activeCoords = customerCoords || globalCustomerCoords;
    const estimatedDeliveryFee = orderType === 'pickup' ? 0
        : activeCoords ? (autoFeeResult?.fee ?? (deliveryPricingConfig?.baseFee || DEFAULT_PRICING.baseFee))
            : (deliveryPricingConfig?.baseFee || DEFAULT_PRICING.baseFee);

    const estimatedTotal = total + estimatedDeliveryFee;
    const displayGrandTotal = secureTotals ? secureTotals.grandTotal : estimatedTotal;

    // Pre-generate unique order ID
    const [orderId] = useState(() => `eatai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    // PaystackTrigger is rendered conditionally (see JSX below) — no stale hook here
    const [paystackConfig, setPaystackConfig] = useState(null);

    const handleApplyPromoCode = async () => {
        if (!promoCode.trim()) return;
        if (orderType === 'delivery' && !activeCoords) return alert("Grant GPS access first to calculate delivery and discounts.");
        setCalculatingTotals(true);
        try {
            const calcFunc = httpsCallable(functions, 'calculateCheckoutTotals');
            const result = await calcFunc({ cart, customerCoords: activeCoords || null, deliveryType: orderType, promoCode: promoCode.trim() });
            setSecureTotals(result.data);
            setAppliedPromo(result.data.appliedPromo);
            alert(`Promo applied! ₦${result.data.discount.toLocaleString()} off.`);
        } catch (e) {
            alert(e.message);
            setAppliedPromo(null);
            setSecureTotals(null);
        } finally {
            setCalculatingTotals(false);
        }
    };

    useEffect(() => {
        if (user && isOpen) {
            getUserProfile(user.uid).then(data => {
                if (data) setForm(prev => ({ ...prev, address: data.address || '', phone: data.phone || '', landmark: data.landmark || '' }));
            });
        }
    }, [user, isOpen]);

    useEffect(() => {
        if (!paymentStage || paymentStage === 'confirmed') return;
        const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snapshot) => {
            if (snapshot.exists() && snapshot.data().status === 'confirmed') {
                setPaymentStage('confirmed');
                setTimeout(() => onSuccess(orderId), 2000);
            }
        });
        return () => unsubscribe();
    }, [paymentStage, orderId]);

    const handlePayment = async (method = activeMethod) => {
        if (orderType === 'delivery' && (!form.address || !form.phone)) return alert("Please enter your delivery address and phone number.");
        const activeCoords = customerCoords || globalCustomerCoords;
        if (orderType === 'delivery' && !activeCoords) return alert("We need your location to calculate delivery fees correctly. Provide your area above.");

        setProcessing(true);
        try {
            // Amount of credits to apply
            const creditsToApply = (useCredits && creditBalance > 0) ? creditBalance : 0;

            // SECURE MATH VERIFICATION
            const calcFunc = httpsCallable(functions, 'calculateCheckoutTotals');
            const result = await calcFunc({
                cart, customerCoords: activeCoords || null, deliveryType: orderType, promoCode: appliedPromo || null, creditsApplied: creditsToApply
            });

            const finalGrandTotal = result.data.grandTotal;
            const finalDeliveryFee = result.data.deliveryFee;

            // Always trust the server's verified total — update UI and proceed immediately
            setSecureTotals(result.data);

            if (method === 'paystack') {
                await createOrder(
                    user.uid, cart, finalGrandTotal, method,
                    globalWallet?.address, form.address, "Paystack Online",
                    form.phone, form.landmark, finalDeliveryFee,
                    'pending', orderType, '', orderId, activeCoords?.lat, activeCoords?.lng, appliedPromo,
                    result.data.discount, result.data.subTotal
                );
                await saveUserProfile(user.uid, { address: form.address, phone: form.phone, landmark: form.landmark });
                setProcessing(false);
                setPaymentStage('waiting');
                // 🟢 FIX: Mount PaystackTrigger with the fresh server-verified amount
                setPaystackConfig({
                    amount: finalGrandTotal,
                    email: user.email,
                    reference: orderId,
                    publicKey: PAYSTACK_KEY,
                });
            } else {
                await new Promise(r => setTimeout(r, 1500));
                await createOrder(
                    user.uid, cart, finalGrandTotal, method, globalWallet?.address, form.address, "Paystack Online", 
                    form.phone, form.landmark, finalDeliveryFee, 'pending', orderType, '', null, activeCoords?.lat, activeCoords?.lng, appliedPromo,
                    result.data.discount, result.data.subTotal
                );
                await saveUserProfile(user.uid, { address: form.address, phone: form.phone, landmark: form.landmark });
                setProcessing(false);
                onSuccess(orderId);
            }
        } catch (e) {
            setProcessing(false);
            alert("Error placing order: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* 🟢 FIX: PaystackTrigger mounts fresh with key=amount so it ALWAYS charges the correct server total */}
            {paystackConfig && (
                <PaystackTrigger
                    key={paystackConfig.amount}
                    amount={paystackConfig.amount}
                    email={paystackConfig.email}
                    reference={paystackConfig.reference}
                    publicKey={paystackConfig.publicKey}
                    onSuccess={(response) => { console.log('✅ Paystack payment complete:', response); }}
                    onClose={() => { setPaymentStage('closed'); setPaystackConfig(null); }}
                />
            )}
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-6 rounded-t-3xl md:rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 z-10"><X className="w-5 h-5" /></button>

                {/* ===== PAYMENT STATUS OVERLAY ===== */}
                {paymentStage && (
                    <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-8 text-center">
                        {paymentStage === 'waiting' && (
                            <>
                                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-xl font-black dark:text-white mb-2">Completing Payment...</h3>
                                <p className="text-sm text-gray-500 mb-1">Complete the payment in the Paystack window.</p>
                                <p className="text-xs text-gray-400 mb-6">This screen updates automatically once confirmed.</p>
                                <button onClick={() => setPaymentStage('closed')} className="text-xs text-gray-400 underline hover:text-orange-500 transition-colors">I'll pay later</button>
                            </>
                        )}
                        {paymentStage === 'confirmed' && (
                            <>
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-xl font-black text-green-700 mb-2">Payment Confirmed! ✅</h3>
                                <p className="text-sm text-gray-500">Your order is on its way. Redirecting...</p>
                            </>
                        )}
                        {paymentStage === 'closed' && (
                            <>
                                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-10 h-10 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-black dark:text-white mb-2">Payment Not Completed</h3>
                                <p className="text-sm text-gray-500 mb-4">You closed the payment window. Your order is saved as pending — you can pay anytime from <b>My Orders</b>.</p>
                                <div className="space-y-2 w-full max-w-xs">
                                    <button onClick={() => { setPaymentStage('waiting'); initializePayment((r) => console.log('✅ Retry:', r), () => setPaymentStage('closed')); }} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow hover:bg-orange-600 transition-colors">Try Again</button>
                                    <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Go to My Orders</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <h3 className="text-xl font-bold text-center mb-4 dark:text-white">Complete Order</h3>

                <div className="space-y-3">
                    {orderType === 'delivery' && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">

                            {/* 🟢 GPS SECTION */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-500">Delivery Location</label>
                                    {gpsState !== 'success' && !globalCustomerCoords && (
                                        <button
                                            onClick={handleUseGPS}
                                            disabled={gpsState === 'loading'}
                                            className="text-xs text-orange-500 font-bold flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Navigation className="w-3 h-3" />
                                            {gpsState === 'loading' ? 'Getting location...' : 'Use My GPS'}
                                        </button>
                                    )}
                                </div>

                                {/* GPS SUCCESS: show auto fee */}
                                {(globalCustomerCoords || gpsState === 'success') && autoFeeResult ? (
                                    <div className="space-y-2">
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span className="text-xs font-bold text-green-700 dark:text-green-400">Your Location Used</span>
                                                <button onClick={() => { setGpsState('idle'); setCustomerCoords(null); setShowAddressSearch(true); setAutoFeeResult(null); setDetectedAddress(null); }} className="ml-auto text-xs text-gray-400 underline">Change</button>
                                            </div>
                                            {detectedAddress && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium pl-6">{detectedAddress}</p>
                                            )}
                                            {autoFeeResult.distance !== null && (
                                                <p className="text-xs text-gray-400 pl-6 mt-0.5">~{autoFeeResult.distance} km from vendor</p>
                                            )}
                                        </div>
                                        {/* Vendor GPS missing warning */}
                                        {!vendorHasGPS && (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-400">
                                                ⚠️ <b>Flat rate applied.</b> The vendor hasn't set their pickup location yet, so we can't calculate the exact distance. Estimated fee: <b>₦{estimatedDeliveryFee.toLocaleString()}</b>
                                            </div>
                                        )}
                                        {vendorHasGPS && (
                                            <p className="text-sm font-black text-orange-500 px-1">Delivery Fee: ₦{secureTotals ? secureTotals.deliveryFee.toLocaleString() : estimatedDeliveryFee.toLocaleString()}
                                                {autoFeeResult.isMultiVendor && <span className="text-[10px] text-gray-400 font-normal ml-1">(+₦350 multi-vendor)</span>}
                                            </p>
                                        )}
                                    </div>
                                ) : null}

                                {/* GPS DENIED or missing: with iOS instructions */}
                                {(gpsState === 'denied' || (!globalCustomerCoords && gpsState !== 'success')) && (
                                    <div className="space-y-3 p-4 bg-gray-50 border rounded-xl dark:bg-gray-800 dark:border-gray-700 mb-4 mt-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center shrink-0">
                                                <Navigation className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Location needed for delivery fee</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">We need your location to calculate pricing.</p>
                                            </div>
                                        </div>
                                        <button onClick={handleUseGPS} disabled={gpsState === 'loading'} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 transition text-sm">
                                            {gpsState === 'loading' ? '⏳ Detecting location...' : '📍 Use My Location'}
                                        </button>
                                        {gpsState === 'denied' && (
                                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                                <p className="font-bold">📱 On iPhone? Here's how to fix it:</p>
                                                <p>1. Go to <b>Settings → Safari → Location</b></p>
                                                <p>2. Set to <b>"Ask"</b> or <b>"Allow"</b></p>
                                                <p>3. Come back and tap "Use My Location" again</p>
                                                <p className="text-amber-600 dark:text-amber-400 mt-1">Or type your address manually below ↓</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div><label className="text-xs font-bold text-gray-500">Street Address</label><input className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. 12 Market Road" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                        </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                        <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-gray-500">Phone</label><input type="tel" className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="080..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
                    </div>
                </div>

                {/* ORDER SUMMARY */}
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Order Summary</p>
                        {maxWaitTime > 0 && orderType === 'delivery' && (
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" /> ~{maxWaitTime} mins delivery
                            </span>
                        )}
                    </div>
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

                {/* ORDER BREAKDOWN */}
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>Food Subtotal</span>
                        <span>₦{(secureTotals ? secureTotals.subTotal : total).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                        <span>Delivery Fee</span>
                        <span>₦{(secureTotals ? secureTotals.deliveryFee : estimatedDeliveryFee).toLocaleString()}</span>
                    </div>
                    {secureTotals?.discount > 0 && (
                        <div className="flex justify-between text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/20 p-2 rounded-lg -mx-2">
                            <span>Promo Applies to Food ({appliedPromo})</span>
                            <span>- ₦{secureTotals.discount.toLocaleString()}</span>
                        </div>
                    )}
                    
                    {/* CREDITS TOGGLE */}
                    {creditBalance > 0 && (
                        <div className={`p-3 rounded-lg flex items-center justify-between border transition-all cursor-pointer ${useCredits ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`} onClick={() => { setUseCredits(!useCredits); setSecureTotals(null); }}>
                            <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">🎁 Use Credits</p>
                                <p className="text-[10px] text-gray-500">Balance: ₦{creditBalance.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${useCredits ? 'text-orange-600' : 'text-gray-400'}`}>
                                    - ₦{(Math.min(estimatedTotal, creditBalance)).toLocaleString()}
                                </span>
                                <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${useCredits ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${useCredits ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-3 border-t dark:border-gray-700">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Grand Total:</div>
                        <div className="text-2xl font-black text-orange-600">
                            ₦{useCredits && !secureTotals ? Math.max(0, displayGrandTotal - creditBalance).toLocaleString() : displayGrandTotal.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* PROMO CODE SECTION */}
                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-bold text-gray-500 mb-2 block flex justify-between">
                        <span>Have a Promo Code?</span>
                        {appliedPromo && <span className="text-green-500">Applied! (-20%)</span>}
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase font-bold text-sm disabled:opacity-50" 
                            placeholder="E.g. CELEB20" 
                            value={promoCode} 
                            disabled={appliedPromo}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                        />
                        {!appliedPromo ? (
                            <button 
                                className="bg-orange-500 text-white px-4 rounded-lg font-bold text-xs shadow hover:bg-orange-600 disabled:opacity-50" 
                                onClick={handleApplyPromoCode}
                                disabled={calculatingTotals}
                            >
                                {calculatingTotals ? '...' : 'Apply'}
                            </button>
                        ) : (
                            <button 
                                className="bg-red-500 text-white px-4 rounded-lg font-bold text-xs shadow" 
                                onClick={() => {setAppliedPromo(null); setPromoCode(''); setSecureTotals(null);}}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl flex gap-1">
                    <button onClick={() => setActiveMethod('paystack')} className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${activeMethod === 'paystack' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-white' : 'text-gray-400'}`}>
                        <div className="flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" /> Paystack</div>
                    </button>
                </div>

                {activeMethod === 'paystack' ? (
                    (orderType === 'delivery' && (!form.address || (!customerCoords && !globalCustomerCoords))) ?
                        <button disabled className="w-full mt-4 bg-gray-300 dark:bg-gray-700 text-white font-bold py-4 rounded-xl cursor-not-allowed">Enter Delivery Details</button> :
                        <button onClick={() => handlePayment('paystack')} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Pay Now'}</button>
                ) : (<button onClick={() => handlePayment('crypto')} disabled={processing} className="w-full mt-4 bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg">{processing ? 'Processing...' : 'Confirm Crypto Transfer'}</button>)}
            </div>
        </div>
    );
};

// Helper: check if a vendor is currently open based on their openTime/closeTime in vendorMetadata
// openTime and closeTime are "HH:MM" strings in 24h format, e.g. "08:00" / "21:00"
const isVendorOpen = (vendorName, vendorMetadata) => {
    if (!vendorMetadata || !vendorMetadata[vendorName]) return true; // assume open if no data
    const meta = vendorMetadata[vendorName];
    if (!meta.openTime || !meta.closeTime) return true; // assume open if hours not configured
    const now = new Date();
    const [openH, openM] = meta.openTime.split(':').map(Number);
    const [closeH, closeM] = meta.closeTime.split(':').map(Number);
    const open = openH * 60 + openM;
    const close = closeH * 60 + closeM;
    const current = now.getHours() * 60 + now.getMinutes();
    // Handle overnight vendors (e.g. open 20:00 close 02:00)
    if (close < open) return current >= open || current < close;
    return current >= open && current < close;
};


// ==========================================
// ORDER CONFIRMED MODAL
// ==========================================
const OrderConfirmedModal = ({ onClose, waitTime, orderId }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
            <div style={{ width: '100%', maxWidth: '480px', background: 'linear-gradient(160deg, #0a1832 0%, #050d1f 100%)', borderRadius: '28px 28px 0 0', padding: '36px 28px 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 -8px 48px rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.15)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', marginBottom: '4px' }} />
                <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(29,78,216,0.18))', border: '2.5px solid rgba(249,115,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(249,115,22,0.3), 0 0 64px rgba(249,115,22,0.1)', animation: 'pulse-ring 2s ease-in-out infinite' }}>
                    <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>✅</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Order Received! 🎉</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem', margin: 0 }}>Your order is confirmed and being prepared.</p>
                </div>
                {waitTime > 0 && (
                    <div style={{ width: '100%', background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(29,78,216,0.14))', border: '1.5px solid rgba(249,115,22,0.3)', borderRadius: '18px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1 }}>🛵</div>
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 3px' }}>Rider ETA</p>
                            <p style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>Your rider will call you within <span style={{ background: 'linear-gradient(90deg, #f97316, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{waitTime} minutes</span></p>
                        </div>
                    </div>
                )}
                {orderId && (
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Order ID</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontFamily: 'monospace', letterSpacing: '1px' }}>{orderId.slice(-10).toUpperCase()}</span>
                    </div>
                )}
                <button onClick={onClose} style={{ width: '100%', maxWidth: '360px', padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 8px 24px rgba(249,115,22,0.4)', transition: 'all 0.15s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e => e.currentTarget.style.transform='scale(1)'} onTouchStart={e => e.currentTarget.style.transform='scale(0.97)'} onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>
                    📦 Track My Order
                </button>
                <style>{`@keyframes pulse-ring { 0%,100%{box-shadow:0 0 32px rgba(249,115,22,0.3),0 0 64px rgba(249,115,22,0.1)}50%{box-shadow:0 0 48px rgba(249,115,22,0.55),0 0 96px rgba(249,115,22,0.18)} }`}</style>
            </div>
        </div>
    );
};

export const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal, globalWallet, user, setCart, city, vendorMetadata, vendor, deliveryPricingConfig, globalCustomerCoords }) => {
    const [paymentMethod, setPaymentMethod] = useState('paystack');
    const [showModal, setShowModal] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState(null);

    // Cart validation: keyed by cartId → { type: 'soldOut'|'priceChanged'|'removed', oldPrice?, newPrice? }
    const [cartWarnings, setCartWarnings] = useState({});
    const [validating, setValidating] = useState(false);

    // Validate every cart item against current Firestore state whenever the cart panel opens
    useEffect(() => {
        if (currentView !== 'cart' || cart.length === 0) return;

        const validate = async () => {
            setValidating(true);
            const warnings = {};
            const updatedCart = cart.map(i => ({ ...i }));

            await Promise.all(cart.map(async (item, idx) => {
                if (!item.id) return;
                try {
                    const snap = await getDoc(doc(db, 'products', item.id));
                    if (!snap.exists()) {
                        warnings[item.cartId] = { type: 'removed' };
                        return;
                    }
                    const current = snap.data();
                    if ((current.stock ?? 1) === 0) {
                        warnings[item.cartId] = { type: 'soldOut' };
                    } else if (current.price !== item.price) {
                        warnings[item.cartId] = { type: 'priceChanged', oldPrice: item.price, newPrice: current.price };
                        updatedCart[idx] = { ...updatedCart[idx], price: current.price };
                    }
                } catch { /* network issue — skip silently */ }
            }));

            setCartWarnings(warnings);
            // Silently sync prices in cart state
            const pricesDiffer = updatedCart.some((u, i) => u.price !== cart[i].price);
            if (pricesDiffer) setCart(updatedCart);
            setValidating(false);
        };

        validate();
    }, [currentView]); // re-validate every time cart opens

    const hasBadItem = Object.values(cartWarnings).some(w => w.type === 'soldOut' || w.type === 'removed');

    // Compute max wait time across vendors in cart
    const cartMaxWaitTime = useMemo(() => {
        let max = 0;
        cart.forEach(item => {
            const meta = vendorMetadata?.[item.vendor];
            if (meta?.avgWaitTime) { const t = parseInt(meta.avgWaitTime); if (t > max) max = t; }
        });
        return max;
    }, [cart, vendorMetadata]);

    const handleOrderSuccess = (placedOrderId) => {
        setShowModal(false);
        setCart([]);
        setCartWarnings({});
        setConfirmedOrder({ orderId: placedOrderId, waitTime: cartMaxWaitTime });
    };

    // Check if every vendor in the cart is currently open
    const closedVendors = [...new Set(cart.map(item => item.vendor).filter(Boolean))]
        .filter(v => !isVendorOpen(v, vendorMetadata));
    const hasClosedVendor = closedVendors.length > 0;

    return (
        <>
            {confirmedOrder && (
                <OrderConfirmedModal
                    orderId={confirmedOrder.orderId}
                    waitTime={confirmedOrder.waitTime}
                    onClose={() => { setConfirmedOrder(null); setCurrentView('orders'); }}
                />
            )}
            <PaymentModal isOpen={showModal} onClose={() => setShowModal(false)} total={cartTotal} paymentMethod={paymentMethod} user={user} cart={cart} globalWallet={globalWallet} onSuccess={handleOrderSuccess} city={city} vendorMetadata={vendorMetadata} vendor={vendor} deliveryPricingConfig={deliveryPricingConfig} globalCustomerCoords={globalCustomerCoords} />
            {/* CART SLIDE-IN PANEL */}
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
                <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} onClick={() => setCurrentView(marketSection ? 'market' : 'home')} />
                <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 transform rounded-l-3xl ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* CART HEADER */}
                    <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white font-[Fredoka]">My Cart</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                        </div>
                        <button onClick={() => setCurrentView(marketSection ? 'market' : 'home')} className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white active:scale-90 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* CART ITEMS */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
                        {/* Validation banner */}
                        {validating && (
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-xs text-gray-500 font-semibold">
                                <div className="animate-spin w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full shrink-0" />
                                Checking item availability...
                            </div>
                        )}
                        {!validating && hasBadItem && (
                            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">Some items are no longer available. Remove them to proceed.</p>
                            </div>
                        )}

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
                                <div className="w-24 h-24 bg-orange-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <ShoppingCart className="w-10 h-10 text-orange-300" />
                                </div>
                                <p className="text-gray-900 dark:text-white font-black text-lg font-[Fredoka]">Your cart is empty</p>
                                <p className="text-gray-400 text-sm mt-1">Add items from a vendor to get started</p>
                                <button onClick={() => setCurrentView('location')} className="mt-5 bg-orange-500 text-white font-bold px-6 py-3 rounded-2xl text-sm active:scale-95 transition-transform shadow-md shadow-orange-300">
                                    Browse Vendors
                                </button>
                            </div>
                        ) : (
                            cart.map(item => {
                                const warning = cartWarnings[item.cartId];
                                const isBad = warning?.type === 'soldOut' || warning?.type === 'removed';
                                return (
                                    <div key={item.cartId} className={`flex items-center gap-3 rounded-2xl p-3 relative ${isBad ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                        <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700 ${isBad ? 'opacity-50' : ''}`}>
                                            {item.imageUrl
                                                ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-2xl">{item.image || '🍽️'}</div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm leading-tight line-clamp-1 ${isBad ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{item.name}</p>
                                            {warning?.type === 'soldOut' && <p className="text-[10px] font-black text-red-500 mt-0.5">Sold out — remove to checkout</p>}
                                            {warning?.type === 'removed' && <p className="text-[10px] font-black text-red-500 mt-0.5">No longer available</p>}
                                            {warning?.type === 'priceChanged' && (
                                                <p className="text-[10px] font-black text-amber-600 mt-0.5">
                                                    Price updated: <s className="opacity-60">₦{(warning.oldPrice || 0).toLocaleString()}</s> → ₦{(warning.newPrice || 0).toLocaleString()}
                                                </p>
                                            )}
                                            {!warning && item.selectedAddons && item.selectedAddons.length > 0 && (
                                                <p className="text-[10px] text-orange-500 font-semibold mt-0.5">+ {item.selectedAddons.map(a => a.name).join(', ')}</p>
                                            )}
                                            {!isBad && (
                                                <p className="text-xs font-black text-orange-500 mt-1">
                                                    ₦{(item.price + (item.selectedAddons ? item.selectedAddons.reduce((s, a) => s + (a.price || 0), 0) : 0)).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => { removeFromCart(item.cartId); setCartWarnings(prev => { const n = { ...prev }; delete n[item.cartId]; return n; }); }} className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 transition-all shrink-0">
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* CART FOOTER */}
                    {cart.length > 0 && (
                        <div className="px-5 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3 rounded-l-3xl">

                            {/* ETA pill */}
                            {cartMaxWaitTime > 0 && (
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl px-4 py-3">
                                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-blue-800 dark:text-blue-200">Est. Delivery: ~{cartMaxWaitTime + 15}–{cartMaxWaitTime + 35} mins</p>
                                        <p className="text-[10px] text-blue-400">{cartMaxWaitTime} min prep + rider time</p>
                                    </div>
                                </div>
                            )}

                            {/* Subtotal */}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-gray-500 text-sm font-semibold">Subtotal</span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">₦{cartTotal.toLocaleString()}</span>
                            </div>

                            {/* Closed vendor warning */}
                            {hasClosedVendor && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 text-center">
                                    <p className="text-red-600 dark:text-red-400 font-black text-sm">🔴 Vendor Closed</p>
                                    <p className="text-red-500 text-xs mt-1">
                                        <b>{closedVendors.join(', ')}</b> {closedVendors.length > 1 ? 'are' : 'is'} closed.
                                        {vendorMetadata?.[closedVendors[0]]?.openTime && <> Opens {vendorMetadata[closedVendors[0]].openTime}.</>}
                                    </p>
                                </div>
                            )}

                            {/* Guest wall / Checkout button */}
                            {!user ? (
                                <div className="space-y-2">
                                    <p className="text-center text-xs text-gray-500 font-semibold">Sign in to place your order</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentView('login')} className="flex-1 bg-orange-500 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform shadow-md shadow-orange-300">Create Account</button>
                                        <button onClick={() => setCurrentView('login')} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform">Log In</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowModal(true)}
                                    disabled={hasClosedVendor || hasBadItem || validating}
                                    className={`w-full font-black py-4 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg ${(hasClosedVendor || hasBadItem || validating) ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-400/40'}`}
                                >
                                    {validating ? 'Checking items...' : hasClosedVendor ? 'Cannot Checkout — Vendor Closed' : hasBadItem ? 'Remove unavailable items first' : `Checkout  ₦${cartTotal.toLocaleString()}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};