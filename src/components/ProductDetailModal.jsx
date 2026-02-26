import React, { useState } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';

/**
 * ProductDetailModal - Centered modal for product details
 * Modern glassmorphism design, responsive for desktop & mobile
 * Addons read from product.addons (per-product, set by vendor)
 */
export const ProductDetailModal = ({ isOpen, product, onClose, onAddToCart, isVendorOpen = true }) => {
    if (!isOpen || !product) return null;

    const [quantity, setQuantity] = useState(1);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [imgError, setImgError] = useState(false);

    const stock = product.stock || 0;
    const isSoldOut = stock === 0;
    const isLowStock = stock > 0 && stock < 10;
    const addons = product.addons || [];

    // Calculate total price: (base + sum of selected addons) * quantity
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    const totalPrice = product.price + addonsTotal;

    // Toggle addon selection (multi-select)
    const toggleAddon = (addon) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.name === addon.name);
            if (exists) return prev.filter(a => a.name !== addon.name);
            return [...prev, addon];
        });
    };

    // ===== ADD TO CART =====
    const handleAddToCart = () => {
        if (!isVendorOpen) return alert("Vendor is currently closed.");
        if (isSoldOut) return alert("This product is sold out.");

        onAddToCart({
            ...product,
            quantity,
            selectedAddons: selectedAddons.length > 0 ? selectedAddons : undefined
        });

        setQuantity(1);
        setSelectedAddons([]);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-md" onClick={onClose} />

            {/* ===== CENTERED MODAL ===== */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh] animate-slide-up overflow-hidden border border-gray-200/50 dark:border-gray-700/50">

                    {/* ===== IMAGE HEADER ===== */}
                    <div className="relative w-full h-56 flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {product.imageUrl && !imgError ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className={`w-full h-full object-cover ${isSoldOut ? 'grayscale brightness-75' : ''}`}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-8xl">
                                <span>{product.image || '🥘'}</span>
                            </div>
                        )}

                        {/* Gradient overlay at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 w-9 h-9 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all"
                        >
                            <X className="w-4 h-4 text-gray-700 dark:text-white" />
                        </button>

                        {/* Sold Out Badge */}
                        {isSoldOut && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-sm font-black uppercase bg-red-500 px-4 py-2 rounded-xl transform -rotate-6 shadow-lg">
                                    Sold Out
                                </span>
                            </div>
                        )}

                        {/* Price badge */}
                        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg">
                            <span className="text-lg font-black text-gray-900 dark:text-white">₦{product.price.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* ===== SCROLLABLE CONTENT ===== */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 scrollbar-hide">

                        {/* Name & Description */}
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-1">
                            {product.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                            {product.desc || "Fresh & tasty."}
                        </p>

                        {/* Low Stock */}
                        {isLowStock && !isSoldOut && (
                            <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40 flex items-center gap-2">
                                <span className="text-sm">🔥</span>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    Only {stock} left in stock!
                                </span>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="mb-5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantity</p>
                            <div className="flex items-center gap-0 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit overflow-hidden">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90"
                                >
                                    <Minus className="w-4 h-4 text-gray-500" />
                                </button>
                                <span className="w-12 h-11 flex items-center justify-center font-black text-lg dark:text-white">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(stock || 99, q + 1))}
                                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90"
                                >
                                    <Plus className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* ===== ADDONS MULTI-SELECT ===== */}
                        {product.hasAddons !== false && addons.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Add Extras</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {addons.map((addon, idx) => {
                                        const isSelected = selectedAddons.some(a => a.name === addon.name);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => toggleAddon(addon)}
                                                className={`relative p-3 rounded-xl text-left transition-all border-2 group ${isSelected
                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-sm shadow-orange-200 dark:shadow-none'
                                                        : 'border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {/* Checkbox indicator */}
                                                <div className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-orange-500 shadow-sm'
                                                        : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                </div>

                                                <p className="font-bold text-sm text-gray-900 dark:text-white pr-6 leading-tight">
                                                    {addon.name}
                                                </p>
                                                <p className={`text-xs font-bold mt-1 ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>
                                                    +₦{addon.price.toLocaleString()}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ===== STICKY BOTTOM BAR ===== */}
                    <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                        {/* Price summary */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Total</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                    ₦{(totalPrice * quantity).toLocaleString()}
                                </p>
                                {selectedAddons.length > 0 && (
                                    <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                                        incl. {selectedAddons.map(a => a.name).join(' + ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400">{quantity} × ₦{totalPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={handleAddToCart}
                            disabled={isSoldOut || !isVendorOpen}
                            className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSoldOut || !isVendorOpen
                                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 active:scale-[0.97]'
                                }`}
                        >
                            {!isVendorOpen ? 'Vendor Closed' : isSoldOut ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};
