import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, updateDoc, 
  query, where, getDocs, writeBatch, increment 
} from "firebase/firestore";

// ------------------------------------------------------------------
// 🔴 PASTE YOUR FIREBASE CONFIG OBJECT HERE 🔴
// (Go to Firebase Console > Project Settings > General > Your Apps)
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBm5DntiyXX5PCWnNsMybJIC9UetJvyrz8",
  authDomain: "eatai-production-70b82.firebaseapp.com",
  projectId: "eatai-production-70b82",
  storageBucket: "eatai-production-70b82.firebasestorage.app",
  messagingSenderId: "439773552354",
  appId: "1:439773552354:web:6d7e35fc4541a1708148bb"
};

const app = initializeApp(firebaseConfig);

// --- EXPORTS ---
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// --- AUTHENTICATION ---
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    
    // Create user profile if it doesn't exist
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

// --- ORDERS & STOCK MANAGEMENT ---

const updateStockLevels = async (cart) => {
  const batch = writeBatch(db);
  cart.forEach((item) => {
    const productRef = doc(db, "products", item.id);
    // Atomically decrement stock
    batch.update(productRef, { stock: increment(-1) });
  });
  await batch.commit();
};

// UPDATED: Create Order accepts delivery details
export const createOrder = async (userId, cart, total, paymentMethod, walletAddress, address, transferName, phone, landmark, deliveryFee) => {
  try {
    const ordersRef = collection(db, "orders");
    const newOrder = await addDoc(ordersRef, {
      userId,
      items: cart,
      total: parseFloat(total),
      paymentMethod, // 'transfer', 'card', 'crypto'
      walletAddress: walletAddress || null,
      deliveryAddress: address,
      phone: phone,           
      landmark: landmark,     
      deliveryFee: deliveryFee, 
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

// Get Orders for a specific User (History)
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

// ADMIN: Get ALL Orders (For Manager Dashboard)
export const getAllOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "orders")); 
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("Error fetching all orders:", e);
    return [];
  }
};

// ADMIN: Update Order Status (Confirm/Deliver)
export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
  } catch (e) {
    console.error("Error updating status:", e);
    throw e;
  }
};

// --- PRODUCTS & INVENTORY ---

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

// NEW: Update existing product (For Edit Mode)
export const updateProduct = async (productId, updatedData) => {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, updatedData);
  } catch (e) {
    console.error("Error updating product: ", e);
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

// SEED: Initial Data with Locations
export const seedDatabase = async () => {
  const MOCK_DATA = [
    // IRRUA ITEMS
    { category: 'fullMeal', location: 'Irrua', stock: 10, name: 'Irrua Special Rice', price: 2500, image: '🍚', desc: 'Served with local stew', vendor: 'Mama Irrua' },
    { category: 'pregnancy', location: 'Irrua', stock: 20, name: 'Pepper Soup', price: 1500, image: '🥘', desc: 'Spicy goat meat', vendor: 'Irrua Kitchen' },
    
    // EKPOMA ITEMS
    { category: 'fullMeal', location: 'Ekpoma', stock: 15, name: 'Amala & Ewedu', price: 2000, image: '🥣', desc: 'Hot and fresh', vendor: 'Ekpoma Spot' },
    { category: 'fitness', location: 'Ekpoma', stock: 10, name: 'Fruit Parfait', price: 3500, image: '🍧', desc: 'Yogurt and fruits', vendor: 'Campus Fit' },

    // UROMI ITEMS
    { category: 'male', location: 'Uromi', stock: 10, name: 'Roasted Fish', price: 4000, image: '🐟', desc: 'With chips', vendor: 'Uromi Grill' },
    { category: 'normal', location: 'Uromi', stock: 30, name: 'Meat Pie', price: 800, image: '🥧', desc: 'Oven fresh', vendor: 'Uromi Snacks' }
  ];

  const batch = writeBatch(db);
  MOCK_DATA.forEach((item) => {
    const docRef = doc(collection(db, "products"));
    batch.set(docRef, item);
  });

  await batch.commit();
  alert("Database Seeded with Locations! Refresh the page.");
};