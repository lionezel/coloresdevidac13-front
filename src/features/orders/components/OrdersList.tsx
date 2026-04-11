"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOrders, OrderWithId } from "../hooks/useOrders";
import { ColorGlobal } from "@/src/global/colorGlobal";
import { useFormatPrice } from "@/src/features/category/hooks/useFormatPrice";
import { useState, useEffect } from "react";
import CheckoutDialog from "./CheckoutDialog";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/src/firebase/config";
import { RestaurantId } from "@/src/global/id";

export default function OrdersList() {
    const { orders, loading, error } = useOrders();
    const router = useRouter();
    const { formatPrice } = useFormatPrice();

    const [checkoutOrder, setCheckoutOrder] = useState<OrderWithId | null>(null);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [updatingOrderNode, setUpdatingOrderNode] = useState<{orderId: string, index: number} | null>(null);

    const updateProductQuantity = async (order: OrderWithId, productIndex: number, delta: number) => {
        try {
            setUpdatingOrderNode({ orderId: order.id, index: productIndex });
            const newProducts = [...order.products];
            const currentQuantity = Number(newProducts[productIndex].quantity);
            const newQuantity = currentQuantity + delta;
            
            if (newQuantity <= 0) {
                return confirmRemoveProduct(order, productIndex);
            }

            newProducts[productIndex].quantity = newQuantity;
            const newTotal = newProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);

            const orderRef = doc(db, "restaurants", RestaurantId, "orders", order.id);
            await updateDoc(orderRef, {
                products: newProducts,
                total: newTotal
            });
        } catch (e) {
            console.error("Error updating quantity:", e);
        } finally {
            setUpdatingOrderNode(null);
        }
    };

    const confirmRemoveProduct = async (order: OrderWithId, productIndex: number) => {
        if (!window.confirm("¿Estás seguro de eliminar este producto de la orden?")) {
            setUpdatingOrderNode(null);
            return;
        }
        try {
            setUpdatingOrderNode({ orderId: order.id, index: productIndex });
            const newProducts = [...order.products];
            newProducts.splice(productIndex, 1);
            const newTotal = newProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);

            const orderRef = doc(db, "restaurants", RestaurantId, "orders", order.id);
            await updateDoc(orderRef, {
                products: newProducts,
                total: newTotal
            });
        } catch (e) {
            console.error("Error removing product:", e);
        } finally {
            setUpdatingOrderNode(null);
        }
    };

    // Keep the checkout order in sync with the live orders list (e.g. if a product is removed)
    useEffect(() => {
        if (checkoutOrder) {
            const updated = orders.find(o => o.id === checkoutOrder.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(checkoutOrder)) {
                setCheckoutOrder(updated);
            }
        }
    }, [orders, checkoutOrder]);

    const toggleExpand = (orderId: string) => {
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const handleAddToOrder = (order: OrderWithId) => {
        // Save the order details in sessionStorage to be used during the next checkout
        sessionStorage.setItem("editingOrderId", order.id);
        const orderIdentifier = order.mesa ? `Mesa ${order.mesa}` : (order.name || "Pedido sin nombre");
        sessionStorage.setItem("editingOrderName", orderIdentifier);

        // Preserve original state so checkout can redirect back to /orders after adding items
        const originalState = String(order.state || (order as any).status || "").toLowerCase().trim();
        sessionStorage.setItem("editingOrderState", originalState);

        router.push("/home");
    };

    const handleCheckoutComplete = async (
        completedOrder: any,
        finalPaymentMethod: string,
        customer?: { id: string; name: string }
    ) => {
        try {
            const orderuccessRef = doc(db, "restaurants", RestaurantId, "orderssuccess", completedOrder.id);
            const orderRef = doc(db, "restaurants", RestaurantId, "orders", completedOrder.id);

            const payload = {
                ...completedOrder,
                paymentMethod: finalPaymentMethod,
                customer: customer || null,
                tipAmount: completedOrder.tipAmount || 0,
                discountAmount: completedOrder.discountAmount || 0,
                discountType: completedOrder.discountType || null,
                discountMode: completedOrder.discountMode || null,
                discountValue: completedOrder.discountValue || null,
                isGuiaPlan: completedOrder.isGuiaPlan || false,
                guiaDiscount: completedOrder.guiaDiscount || 0,
                total: completedOrder.total,
                state: "completada",
                isPaid: true,
                paidAt: new Date()
            };

            // Guarda la orden en la colección orderssuccess
            await setDoc(orderuccessRef, payload);

            // Elimina la orden de la colección órdenes activas
            await deleteDoc(orderRef);

            setCheckoutOrder(null);
        } catch (error) {
            console.error("Error updating order upon checkout:", error);
            alert("Error al finalizar la orden.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: ColorGlobal }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl border-2 border-red-100 shadow-sm mt-8 max-w-2xl mx-auto">
                <svg className="w-16 h-16 text-red-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-red-800 mb-2 font-[Ubuntu]">Requiere Configuración de Base de Datos</h3>
                <p className="text-red-600 text-center mb-6 font-medium">
                    Para mostrar tus órdenes personalizadas, Firestore necesita un índice. Por favor, haz clic en el enlace de la consola de Firebase para habilitarlo.
                </p>
                <div className="bg-white p-4 rounded-xl border border-red-200 text-xs font-mono text-red-500 overflow-auto max-w-full">
                    {error}
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm mt-8">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="text-xl font-bold text-gray-400 font-[Ubuntu]">No hay pedidos activos</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#333] font-[Ubuntu] mb-6">Pedidos Recientes</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order, index) => {
                    const orderIdentifier = order.mesa ? `Mesa ${order.mesa}` : (order.name || "Sin nombre");
                    const dateStr = order.date?.toDate ? order.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Ahora";
                    const isPaid = (order as any).isPaid;
                    
                    // Case-insensitive check for state or status
                    const normalizeStatus = (s: any) => String(s || "").toLowerCase().trim();
                    const currentState = normalizeStatus(order.state || (order as any).status);
                    const isReady = currentState === 'listo / caja' || currentState === 'listo';

                    return (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative ${isPaid ? 'opacity-70' : ''}`}
                        >
                            {/* Status Badge */}
                            <div className="absolute -top-3 -right-3">
                                {isPaid ? (
                                    <div className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md text-white font-[Ubuntu] bg-emerald-600 flex items-center gap-1.5 border-2 border-white">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Pagado
                                    </div>
                                ) : isReady ? (
                                    <div className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md text-white font-[Ubuntu] bg-green-500 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Listo / Caja
                                    </div>
                                ) : (
                                    <span className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md text-white font-[Ubuntu] bg-blue-500">
                                        En Orden
                                    </span>
                                )}
                            </div>




                            <div className="flex justify-between items-start mb-4 mt-2">
                                <div>
                                    <h3 className="text-xl font-bold text-[#333] font-[Ubuntu]">{orderIdentifier}</h3>
                                    <p className="text-sm text-gray-500 font-[Ubuntu]">{dateStr}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black font-[Ubuntu]" style={{ color: ColorGlobal }}>
                                        ${formatPrice(order.total || 0)}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-500 font-[Ubuntu]">
                                        {order.products?.length || 0} items
                                    </p>
                                </div>
                            </div>

                            {/* Products preview */}
                            <div className="mb-6 flex-1">
                                <ul className="space-y-2">
                                    {order.products?.map((prod, actualIndex) => {
                                        if (!expandedOrders[order.id] && actualIndex >= 3) return null;
                                        
                                        const isUpdating = updatingOrderNode?.orderId === order.id && updatingOrderNode?.index === actualIndex;

                                        return (
                                            <li key={actualIndex} className={`flex justify-between items-center text-sm text-gray-600 font-[Ubuntu] bg-gray-50/50 p-2 rounded-lg border border-gray-100 transition-opacity ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <span className="truncate pr-2 flex-1">
                                                    <span className="font-bold mr-1">{prod.quantity}x</span>
                                                    {prod.productName}
                                                </span>
                                                {!isPaid && (
                                                    <div className="flex gap-1 items-center bg-white p-1 rounded-md shadow-sm border border-gray-200">
                                                        <button onClick={() => updateProductQuantity(order, actualIndex, -1)} disabled={isUpdating} className="w-6 h-6 flex justify-center items-center rounded-sm bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold disabled:opacity-50">-</button>
                                                        <button onClick={() => updateProductQuantity(order, actualIndex, 1)} disabled={isUpdating} className="w-6 h-6 flex justify-center items-center rounded-sm bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold disabled:opacity-50">+</button>
                                                        <button onClick={() => confirmRemoveProduct(order, actualIndex)} disabled={isUpdating} className="w-6 h-6 flex justify-center items-center rounded-sm bg-red-100 hover:bg-red-200 active:scale-95 transition-all text-red-600 ml-1 disabled:opacity-50">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    })}
                                    {order.products?.length > 3 && (
                                        <li className="mt-2 text-center">
                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                className="text-xs font-bold inline-flex items-center gap-1 transition-colors hover:opacity-80 px-3 py-1 bg-gray-100 rounded-full"
                                                style={{ color: ColorGlobal }}
                                            >
                                                <svg
                                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedOrders[order.id] ? 'rotate-180' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                {expandedOrders[order.id]
                                                    ? "Ocultar productos"
                                                    : `+ ${order.products.length - 3} productos más`
                                                }
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleAddToOrder(order)}
                                    className="w-full py-3 rounded-2xl flex items-center justify-center font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-md"
                                    style={{ backgroundColor: ColorGlobal }}
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="font-[Ubuntu]">Añadir a este pedido</span>
                                </button>
                                {!isPaid && (
                                    <button
                                        onClick={() => setCheckoutOrder(order)}
                                        className="w-full py-3 rounded-2xl flex items-center justify-center font-bold text-gray-800 bg-emerald-400 hover:bg-emerald-500 transition-all transform hover:scale-[1.02] active:scale-95 shadow-md"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-[Ubuntu]">Facturar y Cobrar</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <CheckoutDialog
                open={!!checkoutOrder}
                order={checkoutOrder as any}
                onClose={() => setCheckoutOrder(null)}
                onComplete={handleCheckoutComplete as any}
            />
        </div>
    );
}
