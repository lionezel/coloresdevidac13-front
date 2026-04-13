"use client";

import Image from "next/image";
import Link from "next/link";
import { ColorCoffee } from "@/src/global/colorGlobal";
import { category } from "../types/category";
import { motion } from "framer-motion";

interface CategoryCardProps {
    category: category[];
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
            {category.map((item, index) => {
                const isFirst = index === 0;
                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.1, 0.4), type: "spring", stiffness: 100, damping: 15 }}
                    >
                        <Link
                            href={`/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="group relative flex flex-col items-center overflow-hidden rounded-[2rem] bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-gray-100/80 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full"
                        >
                            <div className="w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded-[1.5rem] mb-5 bg-gray-50/50 relative">
                                {item.banner ? (
                                    <Image
                                        src={item.banner}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        priority={isFirst}
                                        loading={isFirst ? undefined : "lazy"}
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-50/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <h3
                                className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-[Ubuntu] transition-colors"
                                style={{ color: ColorCoffee }}
                            >
                                {item.name}
                            </h3>

                            {/* <span className="mt-1.5 text-xs sm:text-sm font-semibold text-gray-400/80 uppercase tracking-wider">
                                {Math.floor(Math.random() * 10) + 1} items
                            </span> */}

                            <div
                                className="mt-5 flex items-center justify-center text-gray-300 transition-all duration-300 group-hover:text-gray-800"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6 transform transition-transform group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    );
};
