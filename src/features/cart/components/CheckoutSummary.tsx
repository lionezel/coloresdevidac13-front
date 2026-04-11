"use client";

import { db } from "@/src/firebase/config";
import { ColorGlobal } from "@/src/global/colorGlobal";
import { RestaurantId } from "@/src/global/id";
import { useCart } from "@/src/features/cart/hooks/useCart";
import { useCreditCustomers } from "@/src/features/cart/hooks/useCreditCustomers";
import { useFormatPrice } from "@/src/features/category/hooks/useFormatPrice";
import { CreditCustomer } from "@/src/features/cart/types/customer";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import {
    addDoc,
    collection,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
} from "firebase/firestore";
import React, { useMemo, useState, useEffect } from "react";


export default function CheckoutSummary() {
    const { cart, loading, clearCart } = useCart();
    const { customers, loading: loadingCustomers } = useCreditCustomers();
    const { formatPrice } = useFormatPrice();
    const router = useRouter();
    const { user } = useAuth();

    console.log("customers", customers);

    const [name, setName] = useState("");
    const [mesa, setMesa] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<
        "efectivo" | "tarjeta" | "transferencia" | ""
    >("");
    const [orderNotes, setOrderNotes] = useState("");

    // Credit customer selection states
    const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(null);
    const [showCustomerSelection, setShowCustomerSelection] = useState(false);

    // Delivery state
    const [isDelivery, setIsDelivery] = useState(false);

    // Editing Order State
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editingOrderName, setEditingOrderName] = useState<string | null>(null);

    const [editingOrderState, setEditingOrderState] = useState<string | null>(null);

    useEffect(() => {
        const id = sessionStorage.getItem("editingOrderId");
        const nameOrder = sessionStorage.getItem("editingOrderName");
        const state = sessionStorage.getItem("editingOrderState");
        if (id) {
            setEditingOrderId(id);
            setEditingOrderName(nameOrder);
            setEditingOrderState(state);
        }
    }, []);

    /**
     * Totales
     */
    const { totalItems, subtotal, shippingCost, total } = useMemo(() => {
        const totalItems = cart.reduce(
            (sum, item) => sum + (item.quantity ?? 1),
            0
        );

        const subtotal = cart.reduce(
            (sum, item) =>
                sum + (item.price ?? 0) * (item.quantity ?? 1),
            0
        );

        // Si son 4 o más productos consideramos que son "muchos" y vale 2000, si no 1000.
        const shippingCost = isDelivery ? (totalItems >= 4 ? 2000 : 1000) : 0;
        const total = subtotal + shippingCost;

        return { totalItems, subtotal, shippingCost, total };
    }, [cart, isDelivery]);

    /**
     * Checkout
     */
    const handleCheckout = async () => {
        if (!editingOrderId && !name.trim()) {
            return alert("Por favor ingresa tu nombre.");
        }

        if (!editingOrderId && name === "Crédito" && !selectedCustomer) {
            return alert("Por favor selecciona un cliente para el crédito.");
        }

        // if (!paymentMethod) {
        //     return alert("Por favor selecciona un método de pago.");
        // }

        if (cart.length === 0) {
            return alert("El carrito está vacío.");
        }

        // Validar que no haya datos inválidos en el carrito
        const hasInvalidItem = cart.some(
            (item) =>
                !item.productId ||
                !item.variantId ||
                item.price === undefined
        );

        if (hasInvalidItem) {
            console.error("Carrito inválido:", cart);
            return alert(
                "Hay productos inválidos en el carrito. Vuelve a agregarlos."
            );
        }

        try {
            setSaving(true);

            const safeProducts = cart.map((item) => ({
                productId: item.productId ?? "",
                productName: item.productName ?? "",
                variantId: item.variantId ?? "",
                variantLabel: item.variantLabel ?? "",
                price: item.price ?? 0,
                image: item.image ?? "",
                quantity: item.quantity ?? 1,
                additions: item.additions ?? [],
            }));

            if (editingOrderId) {
                const orderRef = doc(db, "restaurants", RestaurantId, "orders", editingOrderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const existingOrder = orderSnap.data();

                    // Merge products: sum quantities if same variantId, else add as new
                    const merged = [...(existingOrder.products || [])];
                    for (const newProd of safeProducts) {
                        const idx = merged.findIndex(
                            (p: any) => p.variantId === newProd.variantId && p.productId === newProd.productId
                        );
                        if (idx !== -1) {
                            merged[idx] = {
                                ...merged[idx],
                                quantity: (merged[idx].quantity || 1) + (newProd.quantity || 1),
                            };
                        } else {
                            merged.push(newProd);
                        }
                    }

                    const updatedSubtotal = (existingOrder.subtotal || 0) + subtotal;
                    const updatedTotal = (existingOrder.total || 0) + subtotal;

                    await updateDoc(orderRef, {
                        products: merged,
                        subtotal: updatedSubtotal,
                        total: updatedTotal,
                        // Preserve existing state — do NOT reset to "en_orden"
                        waitressId: user?.uid || existingOrder.waitressId || null,
                        waitressName: user?.email || existingOrder.waitressName || null,
                    });


                    const wasReady = editingOrderState === 'listo / caja' || editingOrderState === 'listo';

                    sessionStorage.removeItem("editingOrderId");
                    sessionStorage.removeItem("editingOrderName");
                    sessionStorage.removeItem("editingOrderState");

                    await clearCart();
                    // If the order was already "listo/caja", go back to orders; otherwise ordersuccess
                    router.push(wasReady ? "/orders" : "/ordersuccess");
                    return;
                }
            }

            const orderData = {
                name: selectedCustomer ? selectedCustomer.name : name,
                mesa,
                paymentMethod,
                notes: orderNotes,
                products: safeProducts,
                subtotal,
                shippingCost,
                total,
                isDelivery,
                date: serverTimestamp(),
                creditCustomerId: selectedCustomer?.id || null,
                creditCustomerName: selectedCustomer?.name || null,
                state: "en_orden",
                waitressId: user?.uid || null,
                waitressName: user?.email || null,
            };




            console.log("ORDEN A GUARDAR:", orderData);

            await addDoc(
                collection(db, "restaurants", RestaurantId, "orders"),
                {
                    ...orderData,
                    date: serverTimestamp(),
                }
            );

            sessionStorage.setItem("lastOrder", JSON.stringify(orderData));
            await clearCart();
            router.push("/ordersuccess");
        } catch (error) {
            console.error("Error creando/actualizando orden:", error);
            alert("No se pudo completar la operación.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 justify-center items-center py-10">
                <p className="text-gray-500 font-medium">Cargando el carrito...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white lg:bg-transparent">
            {editingOrderId && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 mb-4 font-[Ubuntu]">
                    <div className="flex items-center gap-2 font-bold mb-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Agregando a pedido existente
                    </div>
                    <p className="text-sm">Se sumarán estos productos al pedido: <strong>{editingOrderName}</strong></p>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem("editingOrderId");
                            sessionStorage.removeItem("editingOrderName");
                            setEditingOrderId(null);
                            setEditingOrderName(null);
                        }}
                        className="text-xs text-blue-600 font-bold mt-2 underline"
                    >
                        Cancelar y crear pedido nuevo
                    </button>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6 text-center text-[#333] font-[Ubuntu]">
                Resumen de compra
            </h2>

            <div className="flex-1 space-y-6">
                {/* Resumen Card */}
                <div className="bg-black/5 rounded-[20px] p-6 border border-black/10 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-600 font-[Ubuntu]">Cantidad de productos:</span>
                        <span className="text-base font-semibold text-[#333] font-[Ubuntu]">{totalItems}</span>
                    </div>

                    <div className="flex justify-between items-center mb-3 border-b border-black/10 pb-3">
                        <span className="text-sm text-gray-600 font-[Ubuntu]">Subtotal:</span>
                        <span className="text-base font-semibold text-[#333] font-[Ubuntu]">${formatPrice(subtotal)}</span>
                    </div>

                    {isDelivery && (
                        <div className="flex justify-between items-center mb-3 border-b border-black/10 pb-3">
                            <span className="text-sm text-gray-600 font-[Ubuntu]">Costo de Domicilio:</span>
                            <span className="text-base font-semibold text-[#333] font-[Ubuntu]">${formatPrice(shippingCost)}</span>
                        </div>
                    )}

                    <div className="pt-2 flex justify-between items-center">
                        <span className="text-lg font-bold" style={{ color: ColorGlobal }}>Total a pagar:</span>
                        <span className="text-3xl font-extrabold" style={{ color: ColorGlobal }}>
                            ${formatPrice(total)}
                        </span>
                    </div>
                </div>

                {/* Ubicación / Identificación */}
                {!editingOrderId && (
                    <div>
                        <label className="block text-[15px] font-semibold text-[#333] mb-4 font-[Ubuntu] tracking-wide ml-1">
                            ¿Dónde estás? / Identificación:
                        </label>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Ej. Juan Pérez o Recoge en barra..."
                                className="w-full border border-black/10 rounded-[15px] p-4 text-[15px] text-[#333] bg-white font-[Ubuntu] shadow-sm focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': ColorGlobal } as any}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setMesa(null);
                                    setSelectedCustomer(null);
                                    setShowCustomerSelection(false);
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-5 gap-2 mb-3">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                                const isActive = mesa === num;
                                return (
                                    <button
                                        key={num}
                                        onClick={() => {
                                            setMesa(num);
                                            setName(`Mesa ${num}`);
                                            setSelectedCustomer(null);
                                            setShowCustomerSelection(false);
                                        }}
                                        className={`py-3 rounded-[12px] text-sm font-bold border transition-all duration-300 ${isActive
                                            ? "text-white shadow-md scale-[1.05]"
                                            : "bg-white border-black/10 text-gray-500 hover:bg-gray-50"
                                            }`}
                                        style={{
                                            backgroundColor: isActive ? ColorGlobal : undefined,
                                            borderColor: isActive ? ColorGlobal : undefined,
                                            boxShadow: isActive ? `0 4px 10px ${ColorGlobal}4D` : undefined
                                        }}
                                    >
                                        {num}
                                    </button>
                                );
                            })}
                        </div>
                        {name && (
                            <p className="mt-2 text-xs font-[Ubuntu]" style={{ color: ColorGlobal }}>
                                Seleccionado: <span className="font-bold">
                                    {selectedCustomer ? selectedCustomer.name : name}
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {/* Opción de Domicilio */}
                {/* <div>
                    <button
                        onClick={() => setIsDelivery(!isDelivery)}
                        className={`w-full flex justify-between items-center py-4 px-5 rounded-[15px] border transition-all duration-300 ${isDelivery
                            ? "bg-white border-black/10 shadow-sm"
                            : "bg-gray-50 border-black/5"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDelivery ? "border-transparent" : "border-gray-300"}`} style={{ backgroundColor: isDelivery ? ColorGlobal : 'transparent' }}>
                                {isDelivery && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className="font-bold text-[#333] font-[Ubuntu]">¿Es para Domicilio?</span>
                        </div>
                        {isDelivery && (
                            <span className="text-sm font-bold" style={{ color: ColorGlobal }}>
                                +${formatPrice(shippingCost)}
                            </span>
                        )}
                    </button>
                    {isDelivery && (
                        <p className="mt-2 ml-1 text-xs text-gray-500 font-[Ubuntu]">
                            {totalItems >= 4 ? "Costo por cantidad mayor a 3 productos ($2.000)" : "Costo estándar de domicilio ($1.000)"}
                        </p>
                    )}
                </div> */}

                {/* Notas del pedido */}
                <div>
                    <label className="block text-[15px] font-semibold text-[#333] mb-3 font-[Ubuntu] tracking-wide ml-1">
                        Notas del pedido:
                    </label>
                    <textarea
                        className="w-full border border-black/10 rounded-[15px] p-4 text-[15px] text-[#333] bg-white font-[Ubuntu] shadow-sm focus:outline-none focus:ring-2 min-h-[120px] resize-none"
                        style={{ '--tw-ring-color': ColorGlobal } as any}
                        placeholder="Ej: Sin cebolla, recoger a las 8pm..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                    />
                </div>

                {/* Botón */}
                <button
                    onClick={handleCheckout}
                    disabled={saving}
                    className={`w-full py-5 rounded-[20px] text-white font-extrabold text-base tracking-[2px] uppercase shadow-lg transition-all duration-300 active:scale-95 ${saving ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"
                        }`}
                    style={{
                        backgroundColor: ColorGlobal,
                        boxShadow: `0 8px 15px ${ColorGlobal}66`
                    }}
                >
                    {saving ? "Procesando..." : "Checkout"}
                </button>
            </div>
        </div>
    );
}
