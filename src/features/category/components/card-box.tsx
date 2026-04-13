"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useFormatPrice } from "../hooks/useFormatPrice";
import { useCart } from "../../cart/hooks/useCart";
import { Product, Variant } from "../types/products";
import { Addition } from "../types/addition";
import { ColorGlobal } from "@/src/global/colorGlobal";

interface CardBoxProps {
    products: Product[];
    additions: Addition[];
}

export const CardBox: React.FC<CardBoxProps> = ({ products, additions }) => {
    const { formatPrice } = useFormatPrice();
    const { addToCart } = useCart();

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedAdditions, setSelectedAdditions] = useState<Addition[]>([]);
    const [quantity, setQuantity] = useState(1);

    const openSelectionModal = (product: Product, variant: Variant) => {
        setSelectedProduct(product);
        setSelectedVariant(variant);
        setSelectedAdditions([]);
        setQuantity(1);
        setIsModalVisible(true);
    };

    const toggleAddition = (addition: Addition) => {
        setSelectedAdditions((prev) =>
            prev.find((a) => a.id === addition.id)
                ? prev.filter((a) => a.id !== addition.id)
                : [...prev, addition]
        );
    };

    const handleConfirmAddToCart = async () => {
        if (!selectedProduct || !selectedVariant) return;

        let finalName = selectedProduct.name;
        let finalPrice = selectedVariant.price;

        if (selectedAdditions.length > 0) {
            const additionsList = selectedAdditions.map((a) => a.name).join(", ");
            finalName = `${selectedProduct.name} (${additionsList})`;
            const additionsPrice = selectedAdditions.reduce((acc, curr) => acc + curr.price, 0);
            finalPrice += additionsPrice;
        }

        const additionIds = selectedAdditions.map((a) => a.id).sort().join("_");
        const variantKey = `${selectedVariant.id}_${additionIds}`;

        await addToCart({
            productId: selectedProduct.id,
            productName: finalName,
            variantId: selectedVariant.id,
            variantKey: variantKey,
            variantLabel: selectedVariant.label,
            price: finalPrice,
            image: selectedVariant.image,
            additions: selectedAdditions.map((a) => ({ id: a.id, name: a.name, price: a.price })),
        }, quantity);

        setIsModalVisible(false);
    };

    const defaultVariant = (product: Product) => product.variants[0];

    return (
        <div className="w-full">
            {/* Products Grid */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4 sm:px-6">
                {products.map((product, index) => {
                    const variant = defaultVariant(product);
                    if (!variant) return null;

                    const isFirst = index === 0;
                    return (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 0.3), type: "spring", stiffness: 100 }}
                            className="bg-white rounded-[1.8rem] sm:rounded-[2rem] overflow-hidden shadow-[0_8px_20px_rgb(0,0,0,0.03)] border border-gray-100/60 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer flex flex-col h-full group"
                            whileHover={{ y: -6 }}
                            onClick={() => openSelectionModal(product, variant)}
                        >
                            <div className="w-full aspect-[4/3] sm:aspect-square bg-gray-50 overflow-hidden relative">
                                {variant.image ? (
                                    <Image
                                        src={variant.image}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        priority={isFirst}
                                        loading={isFirst ? undefined : "lazy"}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="p-5 sm:p-7 flex flex-col flex-1">
                                <h3 className="text-lg sm:text-xl font-bold font-[Ubuntu] text-gray-900 mb-1.5 line-clamp-1">
                                    {product.name}
                               </h3>
                                {product.description && (
                                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-4 sm:mb-6 leading-relaxed">
                                        {product.description}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center justify-between">
                                    <span
                                        className="text-xl sm:text-2xl font-black"
                                        style={{ color: ColorGlobal }}
                                    >
                                        $ {formatPrice(variant.price)}
                                    </span>
                                    <button
                                        className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-[1rem] sm:rounded-[1.2rem] text-white shadow-lg active:scale-90 transition-transform hover:scale-105"
                                        style={{ backgroundColor: ColorGlobal, boxShadow: `0 6px 16px ${ColorGlobal}40` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openSelectionModal(product, variant);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Selection Modal */}
            <AnimatePresence>
                {isModalVisible && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsModalVisible(false)}
                        />
                        <motion.div
                            initial={{ y: "100%", opacity: 1 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 1 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
                        >
                            {/* Mobile Drag Indicator */}
                            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                            </div>
                            
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 sm:p-8 sm:pb-4 pt-4 sm:pt-6">
                                <h2 className="text-xl sm:text-2xl font-black font-[Ubuntu] text-gray-900 pr-4">
                                    {selectedProduct?.name}
                                </h2>
                                <button
                                    onClick={() => setIsModalVisible(false)}
                                    className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full flex-shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 sm:p-8 pt-0 overflow-y-auto custom-scrollbar">
                                <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed">
                                    {selectedProduct?.description}
                                </p>

                                {additions.length > 0 && (
                                    <div className="space-y-4 sm:space-y-6">
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Personaliza tu pedido</h3>
                                        <div className="space-y-3 sm:space-y-4">
                                            {additions.map((addition) => {
                                                const isSelected = selectedAdditions.some((a) => a.id === addition.id);
                                                return (
                                                    <button
                                                        key={addition.id}
                                                        onClick={() => toggleAddition(addition)}
                                                        className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-[1.2rem] border-2 transition-all active:scale-[0.98] ${isSelected
                                                            ? "border-transparent text-white"
                                                            : "bg-gray-50/50 border-gray-100 text-gray-800 hover:border-gray-200 hover:bg-gray-100/50"
                                                            }`}
                                                        style={isSelected ? { backgroundColor: ColorGlobal, borderColor: ColorGlobal } : {}}
                                                    >
                                                        <div className="text-left">
                                                            <p className="font-bold text-[0.95rem] sm:text-[1.05rem]">
                                                                {addition.name}
                                                            </p>
                                                            <p className={`text-xs sm:text-sm mt-0.5 font-medium ${isSelected ? "text-white/90" : "text-gray-500"}`}>
                                                                {addition.price < 0 ? "-" : "+"} ${formatPrice(Math.abs(addition.price))}
                                                            </p>
                                                        </div>
                                                        <div className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-white" : "text-gray-300"
                                                            }`}>
                                                            {isSelected ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: ColorGlobal }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: ColorGlobal }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 sm:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-4 sm:gap-6 pb-8 sm:pb-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-[0.7rem] sm:text-[0.8rem] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total</p>
                                        <p className="text-2xl sm:text-3xl font-black" style={{ color: ColorGlobal }}>
                                            $ {formatPrice(
                                                ((selectedVariant?.price || 0) +
                                                    selectedAdditions.reduce((acc, curr) => acc + curr.price, 0)) * quantity
                                            )}
                                        </p>
                                        {quantity > 1 && (
                                            <p className="text-[0.65rem] text-gray-400 mt-0.5">
                                                $ {formatPrice(
                                                    (selectedVariant?.price || 0) +
                                                    selectedAdditions.reduce((acc, curr) => acc + curr.price, 0)
                                                )} por unidad
                                            </p>
                                        )}
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center bg-white rounded-2xl border border-gray-100 p-1 shadow-sm">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 active:scale-90 transition-all text-gray-400 hover:text-red-500"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" />
                                            </svg>
                                        </button>
                                        <span className="w-10 text-center font-bold text-lg tabular-nums">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 active:scale-90 transition-all"
                                            style={{ color: ColorGlobal }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmAddToCart}
                                    className="w-full py-4 sm:py-5 rounded-[1.2rem] text-white font-bold text-base sm:text-lg shadow-xl active:scale-95 transition-all text-center"
                                    style={{ backgroundColor: ColorGlobal, boxShadow: `0 8px 20px ${ColorGlobal}40` }}
                                >
                                    Agregar al pedido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};
