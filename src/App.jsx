import React, { useState } from 'react';
import { 
  ChefHat, ShoppingBag, Home, Search, ArrowLeft, Sparkles, 
  ShoppingCart, Heart, Flame, Baby, Droplet, Plus, Minus, X,
  Moon, Sun
} from 'lucide-react';

// --- CONFIGURATION ---
// 🔴 PASTE YOUR API KEY HERE 🔴
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// --- MOCK DATA ---
const MARKET_DATA = {
  fullMeal: [
    { id: 1, name: 'Jollof Rice Combo', price: 12.99, image: '🍚', desc: 'Spicy rice with chicken & plantain' },
    { id: 2, name: 'Grilled Salmon Bowl', price: 18.50, image: '🐟', desc: 'Fresh salmon with quinoa' },
    { id: 3, name: 'Pounded Yam & Egusi', price: 15.00, image: '🥣', desc: 'Traditional favorite' },
    { id: 4, name: 'Pasta Alfredo', price: 14.20, image: '🍝', desc: 'Creamy sauce with herbs' },
  ],
  cravings: {
    pregnancy: [
      { id: 101, name: 'Pickles & Ice Cream', price: 8.50, image: '🥒🍦', desc: 'The classic combo' },
      { id: 102, name: 'Spicy Fruit Salad', price: 6.00, image: '🌶️🍎', desc: 'Tangy and spicy kick' },
      { id: 103, name: 'Cheesy Fries', price: 7.50, image: '🍟🧀', desc: 'Double cheese loaded' },
    ],
    period: [
      { id: 201, name: 'Dark Chocolate Bar', price: 4.50, image: '🍫', desc: '70% Cocoa magnesium boost' },
      { id: 202, name: 'Salty Potato Chips', price: 3.50, image: '🥔', desc: 'Crunchy salt fix' },
      { id: 203, name: 'Warm Brownie Sundae', price: 8.00, image: '🧁', desc: 'Pure comfort food' },
    ],
    normal: [
      { id: 301, name: 'Popcorn Bucket', price: 5.00, image: '🍿', desc: 'Movie night essential' },
      { id: 302, name: 'Donut Box', price: 10.00, image: '🍩', desc: 'Glazed and confused' },
      { id: 303, name: 'Tacos', price: 3.00, image: '🌮', desc: 'Crunchy shell beef tacos' },
    ],
    male: [
      { id: 401, name: 'Mega Meat Pizza', price: 22.00, image: '🍕', desc: 'All the meats, no veggies' },
      { id: 402, name: 'Buffalo Wings (12pc)', price: 16.00, image: '🍗', desc: 'Extra hot sauce' },
      { id: 403, name: 'Bacon Burger', price: 14.00, image: '🍔', desc: 'Double patty, double bacon' },
    ]
  }
};

// --- SUB-COMPONENTS (Now defined OUTSIDE the main function) ---

const ViewContainer = ({ children, title, showBack, onBack }) => (
  <div className="p-6 max-w-2xl mx-auto h-full flex flex-col animate-fade-in">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
    </div>
    {children}
  </div>
);

const HomeView = ({ setCurrentView }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in p-6">
    <div className="text-center space-y-2">
      <h1 className="text-5xl font-black text-orange-500 tracking-tighter drop-shadow-sm">EatAi</h1>
      <p className="text-gray-500 dark:text-gray-400 text-lg">Your Personal Food Intelligence</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-md">
      <button 
        onClick={() => setCurrentView('decider')}
        className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-orange-100 dark:border-gray-700 hover:border-orange-300 transition-all transform hover:-translate-y-1"
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
        <ChefHat className="w-12 h-12 text-orange-500 mb-4 relative z-10" />
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">AI Chef</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Got ingredients? I'll make the recipe.</p>
      </button>

      <button 
        onClick={() => setCurrentView('market')}
        className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-green-100 dark:border-gray-700 hover:border-green-300 transition-all transform hover:-translate-y-1"
      >
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
        <ShoppingBag className="w-12 h-12 text-green-600 dark:text-green-400 mb-4 relative z-10" />
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white relative z-10">Market</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 relative z-10">Meals & specialized cravings.</p>
      </button>
    </div>
  </div>
);

// We pass props here so it doesn't lose focus!
const DeciderView = ({ ingredients, setIngredients, generateRecipes, isThinking, aiRecipe, setCurrentView }) => (
  <ViewContainer title="AI Fridge Raider" showBack onBack={() => setCurrentView('home')}>
    <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
      <div className="bg-orange-50 dark:bg-gray-800 p-6 rounded-3xl mb-6 border border-orange-100 dark:border-gray-700 transition-colors">
        <label className="block text-orange-800 dark:text-orange-300 font-semibold mb-3">What's in your kitchen?</label>
        <textarea
          autoFocus
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="e.g., 2 eggs, stale bread, milk, half an onion..."
          className="w-full p-4 rounded-xl border-2 border-orange-200 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 bg-white dark:bg-gray-700 dark:text-white h-32 resize-none transition-all placeholder-gray-400"
        />
        <button 
          onClick={generateRecipes}
          disabled={isThinking || !ingredients.trim()}
          className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-orange-200 dark:shadow-none"
        >
          {isThinking ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Cooking up ideas...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Invent Recipe</span>
            </>
          )}
        </button>
      </div>

      {aiRecipe && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 animate-slide-up whitespace-pre-wrap">
          <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">Chef EatAi Suggests:</h3>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            {aiRecipe}
          </div>
        </div>
      )}
    </div>
  </ViewContainer>
);

const MarketView = ({ marketSection, setMarketSection, cravingsType, setCravingsType, setCurrentView, addToCart }) => {
  if (!marketSection) {
    return (
      <ViewContainer title="The Market" showBack onBack={() => setCurrentView('home')}>
        <div className="space-y-4">
          <button 
            onClick={() => setMarketSection('fullMeal')}
            className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-400 to-red-500 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"
          >
            <div className="relative z-10 text-white">
              <h3 className="text-3xl font-black">Full Meals</h3>
              <p className="opacity-90">Hearty dinners & lunch combos</p>
            </div>
            <span className="absolute bottom-2 right-2 text-6xl opacity-20">🍱</span>
          </button>

          <button 
            onClick={() => setMarketSection('cravings')}
            className="w-full h-40 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-left shadow-lg transform transition hover:scale-[1.02]"
          >
            <div className="relative z-10 text-white">
              <h3 className="text-3xl font-black">Cravings</h3>
              <p className="opacity-90">For those specific moments</p>
            </div>
            <span className="absolute bottom-2 right-2 text-6xl opacity-20">🍫</span>
          </button>
        </div>
      </ViewContainer>
    );
  }

  if (marketSection === 'cravings' && !cravingsType) {
    const cravingOptions = [
      { id: 'pregnancy', label: 'Pregnancy', icon: Baby, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-200' },
      { id: 'period', label: 'Period', icon: Droplet, color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' },
      { id: 'normal', label: 'Normal', icon: Heart, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' },
      { id: 'male', label: 'Male', icon: Flame, color: 'bg-slate-800 text-white dark:bg-slate-700' },
    ];

    return (
      <ViewContainer title="What are you craving?" showBack onBack={() => setMarketSection(null)}>
        <div className="grid grid-cols-2 gap-4">
          {cravingOptions.map((opt) => (
            <button 
              key={opt.id}
              onClick={() => setCravingsType(opt.id)}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl ${opt.color} h-40 shadow-sm hover:shadow-md transition-all`}
            >
              <opt.icon className="w-10 h-10 mb-3" />
              <span className="font-bold text-lg">{opt.label}</span>
            </button>
          ))}
        </div>
      </ViewContainer>
    );
  }

  const products = marketSection === 'fullMeal' 
    ? MARKET_DATA.fullMeal 
    : MARKET_DATA.cravings[cravingsType];

  const title = marketSection === 'fullMeal' ? 'Full Meals' : `${cravingsType.charAt(0).toUpperCase() + cravingsType.slice(1)} Cravings`;

  return (
    <ViewContainer title={title} showBack onBack={() => marketSection === 'cravings' ? setCravingsType(null) : setMarketSection(null)}>
      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-24 scrollbar-hide">
        {products.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 animate-fade-in transition-colors">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-4xl shrink-0">
              {item.image}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 dark:text-white">{item.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.desc}</p>
              <div className="text-orange-600 dark:text-orange-400 font-bold">${item.price.toFixed(2)}</div>
            </div>
            <button 
              onClick={() => addToCart(item)}
              className="p-3 bg-gray-900 dark:bg-orange-500 text-white rounded-xl hover:bg-gray-700 dark:hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </ViewContainer>
  );
};

const CartOverlay = ({ cart, currentView, setCurrentView, marketSection, removeFromCart, cartTotal }) => (
  <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
    {/* Backdrop */}
    <div 
      className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${currentView === 'cart' ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
      onClick={() => setCurrentView(marketSection ? 'market' : 'home')}
    />
    
    {/* Slide-in Panel */}
    <div className={`relative bg-white dark:bg-gray-900 shadow-2xl w-full max-w-md h-full flex flex-col pointer-events-auto transition-transform duration-300 transform ${currentView === 'cart' ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Cart</h2>
        <button onClick={() => setCurrentView(marketSection ? 'market' : 'home')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <ShoppingCart className="w-16 h-16 opacity-20" />
            <p>Your basket is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.cartId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.image}</span>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">${item.price.toFixed(2)}</div>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 dark:text-gray-400">Total</span>
          <span className="text-3xl font-black text-gray-900 dark:text-white">${cartTotal}</span>
        </div>
        <button className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none">
          Checkout
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

export default function EatAi() {
  // --- STATE MANAGEMENT ---
  const [currentView, setCurrentView] = useState('home'); 
  const [ingredients, setIngredients] = useState('');
  const [aiRecipe, setAiRecipe] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [marketSection, setMarketSection] = useState(null); 
  const [cravingsType, setCravingsType] = useState(null);
  const [cart, setCart] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  // --- DARK MODE HANDLER ---
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // --- GEMINI API HANDLER ---
  const generateRecipes = async () => {
    if (!ingredients.trim()) return;
    
    setIsThinking(true);
    setAiRecipe(null);

    const systemPrompt = `You are a world-class chef. The user will give you a list of ingredients they have. 
    Suggest 2 distinct, creative, and delicious recipes they can make. 
    Format the output clearly with a Title, Ingredients list, and Instructions.
    Keep the tone encouraging and fun. Use emojis.`;
    
    const userQuery = `I have these ingredients: ${ingredients}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          }),
        }
      );

      if (!response.ok) throw new Error('API Failed');

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiRecipe(text);
    } catch (error) {
      setAiRecipe(GEMINI_API_KEY === "" 
        ? "⚠️ Hey Chef! You forgot to paste your API Key in the code!" 
        : "Oops! My chef brain is a bit scrambled. Please try again later. 🍳");
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  // --- CART LOGIC ---
  const addToCart = (item) => setCart([...cart, { ...item, cartId: Date.now() }]);
  const removeFromCart = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);

  // --- MAIN RENDER ---
  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans text-gray-900 dark:text-white relative overflow-hidden transition-colors duration-300">
        
        <CartOverlay 
          cart={cart} 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          marketSection={marketSection} 
          removeFromCart={removeFromCart} 
          cartTotal={cartTotal} 
        />

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 transition-colors">
          <div className="text-2xl font-black text-orange-500 cursor-pointer" onClick={() => setCurrentView('home')}>EatAi</div>
          <div className="flex items-center space-x-6">
            <button onClick={() => setCurrentView('decider')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">AI Chef</button>
            <button onClick={() => setCurrentView('market')} className="hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 font-medium transition-colors">Market</button>
            
            <button onClick={toggleDarkMode} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-yellow-400">
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            <button onClick={() => setCurrentView('cart')} className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-white" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <div className="md:hidden flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-900 sticky top-0 z-30 shadow-sm">
           <div className="text-xl font-black text-orange-500" onClick={() => setCurrentView('home')}>EatAi</div>
           <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-600 dark:text-yellow-400">
              {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
           </button>
        </div>

        {/* Main Content */}
        <main className="h-[calc(100vh-140px)] md:h-[calc(100vh-72px)] overflow-hidden">
          {currentView === 'home' && <HomeView setCurrentView={setCurrentView} />}
          
          {currentView === 'decider' && (
            <DeciderView 
              ingredients={ingredients}
              setIngredients={setIngredients}
              generateRecipes={generateRecipes}
              isThinking={isThinking}
              aiRecipe={aiRecipe}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'market' && (
            <MarketView 
              marketSection={marketSection}
              setMarketSection={setMarketSection}
              cravingsType={cravingsType}
              setCravingsType={setCravingsType}
              setCurrentView={setCurrentView}
              addToCart={addToCart}
            />
          )}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-around items-center md:hidden z-40 safe-area-pb transition-colors">
          <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center space-y-1 ${currentView === 'home' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => setCurrentView('decider')} className={`flex flex-col items-center space-y-1 ${currentView === 'decider' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <ChefHat className="w-6 h-6" />
            <span className="text-xs font-medium">Chef</span>
          </button>
          <button onClick={() => setCurrentView('market')} className={`flex flex-col items-center space-y-1 ${currentView === 'market' ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Market</span>
          </button>
          <button onClick={() => setCurrentView('cart')} className="flex flex-col items-center space-y-1 text-gray-400 dark:text-gray-500 relative">
            {cart.length > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {cart.length}
              </span>
            )}
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs font-medium">Cart</span>
          </button>
        </nav>

        <style>{`
          .safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.5s ease-out; }
          .animate-slide-up { animation: slideUp 0.5s ease-out; }
        `}</style>
      </div>
    </div>
  );
}