import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc,
  query, where, getDocs, writeBatch, increment, orderBy 
} from "firebase/firestore";

// ------------------------------------------------------------------
// 🔴 PASTE YOUR CONFIG HERE (Same as before)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBm5DntiyXX5PCWnNsMybJIC9UetJvyrz8",
  authDomain: "eatai-production-70b82.firebaseapp.com",
  projectId: "eatai-production-70b82",
  storageBucket: "eatai-production-70b82.firebasestorage.app",
  messagingSenderId: "439773552354",
  appId: "1:439773552354:web:6d7e35fc4541a1708148bb"
};
// ------------------------------------------------------------------

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// --- AUTHENTICATION ---
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: result.user.email,
        name: result.user.displayName,
        walletAddress: null
      });
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in", error);
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const saveWalletToProfile = async (uid, address) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { walletAddress: address }, { merge: true });
  } catch (e) {
    console.error("Error linking wallet:", e);
  }
};

// --- ORDERS & STOCK ---

const updateStockLevels = async (cart) => {
  const batch = writeBatch(db);
  cart.forEach((item) => {
    const productRef = doc(db, "products", item.id);
    batch.update(productRef, { stock: increment(-1) });
  });
  await batch.commit();
};

// UPDATED: Create Order now accepts Address and Transfer Name
export const createOrder = async (userId, cart, total, paymentMethod, walletAddress, address, transferName) => {
  try {
    const ordersRef = collection(db, "orders");
    const newOrder = await addDoc(ordersRef, {
      userId,
      items: cart,
      total: parseFloat(total),
      paymentMethod, // 'transfer', 'card', 'crypto'
      walletAddress: walletAddress || null,
      deliveryAddress: address,
      transferName: transferName || null,
      status: 'pending', // pending -> confirmed -> delivered
      createdAt: new Date().toISOString()
    });

    await updateStockLevels(cart);
    return newOrder.id;
  } catch (e) {
    console.error("Error placing order:", e);
    throw e;
  }
};

// Get Orders for a specific User
export const getUserOrders = async (userId) => {
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("Error fetching user orders:", e);
    return [];
  }
};

// NEW: Admin Get ALL Orders
export const getAllOrders = async () => {
  try {
    const ordersRef = collection(db, "orders");
    // Ideally use orderBy('createdAt', 'desc') but requires an index. 
    // We sort in JS to avoid index errors for now.
    const querySnapshot = await getDocs(ordersRef); 
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("Error fetching all orders:", e);
    return [];
  }
};

// NEW: Admin Update Status (Confirm Order)
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
  } catch (e) {
    console.error("Error updating status:", e);
    throw e;
  }
};

// --- PRODUCTS ---

export const getAllProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching products:", e);
    return [];
  }
};

export const addProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, "products"), productData);
    return docRef.id;
  } catch (e) {
    console.error("Error adding product: ", e);
    throw e;
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (e) {
    console.error("Error deleting product: ", e);
    throw e;
  }
};

export const seedDatabase = async () => {
  const MOCK_DATA = [
    { category: 'fullMeal', stock: 5, name: 'Jollof Rice Combo', price: 2500, image: '🍚', desc: 'Spicy rice with chicken & plantain', vendor: 'Mama Cass' },
    { category: 'pregnancy', stock: 50, name: 'Pickles & Ice Cream', price: 1500, image: '🥒', desc: 'The classic combo', vendor: 'Cold Stone' },
  ];
  const batch = writeBatch(db);
  MOCK_DATA.forEach((item) => {
    const docRef = doc(collection(db, "products"));
    batch.set(docRef, item);
  });
  await batch.commit();
  alert("Database Seeded!");
};