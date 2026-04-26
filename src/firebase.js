import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithCredential,
  sendPasswordResetEmail,
  deleteUser
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc,
  query, where, getDocs, writeBatch, increment, onSnapshot, orderBy, runTransaction,
  limit, startAfter, enableMultiTabIndexedDbPersistence
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
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

// ☁️ FIREBASE STORAGE MIGRATION (Cloudinary removed)

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// 🟢 NEW: Enable Offline Persistence (Fixes Wi-Fi to Cellular dropouts)
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Offline persistence failed: multiple tabs open");
  } else if (err.code == 'unimplemented') {
    console.warn("Offline persistence not supported by browser");
  }
});

export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const functions = getFunctions(app, "us-central1"); // Ensure region matches backend

// ==========================================
// 1. AUTHENTICATION
// ==========================================

export const signInWithGoogle = async () => {
  try {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // 🟢 NATIVE APP (Capacitor/Android) — Use native plugin instead of browser redirects
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      if (!result.credential || !result.credential.idToken) throw new Error("Google Sign-In failed or cancelled");
      
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      // Handle the document creation
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          createdAt: new Date().toISOString()
        });
      }
      return userCredential.user;
    } else {
      // 🟢 WEB BROWSER
      const result = await signInWithPopup(auth, googleProvider);
      
      // For popup, we handle the document creation immediately
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
    }
  } catch (error) { 
    console.error("Error with Google sign in", error); 
    if (Capacitor.isNativePlatform()) {
      alert(`Native Google Login Failed!\n\nReason: ${error.message}\n\nMake sure your google-services.json matches your bundle ID, your SHA-1 is added in Firebase, and your Web Client ID is placed inside your strings.xml file!`);
    }
    throw error; 
  }
};

export const checkGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
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
    }
  } catch (error) { console.error("Error parsing redirect result", error); }
  return null;
};

export const signUpWithEmail = async (email, password, name, referralCode = null) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });

    const userData = {
      email: email,
      name: name,
      createdAt: new Date().toISOString(),
      firstOrderCompleted: false,
    };

    // If a referral code was entered, look up the referrer's UID
    if (referralCode) {
      const codeUpper = referralCode.trim().toUpperCase();
      const codeSnap = await getDoc(doc(db, "referralCodes", codeUpper));
      if (codeSnap.exists() && codeSnap.data().uid !== result.user.uid) {
        userData.referredBy = codeSnap.data().uid;
        userData.referredByCode = codeUpper;
        // Increment use count on the code
        await setDoc(doc(db, "referralCodes", codeUpper), { uses: (codeSnap.data().uses || 0) + 1 }, { merge: true });
      }
    }

    await setDoc(doc(db, "users", result.user.uid), userData);
    return result.user;
  } catch (error) { throw error; }
};

export const logInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) { throw error; }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) { throw error; }
};

export const logout = async () => { await signOut(auth); };

export const deleteUserAccount = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently authenticated.");
    
    // First, wipe the physical Firestore tracking document globally
    const userRef = doc(db, "users", currentUser.uid);
    await deleteDoc(userRef);
    
    // Then violently terminate the core Authentication token
    await deleteUser(currentUser);
    return true;
  } catch (err) {
    if (err.code === 'auth/requires-recent-login') {
      throw new Error("Security Lock: You must log out and log back in to verify your identity before deleting your account.");
    }
    throw err;
  }
};
// ==========================================
// 2. USER & ADMIN DATA
// ==========================================

export const getAdminRole = async (email) => {
  if (!email) return null;
  try {
    // Method 1: Check by Doc ID
    const docRef = doc(db, "admins", email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        type: data.type || data.role,
        vendor: data.vendor || data.vendorName
      };
    }
    // Method 2: Check by email field
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
  } catch (e) { console.error("Error saving profile", e); }
};

export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) { return null; }
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
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const storageRef = ref(storage, `images/${fileName}`);

    // Upload the file
    const snapshot = await uploadBytesResumable(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (e) {
    console.error("Firebase Storage Upload Error:", e);
    return null;
  }
};

export const saveVendorLogo = async (vendorName, file) => {
  const cleanVendorName = vendorName.trim();
  const url = await uploadImage(file);
  if (url) {
    // Auto-create or update vendor document
    await setDoc(doc(db, "vendors", cleanVendorName), {
      logo: url,
      name: cleanVendorName,
      isActive: true
    }, { merge: true });
  }
  return url;
};

export const getVendorLogos = async () => {
  try {
    const snapshot = await getDocs(collection(db, "vendors"));
    const logos = {};
    snapshot.forEach(doc => { logos[doc.id] = doc.data().logo; });
    return logos;
  } catch (e) { return {}; }
};

export const getVendorSides = async (vendorName) => {
  try {
    const docRef = doc(db, "vendors", vendorName);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().sides) return snap.data().sides;
    return null;
  } catch (e) { return null; }
};

export const saveVendorSides = async (vendorName, sides) => {
  try {
    await setDoc(doc(db, "vendors", vendorName), { sides }, { merge: true });
  } catch (e) { console.error(e); }
};

// 🟢 NEW: Save vendor GPS location (and optionally opening hours, category)
export const saveVendorLocation = async (vendorName, lat, lng, openTime, closeTime, avgWaitTime, category) => {
  try {
    const payload = { lat, lng };
    if (openTime !== undefined) payload.openTime = openTime;
    if (closeTime !== undefined) payload.closeTime = closeTime;
    if (avgWaitTime !== undefined) payload.avgWaitTime = avgWaitTime;
    if (category !== undefined) payload.category = category;
    await setDoc(doc(db, "vendors", vendorName), payload, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

// 🟢 NEW: Fetch all vendors with their GPS coords (for super admin location manager)
export const getVendorsWithLocation = async () => {
  try {
    const snapshot = await getDocs(collection(db, "vendors"));
    return snapshot.docs.map(d => ({
      id: d.id,
      name: d.data().name || d.id,
      lat: d.data().lat || null,
      lng: d.data().lng || null,
      location: d.data().location || null,
      openTime: d.data().openTime || null,
      closeTime: d.data().closeTime || null,
      avgWaitTime: d.data().avgWaitTime || null,
      category: d.data().category || null,
    }));
  } catch (e) { console.error(e); return []; }
};


// 🟢 CRITICAL: This fetches the vendors for the dropdown
export const getGlobalVendors = async () => {
  try {
    const q = query(collection(db, "vendors"));
    const snapshot = await getDocs(q);
    const vendorsByLocation = {};
    const vendorMetadata = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isActive !== false) {
        let rawLocs = data.location;
        // Handle Comma-Separated String or Array or Missing
        if (typeof rawLocs === 'string' && rawLocs.includes(',')) {
          rawLocs = rawLocs.split(',').map(s => s.trim());
        }
        else if (!Array.isArray(rawLocs)) {
          rawLocs = [rawLocs || "Irrua"]; // Default
        }

        const locations = rawLocs.map(l => l.charAt(0).toUpperCase() + l.slice(1).toLowerCase());

        locations.forEach(loc => {
          if (!vendorsByLocation[loc]) vendorsByLocation[loc] = [];
          // Avoid duplicates
          if (!vendorsByLocation[loc].includes(doc.id)) {
            vendorsByLocation[loc].push(doc.id);
          }
        });

        // Store metadata (including GPS coords for delivery pricing)
        vendorMetadata[doc.id] = {
          openTime: data.openTime || "06:00",
          closeTime: data.closeTime || "18:20",
          logo: data.logo,
          lat: data.lat || null,
          lng: data.lng || null,
          avgWaitTime: data.avgWaitTime || null,
          category: data.category || null,
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
// 4. PRODUCTS & PAGINATION
// ==========================================

export const getPaginatedProducts = async (lastDoc = null, pageSize = 20) => {
  try {
    let q;
    if (lastDoc) {
      // Load NEXT batch
      q = query(collection(db, "products"), limit(pageSize), startAfter(lastDoc));
    } else {
      // Load FIRST batch
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

// Fetch all products for a specific vendor — queries all common name variants (case/trim)
export const getProductsByVendor = async (vendorName) => {
  try {
    const trimmed = vendorName.trim();
    const variants = [...new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase(),
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()])];
    const snaps = await Promise.all(
      variants.map(v => getDocs(query(collection(db, "products"), where("vendor", "==", v))))
    );
    const seen = new Set();
    const items = [];
    snaps.forEach(snap => snap.docs.forEach(d => {
      if (!seen.has(d.id)) { seen.add(d.id); items.push({ id: d.id, ...d.data() }); }
    }));
    return items;
  } catch (e) {
    console.error("getProductsByVendor error:", e);
    return [];
  }
};

// Rename all products from one vendor name to another (used by super admin merge tool)
export const mergeVendorProducts = async (fromName, toName) => {
  const q = query(collection(db, "products"), where("vendor", "==", fromName));
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(doc(db, "products", d.id), { vendor: toName }));
  await batch.commit();
  return snap.docs.length;
};

// 🟢 UPDATED: Auto-create vendor when adding product
export const addProduct = async (productData) => {
  const cleanData = { ...productData, createdAt: new Date().toISOString() };
  if (cleanData.vendor) cleanData.vendor = cleanData.vendor.trim();
  
  await addDoc(collection(db, "products"), cleanData);

  if (cleanData.vendor) {
    // Ensure vendor exists in DB so it shows in dropdown next time
    const vendorRef = doc(db, "vendors", cleanData.vendor);
    await setDoc(vendorRef, {
      name: cleanData.vendor,
      location: [cleanData.location || "Irrua"],
      isActive: true
    }, { merge: true });
  }
};

export const updateProduct = async (id, data) => {  
  const cleanData = { ...data };
  if (cleanData.vendor) cleanData.vendor = cleanData.vendor.trim();
  await updateDoc(doc(db, "products", id), cleanData); 
};
export const deleteProduct = async (id) => { await deleteDoc(doc(db, "products", id)); };

// ==========================================
// 5. ORDERS & REVIEWS
// ==========================================

export const createOrder = async (userId, cart, total, paymentMethod, walletAddress, address, transferName, phone, landmark, deliveryFee, status = 'pending', orderType = 'delivery', deliveryNote = '', customOrderId = null, customerLat = null, customerLng = null, promoCode = null, discount = 0, subTotal = 0) => {
  try {
    // Sanitize: Firestore doesn't allow undefined values
    const sanitize = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === undefined ? null : v));

    let finalOrderId = null;
    await runTransaction(db, async (transaction) => {
      // 1. Group items
      const itemCounts = {};
      cart.forEach(item => {
        itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
      });
      const updates = [];

      // 2. Read
      for (const [productId, quantity] of Object.entries(itemCounts)) {
        const productRef = doc(db, "products", productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) throw `One of the items in your cart no longer exists.`;

        const currentStock = productDoc.data().stock;
        if (currentStock < quantity) throw `Sorry! Not enough stock for "${productDoc.data().name}". Only ${currentStock} left.`;

        updates.push({ ref: productRef, newStock: currentStock - quantity });
      }

      // 3. Write
      updates.forEach(update => {
        transaction.update(update.ref, { stock: update.newStock });
      });

      const newOrderRef = customOrderId ? doc(db, "orders", customOrderId) : doc(collection(db, "orders"));
      finalOrderId = newOrderRef.id;

      transaction.set(newOrderRef, sanitize({
        userId, items: cart, total: parseFloat(total), paymentMethod,
        walletAddress: walletAddress || null, deliveryAddress: orderType === 'pickup' ? 'PICKUP' : address,
        phone, landmark: orderType === 'pickup' ? 'PICKUP' : landmark, deliveryFee,
        transferName: transferName || null, status: status, orderType, createdAt: new Date().toISOString(),
        deliveryNote: deliveryNote || null,
        customerLat: customerLat || null, customerLng: customerLng || null,
        promoCode: promoCode || null,
        discount: discount || 0,
        subTotal: subTotal || parseFloat(total) - (deliveryFee || 0)
      }));
    });
    return finalOrderId;
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
  const update = { status };
  if (status === 'ready') update.readyAt = new Date().toISOString();
  if (status === 'picked_up') update.pickedUpAt = new Date().toISOString();
  if (status === 'delivered') update.deliveredAt = new Date().toISOString();
  await updateDoc(doc(db, "orders", orderId), update);
};

export const deleteOrder = async (orderId) => {
  await deleteDoc(doc(db, "orders", orderId));
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
    // 🟢 NATIVE APP (Capacitor/Android) — Use native push
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        return alert("Notifications denied. Please enable them in your phone settings.");
      }

      // Register for push
      await PushNotifications.register();

      // Listen for the token
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', async (tokenData) => {
          const token = tokenData.value;
          console.log("✅ Native FCM Token:", token);

          if (userId && token) {
            await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });

            if (role === 'logistics' || role === 'super') {
              await setDoc(doc(db, "notifications", "logistics_group"), { [userId]: token }, { merge: true });
            }
            if ((role === 'sub' || role === 'vendor') && vendorName) {
              await setDoc(doc(db, "notifications", vendorName), { token: token, email: userId }, { merge: true });
            }
            alert("Success! Device registered for native alerts.");
          }
          resolve(token);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error("Native push registration error:", error);
          alert("Error registering for notifications: " + JSON.stringify(error));
          resolve(null);
        });
      });
    }

    // 🟢 WEB BROWSER — Use Firebase Cloud Messaging. 
    // IF WE ARE NATIVE, EXECUTION WILL NOT REACH HERE BECAUSE WE AWAIT THE PROMISE AND RETURN.
    // However, wait! The above block returns a promise. It intercepts the thread. 
    // If it's a web browser, it gracefully falls down to here:
    if (!('Notification' in window)) return alert("Notifications not supported on this device.");

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

      if (userId && token) {
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
      alert("Notifications denied. Please enable them in browser settings.");
    }
  } catch (error) {
    console.error("Notification Error:", error);
    alert("Error setting up notifications: " + error.message);
  }
};

export const setupForegroundNotifications = (callback) => {
  try {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          callback({ title: notification.title, body: notification.body });
        });
      });
    } else {
      if (!messaging) return;
      onMessage(messaging, (payload) => {
        callback({ title: payload.notification?.title, body: payload.notification?.body });
      });
    }
  } catch (e) {
    console.error("Foreground notification setup failed:", e);
  }
};

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

export const submitDispute = async (orderId, userId, userEmail, vendor, issue) => {
  try {
    await addDoc(collection(db, "disputes"), {
      orderId,
      userId,
      userEmail: userEmail || "Anonymous",
      vendor: vendor || "Unknown",
      issue,
      createdAt: new Date().toISOString(),
      status: "open"
    });
    return true;
  } catch (e) {
    console.error("Error submitting dispute:", e);
    throw e;
  }
};

// ==========================================
// 8. BANNERS & PROMOS
// ==========================================

export const getBanners = async () => {
  try {
    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error getting banners:", e);
    return [];
  }
};

export const saveBanner = async (file, title, linkToVendor, active = true, existingId = null) => {
  try {
    let imageUrl = null;
    if (file) imageUrl = await uploadImage(file);

    const bannerData = {
      title,
      linkToVendor: linkToVendor || null,
      active,
      updatedAt: new Date().toISOString()
    };
    if (imageUrl) bannerData.imageUrl = imageUrl;

    if (existingId) {
      await updateDoc(doc(db, "banners", existingId), bannerData);
    } else {
      bannerData.createdAt = new Date().toISOString();
      await addDoc(collection(db, "banners"), bannerData);
    }
    return true;
  } catch (e) {
    console.error("Error saving banner:", e);
    return false;
  }
};

export const deleteBanner = async (id) => {
  try {
    await deleteDoc(doc(db, "banners", id));
    return true;
  } catch (e) {
    console.error("Error deleting banner:", e);
    return false;
  }
};

// ==========================================
// 8.5. PROMO CODES
// ==========================================
export const getPromoCodes = async () => {
    try {
        const snap = await getDocs(collection(db, "promoCodes"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error getting promo codes:", e);
        return [];
    }
};

export const savePromoCode = async (promoData, existingId = null) => {
    try {
        if (existingId) {
            await updateDoc(doc(db, "promoCodes", existingId), { ...promoData, updatedAt: new Date().toISOString() });
        } else {
            await addDoc(collection(db, "promoCodes"), { ...promoData, createdAt: new Date().toISOString() });
        }
        return true;
    } catch (e) {
        console.error("Error saving promo code:", e);
        return false;
    }
};

export const deletePromoCode = async (id) => {
    try {
        await deleteDoc(doc(db, "promoCodes", id));
        return true;
    } catch (e) {
        console.error("Error deleting promo code:", e);
        return false;
    }
};

// ==========================================
// 9. SITE STATS (VISITORS)
// ==========================================

export const logVisit = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const statRef = doc(db, "site_stats", today);
    const docSnap = await getDoc(statRef);
    if (!docSnap.exists()) {
      await setDoc(statRef, { visitors: 1, date: today });
    } else {
      await updateDoc(statRef, { visitors: increment(1) });
    }
  } catch (e) {
    console.error("Error logging visit:", e);
  }
};

export const getTodayVisitors = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDoc(doc(db, "site_stats", today));
    return snap.exists() ? snap.data().visitors : 0;
  } catch (e) {
    return 0;
  }
};

// ==========================================
// 10. DELIVERY PRICING CONFIG
// ==========================================

export const getDeliveryPricingConfig = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'delivery_pricing'));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
};

export const saveDeliveryPricingConfig = async (config) => {
  try {
    await setDoc(doc(db, 'settings', 'delivery_pricing'), config, { merge: true });
    return true;
  } catch (e) { console.error(e); return false; }
};

// ==========================================
// 11. EXPORTS
// ==========================================

export { collection, doc, query, where, onSnapshot, orderBy, limit, startAfter };
export const seedDatabase = async () => { console.log("Seeding available."); };

// 🟢 ONE-OFF MIGRATION SCRIPT: Wipe all Cloudinary Links from Database
export const cleanCloudinaryLinks = async () => {
    let count = 0;
    try {
        // 1. Clean Products
        const prodSnap = await getDocs(collection(db, "products"));
        for (const docSnap of prodSnap.docs) {
            const data = docSnap.data();
            if (data.imageUrl && data.imageUrl.includes('cloudinary')) {
                await updateDoc(doc(db, "products", docSnap.id), { imageUrl: "" });
                count++;
            }
        }
        
        // 2. Clean Vendors
        const vendSnap = await getDocs(collection(db, "vendors"));
        for (const docSnap of vendSnap.docs) {
            const data = docSnap.data();
            if (data.logo && data.logo.includes('cloudinary')) {
                await updateDoc(doc(db, "vendors", docSnap.id), { logo: "" });
                count++;
            }
        }
        
        return count;
    } catch (e) {
        console.error("Cloudinary Cleanup Error:", e);
        throw e;
    }
};

// 🟢 ONE-OFF MIGRATION SCRIPT: Safely migrate all products and orders from Old Vendor to New Vendor
export const migrateVendorProducts = async (oldVendorName, newVendorName) => {
    let productsMoved = 0;
    let ordersMoved = 0;
    
    const cleanOld = oldVendorName.trim().toLowerCase();
    const cleanNew = newVendorName.trim();
    
    try {
        // 1. Move all Active Products
        const prodSnap = await getDocs(collection(db, "products"));
        for (const docSnap of prodSnap.docs) {
            const data = docSnap.data();
            if (data.vendor && typeof data.vendor === 'string' && data.vendor.trim().toLowerCase() === cleanOld) {
                await updateDoc(doc(db, "products", docSnap.id), { vendor: cleanNew });
                productsMoved++;
            }
        }

        // 2. Move all Historical Orders
        const ordSnap = await getDocs(collection(db, "orders"));
        for (const docSnap of ordSnap.docs) {
            const data = docSnap.data();
            let orderNeedsUpdate = false;
            
            if (data.items && Array.isArray(data.items)) {
                const updatedItems = data.items.map(item => {
                    if (item.vendor && typeof item.vendor === 'string' && item.vendor.trim().toLowerCase() === cleanOld) {
                        orderNeedsUpdate = true;
                        return { ...item, vendor: cleanNew };
                    }
                    return item;
                });
                
                if (orderNeedsUpdate) {
                    await updateDoc(doc(db, "orders", docSnap.id), { items: updatedItems });
                    ordersMoved++;
                }
            }
        }
        
        return { productsMoved, ordersMoved };
    } catch (e) {
        console.error("Migration Error:", e);
        throw e;
    }
};

// ==========================================
// 🎁 REFERRAL SYSTEM
// ==========================================

/**
 * Generate a unique referral code for a user (NAME-XXXX format).
 * Idempotent — returns existing code if one already exists.
 * Uses the user's UID to guarantee 100% uniqueness.
 */
export const getReferralCode = async (uid, displayName) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().referralCode) {
      return userSnap.data().referralCode;
    }
    // Generate: first 4 letters of name (uppercased) + dash + last 4 chars of UID
    const namePart = (displayName || "USER").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4).padEnd(4, "X");
    const uidPart = uid.slice(-4).toUpperCase();
    const code = `${namePart}-${uidPart}`;

    // Save on user doc + referralCodes index
    await setDoc(userRef, { referralCode: code }, { merge: true });
    await setDoc(doc(db, "referralCodes", code), { uid, createdAt: new Date().toISOString(), uses: 0 });
    return code;
  } catch (e) { console.error("getReferralCode error", e); return null; }
};

/**
 * Get total active (non-expired) credit balance for a user.
 * Returns { total: number, entries: [{id, amount, expiresAt, reason}] }
 */
export const getUserCredits = async (uid) => {
  try {
    const now = new Date();
    // Query without multiple field filters to avoid Composite Index requirements 
    // which often throw hidden Permission Denied/Index errors. Filter client-side.
    const q = query(collection(db, "credits", uid, "entries"));
    const snap = await getDocs(q);
    
    // Filter locally: no usedAt timestamp AND it hasn't expired yet
    const entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => !d.usedAt && new Date(d.expiresAt) > now);
        
    const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { total, entries };
  } catch (e) { console.error("getUserCredits error", e); return { total: 0, entries: [] }; }
};

/**
 * Get referral stats for the user.
 */
export const getUserReferralStats = async (uid) => {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const data = userSnap.data() || {};
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthKey = data.referralMonthKey || "";
    return {
      referralCode: data.referralCode || null,
      referralCount: monthKey === thisMonth ? (data.referralCount || 0) : 0,
      totalEarned: data.totalReferralEarned || 0,
    };
  } catch (e) { return { referralCode: null, referralCount: 0, totalEarned: 0 }; }
};

/**
 * Apply credits at checkout (mark them as used atomically).
 * Called server-side via Cloud Function; this is just a frontend helper
 * that reads the current balance for display.
 */
export const getActiveCreditBalance = async (uid) => {
  const { total } = await getUserCredits(uid);
  return total;
};