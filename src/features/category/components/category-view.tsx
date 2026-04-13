"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useProducts } from "../hooks/useProducts";
import { useAdditions } from "../hooks/useAdditions";
import { useLoading } from "../../home/hooks/useLoading";
import { useFormatPrice } from "../hooks/useFormatPrice";
import { useCart } from "../../cart/hooks/useCart";

import { CartIconWithBadge } from "../../home/components/CartIconWithBadge";
import { BackgroundColor, ColorGlobal, ColorCoffee } from "../../../global/colorGlobal";
import { CardBox } from "./card-box";

interface CategoryViewProps {
    slug: string;
}

export function CategoryView({ slug }: CategoryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Convertir slug a nombre de categoría directamente (sin llamada Firestore extra)
    // Ejemplo: "bebidas-calientes" → "Bebidas Calientes"
    const exactCategoryName = useMemo(() => {
        return slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }, [slug]);

    const { products, loading: productsLoading } = useProducts(exactCategoryName);
    const { additions, loading: additionsLoading } = useAdditions(exactCategoryName);
    const { formatPrice } = useFormatPrice();
    const { addToCart } = useCart();
    const { Loading } = useLoading();
    const router = useRouter();

    const loading = productsLoading || additionsLoading;

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase().trim();
        return products.filter(p => p.name.toLowerCase().includes(q));
    }, [products, searchQuery]);

    const handleClearSearch = () => {
        setSearchQuery("");
        setIsSearchOpen(false);
    };

    const handleOpenSearch = () => {
        setIsSearchOpen(true);
        setTimeout(() => {
            document.getElementById("product-search-input")?.focus();
        }, 50);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div
            className="min-h-screen flex flex-col font-sans"
            style={{ backgroundColor: BackgroundColor }}
        >
            {/* Header */}
            <header className="flex h-24 sm:h-32 w-full items-center px-4 sm:px-6 lg:px-12 bg-white/70 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100/50 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all gap-3">

                {/* LEFT: back button + search (expands right) */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Back button */}
                    <button
                        onClick={() => router.back()}
                        className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-all hover:bg-gray-200 hover:scale-105 active:scale-95 shadow-sm flex-shrink-0"
                        aria-label="Volver"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    {/* Search container */}
                    <div className="relative flex items-center">
                        {/* Expanded input — grows to the right */}
                        <AnimatePresence>
                            {isSearchOpen && (
                                <motion.div
                                    key="search-bar"
                                    initial={{ width: 44, opacity: 0 }}
                                    animate={{ width: "min(280px, 52vw)", opacity: 1 }}
                                    exit={{ width: 44, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <input
                                        id="product-search-input"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onBlur={() => {
                                            if (!searchQuery) setIsSearchOpen(false);
                                        }}
                                        placeholder="Buscar producto..."
                                        className="w-full pl-12 pr-4 py-2.5 sm:py-3 rounded-full bg-white border-2 text-gray-800 text-sm sm:text-base font-medium placeholder-gray-400 outline-none"
                                        style={{
                                            borderColor: ColorGlobal,
                                            boxShadow: `0 0 0 3px ${ColorGlobal}20`,
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Lupa / X — siempre encima, pegada a la izquierda */}
                        <button
                            onClick={
                                isSearchOpen && searchQuery
                                    ? handleClearSearch
                                    : isSearchOpen
                                    ? () => setIsSearchOpen(false)
                                    : handleOpenSearch
                            }
                            className="absolute left-0 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-90 transition-all"
                            aria-label={isSearchOpen ? "Cerrar búsqueda" : "Buscar producto"}
                            style={{ color: isSearchOpen ? ColorGlobal : "#9ca3af" }}
                        >
                            {isSearchOpen && searchQuery ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* CENTER: title */}
                <AnimatePresence mode="wait">
                    {!isSearchOpen && (
                        <motion.h1
                            key="title"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight font-[Ubuntu] text-center truncate mx-2"
                            style={{ color: ColorCoffee }}
                        >
                            {slug}
                        </motion.h1>
                    )}
                </AnimatePresence>

                {/* RIGHT: cart */}
                <div className="flex-shrink-0 ml-auto">
                    <CartIconWithBadge onPress={() => router.push('/cart')} />
                </div>
            </header>

            {/* Search results label */}
            <AnimatePresence>
                {searchQuery.trim() && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full max-w-screen-2xl mx-auto px-5 sm:px-7 pt-4"
                    >
                        <p className="text-sm text-gray-500 font-medium">
                            {filteredProducts.length === 0
                                ? "No se encontraron productos"
                                : `${filteredProducts.length} producto${filteredProducts.length !== 1 ? "s" : ""} encontrado${filteredProducts.length !== 1 ? "s" : ""}`}
                            {" "}<span className="font-semibold text-gray-700">para &quot;{searchQuery}&quot;</span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content with Entry Animation */}
            <motion.main
                className="flex-1 w-full max-w-screen-2xl mx-auto py-8 sm:py-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                {/* Suggestions / Additions Section — hide when searching */}
                {additions.length > 0 && !searchQuery.trim() && (
                    <div className="mb-8 sm:mb-12 px-4 sm:px-6">
                        <h2 className="text-xl sm:text-2xl font-black font-[Ubuntu] text-gray-800 mb-4 sm:mb-6 tracking-tight">
                            Sugerencias / Adiciones
                        </h2>
                        <div className="flex overflow-x-auto gap-4 sm:gap-5 pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                            {additions.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.96 }}
                                    className="flex-shrink-0 w-40 sm:w-48 bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 shadow-[0_4px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_25px_rgb(0,0,0,0.06)] transition-all text-left snap-start group outline-none"
                                    onClick={() => addToCart({
                                        productId: item.id,
                                        productName: item.name,
                                        variantId: "addition",
                                        variantKey: `addition_${item.id}`,
                                        variantLabel: "Adición",
                                        image: "",
                                        price: item.price,
                                        additions: []
                                    })}
                                >
                                    <p
                                        className="font-bold text-gray-800 text-base sm:text-lg mb-1 leading-tight transition-colors duration-300"
                                        style={{ color: "inherit" }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = ColorGlobal)}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = "inherit")}
                                    >
                                        {item.name}
                                    </p>
                                    <p className={`text-lg sm:text-xl font-black ${item.price < 0 ? "text-red-500" : ""}`} style={{ color: item.price < 0 ? undefined : ColorGlobal }}>
                                        {item.price < 0 ? "-" : "+"} ${formatPrice(Math.abs(item.price))}
                                    </p>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Products Grid */}
                <div className="px-0 sm:px-2 w-full">
                    {filteredProducts.length === 0 && searchQuery.trim() ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-24 px-4 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                                </svg>
                            </div>
                            <p className="text-xl font-bold text-gray-700 mb-2">Sin resultados</p>
                            <p className="text-gray-400 text-sm max-w-xs">
                                No encontramos productos que coincidan con{" "}
                                <span className="font-semibold">&quot;{searchQuery}&quot;</span>
                            </p>
                            <button
                                onClick={handleClearSearch}
                                className="mt-6 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg transition-all hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: ColorGlobal }}
                            >
                                Limpiar búsqueda
                            </button>
                        </motion.div>
                    ) : (
                        <CardBox
                            products={filteredProducts}
                            additions={additions}
                        />
                    )}
                </div>
            </motion.main>

            {/* Custom scrollbar style */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
