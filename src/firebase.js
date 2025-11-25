import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, 
  query, where, getDocs, writeBatch 
} from "firebase/firestore";

// PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
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

// --- ORDERS ---
export const createOrder = async (userId, cart, total, paymentMethod, walletAddress) => {
  try {
    const ordersRef = collection(db, "orders");
    const newOrder = await addDoc(ordersRef, {
      userId,
      items: cart,
      total: parseFloat(total),
      paymentMethod,
      walletAddress: walletAddress || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return newOrder.id;
  } catch (e) {
    console.error("Error placing order:", e);
    throw e;
  }
};

export const getUserOrders = async (userId) => {
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("Error fetching orders:", e);
    return [];
  }
};

// --- PRODUCTS & ADMIN ---

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
    { category: 'fullMeal', name: 'Jollof Rice Combo', price: 12.99, image: '🍚', desc: 'Spicy rice with chicken & plantain', vendor: 'Mama Cass' },
    { category: 'fullMeal', name: 'Grilled Salmon Bowl', price: 18.50, image: '🐟', desc: 'Fresh salmon with quinoa', vendor: 'Ocean Basket' },
    { category: 'pregnancy', name: 'Pickles & Ice Cream', price: 8.50, image: '🥒🍦', desc: 'The classic combo', vendor: 'Cold Stone' },
    { category: 'period', name: 'Dark Chocolate Bar', price: 4.50, image: '🍫', desc: '70% Cocoa magnesium boost', vendor: 'Lindt Shop' },
    { category: 'normal', name: 'Popcorn Bucket', price: 5.00, image: '🍿', desc: 'Movie night essential', vendor: 'Cinema Mart' },
    { category: 'male', name: 'Mega Meat Pizza', price: 22.00, image: '🍕', desc: 'All the meats, no veggies', vendor: 'Dominos' }
  ];

  const batch = writeBatch(db);
  MOCK_DATA.forEach((item) => {
    const docRef = doc(collection(db, "products"));
    batch.set(docRef, item);
  });

  await batch.commit();
  alert("Database Seeded! Refresh the page.");
};