import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc, 
  query, where, getDocs, writeBatch, increment, onSnapshot, orderBy 
} from "firebase/firestore";

// 🔴 PASTE YOUR FIREBASE CONFIG HERE 🔴
const firebaseConfig = {
  apiKey: "AIzaSyBm5DntiyXX5PCWnNsMybJIC9UetJvyrz8",
  authDomain: "eatai-production-70b82.firebaseapp.com",
  projectId: "eatai-production-70b82",
  storageBucket: "eatai-production-70b82.firebasestorage.app",
  messagingSenderId: "439773552354",
  appId: "1:439773552354:web:6d7e35fc4541a1708148bb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// --- AUTH ---
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { email: result.user.email, name: result.user.displayName, walletAddress: null });
    }
    return result.user;
  } catch (error) { console.error("Error signing in", error); }
};

export const logout = async () => { await signOut(auth); };

export const saveWalletToProfile = async (uid, address) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { walletAddress: address }, { merge: true });
  } catch (e) { console.error(e); }
};

// --- DATA LOGIC ---

// 🟢 UPDATED: Now accepts 'status' parameter
export const createOrder = async (userId, cart, total, paymentMethod, walletAddress, address, transferName, phone, landmark, deliveryFee, status = 'pending') => {
  try {
    const ordersRef = collection(db, "orders");
    await addDoc(ordersRef, {
      userId, 
      items: cart, 
      total: parseFloat(total), 
      paymentMethod, 
      walletAddress: walletAddress || null,
      deliveryAddress: address, 
      phone, 
      landmark, 
      deliveryFee, 
      transferName: transferName || null,
      status: status, // <--- Dynamic Status (confirmed/pending)
      createdAt: new Date().toISOString()
    });
    
    const batch = writeBatch(db);
    cart.forEach((item) => {
      const productRef = doc(db, "products", item.id);
      batch.update(productRef, { stock: increment(-1) });
    });
    await batch.commit();
  } catch (e) { console.error(e); throw e; }
};

export const getUserOrders = async (userId) => {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

export const getAllProducts = async () => {
  const querySnapshot = await getDocs(collection(db, "products"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (productData) => {
  await addDoc(collection(db, "products"), productData);
};

export const updateProduct = async (productId, updatedData) => {
  await updateDoc(doc(db, "products", productId), updatedData);
};

export const deleteProduct = async (productId) => {
  await deleteDoc(doc(db, "products", productId));
};

// EXPORT FIRESTORE FUNCTIONS FOR APP.JSX
export { collection, query, where, onSnapshot, orderBy };

// --- SEEDING ---
export const seedDatabase = async () => {
  // ... (Seed data remains same, omitted for brevity) ...
  alert("Database Seeding Function Called"); 
};