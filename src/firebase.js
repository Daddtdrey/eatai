import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc, 
  query, where, getDocs, writeBatch, increment, onSnapshot, orderBy, runTransaction,
  limit, startAfter
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { VAPID_KEY } from "./config.js";






// 🔴 PASTE YOUR FIREBASE CONFIG HERE 🔴
const firebaseConfig = {
  apiKey: "AIzaSyBm5DntiyXX5PCWnNsMybJIC9UetJvyrz8",
  authDomain: "eatai-production-70b82.firebaseapp.com",
  projectId: "eatai-production-70b82",
  storageBucket: "eatai-production-70b82.firebasestorage.app",
  messagingSenderId: "439773552354",
  appId: "1:439773552354:web:6d7e35fc4541a1708148bb"
};

// ☁️ CLOUDINARY CONFIG
const CLOUDINARY_CLOUD_NAME = "dmsq7n9k6"; 
const CLOUDINARY_PRESET = "eatai_preset"; 

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// ==========================================
// 1. AUTHENTICATION
// ==========================================
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { 
          email: result.user.email, 
          name: result.user.displayName,
          createdAt: new Date().toISOString()
      });
    }
    return result.user;
  } catch (error) { console.error("Error signing in", error); }
};

export const signUpWithEmail = async (email, password, name) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await setDoc(doc(db, "users", result.user.uid), {
      email: email,
      name: name,
      createdAt: new Date().toISOString()
    });
    return result.user;
  } catch (error) { throw error; }
};

export const logInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) { throw error; }
};

export const logout = async () => { await signOut(auth); };

// ==========================================
// 2. USER & ADMIN DATA
// ==========================================
export const getAdminRole = async (email) => {
    if (!email) return null;
    try {
        const docRef = doc(db, "admins", email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { 
                type: data.type || data.role, 
                vendor: data.vendor || data.vendorName 
            };
        }
        const q = query(collection(db, "admins"), where("email", "==", email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return { 
                type: data.type || data.role, 
                vendor: data.vendor || data.vendorName 
            };
        }
        return null;
    } catch (e) { return null; }
};

export const saveUserProfile = async (userId, data) => {
    try {
        await setDoc(doc(db, "users", userId), data, { merge: true });
    } catch(e) { console.error("Error saving profile", e); }
};

export const getUserProfile = async (userId) => {
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch(e) { return null; }
};

export const saveWalletToProfile = async (uid, address) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { walletAddress: address }, { merge: true });
  } catch (e) { console.error(e); }
};

// ==========================================
// 3. IMAGES & VENDORS
// ==========================================
export const uploadImage = async (file) => {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET); 
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url; 
  } catch (e) { return null; }
};

export const saveVendorLogo = async (vendorName, file) => {
    const url = await uploadImage(file);
    if(url) { await setDoc(doc(db, "vendors", vendorName), { logo: url, name: vendorName }, { merge: true }); }
    return url;
};

export const getVendorLogos = async () => {
    try {
        const snapshot = await getDocs(collection(db, "vendors"));
        const logos = {};
        snapshot.forEach(doc => { logos[doc.id] = doc.data().logo; });
        return logos;
    } catch(e) { return {}; }
};

// 🟢 NEW: RETURNS METADATA (HOURS) TOO
export const getGlobalVendors = async () => {
    try {
        const q = query(collection(db, "vendors"));
        const snapshot = await getDocs(q);
        const vendorsByLocation = {};
        const vendorMetadata = {}; // Store open/close times here
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.isActive !== false) { 
                let rawLocs = data.location;
                if (typeof rawLocs === 'string' && rawLocs.includes(',')) {
                    rawLocs = rawLocs.split(',').map(s => s.trim());
                } else if (!Array.isArray(rawLocs)) {
                    rawLocs = [rawLocs || "Irrua"];
                }
                
                const locations = rawLocs.map(l => l.charAt(0).toUpperCase() + l.slice(1).toLowerCase());
                
                locations.forEach(loc => {
                    if (!vendorsByLocation[loc]) vendorsByLocation[loc] = [];
                    if (!vendorsByLocation[loc].includes(doc.id)) {
                        vendorsByLocation[loc].push(doc.id);
                    }
                });

                // Store metadata (Times default to 8am - 10pm if missing)
                vendorMetadata[doc.id] = {
                    openTime: data.openTime || "08:00",
                    closeTime: data.closeTime || "18:00",
                    logo: data.logo
                };
            }
        });
        return { vendorsByLocation, vendorMetadata };
    } catch (e) {
        console.error("Error fetching vendors:", e);
        return null;
    }
};

// ==========================================
// 4. ORDERS & PRODUCTS
// ==========================================
export const getPaginatedProducts = async (lastDoc = null, pageSize = 20) => {
    try {
        let q;
        if (lastDoc) {
            q = query(collection(db, "products"), limit(pageSize), startAfter(lastDoc));
        } else {
            q = query(collection(db, "products"), limit(pageSize));
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        return { data, lastVisible };
    } catch (e) {
        console.error("Pagination error:", e);
        return { data: [], lastVisible: null };
    }
};

export const getAllProducts = async () => {
  const querySnapshot = await getDocs(collection(db, "products"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (productData) => {
  await addDoc(collection(db, "products"), { ...productData, createdAt: new Date().toISOString() });
};

export const updateProduct = async (id, data) => { await updateDoc(doc(db, "products", id), data); };
export const deleteProduct = async (id) => { await deleteDoc(doc(db, "products", id)); };

// 🟢 UPDATED: ACCEPTS ORDER TYPE (PICKUP/DELIVERY)
export const createOrder = async (userId, cart, total, paymentMethod, walletAddress, address, transferName, phone, landmark, deliveryFee, status = 'pending', orderType = 'delivery') => {
  try {
    await runTransaction(db, async (transaction) => {
      const itemCounts = {};
      cart.forEach(item => {
          itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
      });
      const updates = []; 
      
      for (const [productId, quantity] of Object.entries(itemCounts)) {
        const productRef = doc(db, "products", productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists()) throw `Item no longer available.`;
        
        const currentStock = productDoc.data().stock;
        if (currentStock < quantity) throw `Not enough stock for "${productDoc.data().name}".`;
        
        updates.push({ ref: productRef, newStock: currentStock - quantity });
      }

      updates.forEach(update => {
          transaction.update(update.ref, { stock: update.newStock });
      });

      const newOrderRef = doc(collection(db, "orders"));
      transaction.set(newOrderRef, {
        userId, 
        items: cart, 
        total: parseFloat(total), 
        paymentMethod, 
        walletAddress: walletAddress || null, 
        deliveryAddress: orderType === 'pickup' ? 'PICKUP' : address, 
        phone, 
        landmark: orderType === 'pickup' ? 'PICKUP' : landmark, 
        deliveryFee, 
        transferName: transferName || null,
        status: status,
        orderType: orderType, // 🟢 New Field
        createdAt: new Date().toISOString()
      });
    });
  } catch (e) { 
      console.error("Transaction failed: ", e); 
      throw e; 
  }
};

export const getUserOrders = async (userId) => {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) { return []; }
};

export const getAllOrders = async () => {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q); 
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { return []; }
};

export const updateOrderStatus = async (orderId, status) => {
  await updateDoc(doc(db, "orders", orderId), { status });
};

export const addReview = async (productId, userId, userName, rating, comment, orderId) => {
    try {
        await runTransaction(db, async (transaction) => {
            const reviewRef = doc(collection(db, "reviews"));
            transaction.set(reviewRef, { productId, userId, userName, rating, comment, orderId, createdAt: new Date().toISOString() });

            const productRef = doc(db, "products", productId);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
                const data = productDoc.data();
                const oldRatingCount = data.ratingCount || 0;
                const oldAverage = data.rating || 0;
                const newRatingCount = oldRatingCount + 1;
                const newAverage = ((oldAverage * oldRatingCount) + rating) / newRatingCount;
                transaction.update(productRef, { rating: parseFloat(newAverage.toFixed(1)), ratingCount: newRatingCount });
            }
        });
        return true;
    } catch (e) {
        console.error("Error adding review:", e);
        return false;
    }
};

// ==========================================
// 6. NOTIFICATIONS & ALERTS
// ==========================================
export const requestNotificationPermission = async (userId, role, vendorName) => {
  try {
    if (!('Notification' in window)) return alert("Notifications not supported.");
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }); 
      
      if(userId && token) {
          await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });
          if (role === 'logistics' || role === 'super') {
             await setDoc(doc(db, "notifications", "logistics_group"), { [userId]: token }, { merge: true });
          }
          if ((role === 'sub' || role === 'vendor') && vendorName) {
             await setDoc(doc(db, "notifications", vendorName), { token: token, email: userId }, { merge: true });
          }
          alert("Success! Device registered for alerts.");
      }
      return token;
    } else {
        alert("Notifications denied.");
    }
  } catch (error) { 
      console.error("Notification Error:", error); 
      alert("Error setting up notifications: " + error.message);
  }
};

export const onMessageListener = () => new Promise((resolve) => { 
    onMessage(messaging, (payload) => { 
        console.log("Foreground Message:", payload);
        resolve(payload); 
    }); 
});

export const saveStockRequest = async (item, userId, userEmail) => {
    try {
        await addDoc(collection(db, "stock_requests"), {
            productId: item.id,
            productName: item.name,
            vendor: item.vendor,
            userId: userId,
            userEmail: userEmail || "Anonymous",
            createdAt: new Date().toISOString(),
            status: "pending"
        });
        return true;
    } catch (e) {
        console.error("Error saving stock request:", e);
        return false;
    }
};

// ==========================================
// 7. EXPORTS
// ==========================================
export { collection, query, where, onSnapshot, orderBy, limit, startAfter };
export const seedDatabase = async () => { console.log("Seeding available."); };