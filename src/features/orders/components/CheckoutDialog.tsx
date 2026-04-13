import React, { useState, useMemo, useEffect, useRef } from "react";
import { Order } from "../../comanda/types/order.types";
import { useAllProducts } from "../hooks/useAllProducts";
import { useCreditCustomers } from "../../cart/hooks/useCreditCustomers";
import { InvoiceReceipt } from "./InvoiceReceipt";
import { ColorGlobal } from "@/src/global/colorGlobal";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/src/firebase/config";
import { RestaurantId } from "@/src/global/id";

interface CheckoutDialogProps {
    open: boolean;
    order: (Order & { id: string }) | null;
    onClose: () => void;
    onComplete: (order: Order & { id: string }, finalPaymentMethod: string, customer?: { id: string, name: string }) => Promise<void>;
}

export default function CheckoutDialog({
    open,
    order,
    onClose,
    onComplete,
}: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");
    const [cashReceived, setCashReceived] = useState<number | "">("");
    const [cashCurrency, setCashCurrency] = useState<"COP" | "USD">("COP");
    const [usdExchangeRate, setUsdExchangeRate] = useState<number>(4200);
    const [isRemoving, setIsRemoving] = useState<number | null>(null);

    // Plan Guía
    const [isGuiaPlan, setIsGuiaPlan] = useState<boolean>(false);

    // Tip & Discount States
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [tipMode, setTipMode] = useState<"percentage" | "fixed">("percentage");
    const [tipPercentage, setTipPercentage] = useState<number>(0);
    const [tipFixedAmount, setTipFixedAmount] = useState<number | "">("");

    const [discountType, setDiscountType] = useState<"none" | "total" | "producto">("none");
    const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">("percentage");
    const [discountValue, setDiscountValue] = useState<number | "">("");
    const [discountProductIdx, setDiscountProductIdx] = useState<number | "">("");

    const { products: allProducts } = useAllProducts();
    const { customers: creditCustomers } = useCreditCustomers();

    const selectedCustomer = useMemo(() =>
        creditCustomers.find(c => c.id === selectedCustomerId),
        [creditCustomers, selectedCustomerId]);

    // Calculate total whenever an order is active
    const subTotal = useMemo(() => {
        if (!order || !order.products) return 0;
        return order.products.reduce(
            (acc, p) => acc + (p.price * p.quantity),
            0
        );
    }, [order]);

    const guiaDiscount = useMemo(() => {
        if (!isGuiaPlan || !order || !order.products) return 0;
        let foodCount = 0;
        order.products.forEach(p => {
            const productDef = allProducts.find(prod => prod.id === p.productId);
            const cat = productDef?.category?.toLowerCase() || "";
            const name = p.productName.toLowerCase();

            const isDrink = cat.includes("bebida") || cat.includes("jugo") || cat.includes("gaseosa") ||
                cat.includes("cerveza") || cat.includes("licor") || cat.includes("trago") ||
                name.includes("bebida") || name.includes("jugo") || name.includes("gaseosa") ||
                name.includes("cerveza") || name.includes("limonada") || name.includes("agua");

            if (!isDrink) {
                foodCount += Number(p.quantity || 1);
            }
        });
        return foodCount * 5000;
    }, [isGuiaPlan, order, allProducts]);

    const discountAmount = useMemo(() => {
        let baseDiscount = 0;
        if (discountType !== "none" && discountValue) {
            let targetAmount = subTotal;
            if (discountType === "producto") {
                if (discountProductIdx !== "") {
                    const p = order?.products?.[Number(discountProductIdx)];
                    if (p) targetAmount = (p.price * p.quantity);
                }
            }
            if (discountMode === "percentage") {
                baseDiscount = Math.round(targetAmount * (Number(discountValue) / 100));
            } else {
                baseDiscount = Number(discountValue);
            }
            baseDiscount = Math.min(baseDiscount, targetAmount);
        }

        return baseDiscount + guiaDiscount;
    }, [discountType, discountMode, discountValue, discountProductIdx, subTotal, order, guiaDiscount]);

    const tipAmount = useMemo(() => {
        const baseForTip = subTotal - discountAmount;
        if (tipMode === "percentage") return Math.round(baseForTip * (tipPercentage / 100));
        return Number(tipFixedAmount) || 0;
    }, [subTotal, discountAmount, tipPercentage, tipFixedAmount, tipMode]);

    const totalGeneral = subTotal - discountAmount + tipAmount;

    useEffect(() => {
        if (order && order.paymentMethod) {
            setPaymentMethod(order.paymentMethod.toLowerCase());
        }
        setTipMode("percentage");
        setTipPercentage(0);
        setTipFixedAmount("");
        setCashReceived("");
        setCashCurrency("COP");
        setDiscountType("none");
        setDiscountMode("percentage");
        setDiscountValue("");
        setDiscountProductIdx("");
        setIsGuiaPlan(false);
        setSelectedCustomerId("");
    }, [order]);

    // In COP always — if paying in USD, convert to COP first
    const receivedInCOP = useMemo(() => {
        if (cashReceived === "") return 0;
        if (cashCurrency === "USD") return Number(cashReceived) * usdExchangeRate;
        return Number(cashReceived);
    }, [cashReceived, cashCurrency, usdExchangeRate]);

    const changeToGive = useMemo(() => {
        if (paymentMethod !== "efectivo" || cashReceived === "") return 0;
        return receivedInCOP > totalGeneral ? receivedInCOP - totalGeneral : 0;
    }, [receivedInCOP, totalGeneral, paymentMethod, cashReceived]);

    const isShortOnCash =
        paymentMethod === "efectivo" &&
        cashReceived !== "" &&
        receivedInCOP < totalGeneral;

    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!componentRef.current) return;
        const printContent = componentRef.current.innerHTML;
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Factura</title>');
            printWindow.document.write(`<base href="${window.location.origin}" />`);
            printWindow.document.write('<style>body { font-family: monospace; padding: 20px; } .flex { display: flex; } .justify-between { justify-content: space-between; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .text-xl { font-size: 1.25rem; } .mb-6 { margin-bottom: 1.5rem; } .pb-4 { padding-bottom: 1rem; } .border-b { border-bottom: 1px solid #e5e7eb; } .border-t { border-top: 1px solid #e5e7eb; } .pt-4 { padding-top: 1rem; } .text-gray-500 { color: #6b7280; } .uppercase { text-transform: uppercase; } .text-red-600 { color: #dc2626; } .text-green-600 { color: #16a34a; } .mt-8 { margin-top: 2rem; } .text-xs { font-size: 0.75rem; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    const handleRemoveProduct = async (indexToRemove: number) => {
        if (!order || !order.id) return;
        const confirmDelete = window.confirm("¿Estás seguro de eliminar este producto de la orden? La actualización es inmediata.");
        if (!confirmDelete) return;

        setIsRemoving(indexToRemove);
        try {
            const newProducts = [...order.products];
            newProducts.splice(indexToRemove, 1);
            
            const newTotal = newProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);

            const orderRef = doc(db, "restaurants", RestaurantId, "orders", order.id);
            await updateDoc(orderRef, {
                products: newProducts,
                total: newTotal
            });
            
            if (newProducts.length === 0) {
               onClose();
            }
        } catch (e) {
            console.error("Error removing product:", e);
            alert("Error al eliminar el producto.");
        } finally {
            setIsRemoving(null);
        }
    };

    const handleFinish = async () => {
        if (isShortOnCash) return;
        if (paymentMethod === "fiado" && !selectedCustomerId) return;

        if (order) {
            const customerData = selectedCustomer ? {
                id: selectedCustomer.id!,
                name: selectedCustomer.name
            } : undefined;

            const payload: any = {
                ...order,
                subTotal,
                discountAmount: discountAmount > 0 ? discountAmount : null,
                discountType: discountAmount > 0 ? (discountType as "total" | "producto") : null,
                discountMode: discountAmount > 0 ? discountMode : null,
                discountValue: discountAmount > 0 ? Number(discountValue) : null,
                discountProductId: discountAmount > 0 && discountType === "producto" && discountProductIdx !== ""
                    ? order.products[Number(discountProductIdx)].productId
                    : null,
                isGuiaPlan,
                guiaDiscount: guiaDiscount > 0 ? guiaDiscount : null,
                tipPercentage,
                tipAmount,
                total: totalGeneral,
                customer: customerData,
                // USD payment fields
                cashCurrency: paymentMethod === "efectivo" ? cashCurrency : null,
                usdAmount: paymentMethod === "efectivo" && cashCurrency === "USD" && cashReceived !== "" ? Number(cashReceived) : null,
                changeInCOP: paymentMethod === "efectivo" && changeToGive > 0 ? changeToGive : null,
                exchangeRate: paymentMethod === "efectivo" && cashCurrency === "USD" ? usdExchangeRate : null,
            };

            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined || payload[key] === null) {
                    delete payload[key];
                }
            });

            await onComplete(payload, paymentMethod, customerData);
        }
    };

    if (!open || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-[Ubuntu]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${ColorGlobal}15`, color: ColorGlobal }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">Checkout & Facturación</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Orden a cobrar</p>
                        <p className="text-xl font-black text-gray-800">{order.name || (order.mesa ? `Mesa ${order.mesa}` : "Sin nombre")}</p>
                    </div>

                    {/* Plan Guia */}
                    <div className={`p-4 rounded-2xl border-2 transition-colors ${isGuiaPlan ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className={`font-black text-lg ${isGuiaPlan ? 'text-green-600' : 'text-gray-800'}`}>🗺️ Plan Guía</h3>
                                <p className="text-sm text-gray-500 font-medium">Aplica -$5.000 por cada plato (excluye bebidas).</p>
                            </div>
                            <button
                                onClick={() => setIsGuiaPlan(!isGuiaPlan)}
                                className={`px-4 py-2 font-bold rounded-xl transition-all ${isGuiaPlan ? 'bg-green-600 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-green-500 hover:text-green-600'}`}
                            >
                                {isGuiaPlan ? "ACTIVADO" : "ACTIVAR"}
                            </button>
                        </div>
                        {isGuiaPlan && guiaDiscount > 0 && (
                            <p className="text-right mt-2 font-black text-green-600">
                                Descuento Guía: -${guiaDiscount.toLocaleString()}
                            </p>
                        )}
                    </div>

                    {/* Propina */}
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Agregar Propina:</p>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setTipMode("percentage")}
                                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tipMode === "percentage" ? 'bg-gray-800 text-white' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-800'}`}
                            >
                                Porcentaje (%)
                            </button>
                            <button
                                onClick={() => setTipMode("fixed")}
                                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tipMode === "fixed" ? 'bg-gray-800 text-white' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-800'}`}
                            >
                                Monto Fijo ($)
                            </button>
                        </div>

                        {tipMode === "percentage" ? (
                            <div className="flex flex-wrap gap-2 items-center">
                                {[0, 5, 10, 15].map((pct) => (
                                    <button
                                        key={pct}
                                        onClick={() => setTipPercentage(pct)}
                                        className={`w-16 py-2 font-bold rounded-xl transition-all ${tipPercentage === pct ? 'bg-gray-800 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-800'}`}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="Otro"
                                        value={![0, 5, 10, 15].includes(tipPercentage) ? tipPercentage || '' : ""}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (val >= 0) setTipPercentage(val);
                                        }}
                                        className="w-24 py-2 pl-3 pr-8 font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none transition-colors"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    type="number"
                                    placeholder="Escribe el monto..."
                                    value={tipFixedAmount}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setTipFixedAmount(val >= 0 ? val : "");
                                    }}
                                    className="w-full py-2 pl-8 pr-3 font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Descuentos */}
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Promociones y Descuentos:</p>
                        <select
                            value={discountType}
                            onChange={(e) => {
                                setDiscountType(e.target.value as any);
                                setDiscountValue("");
                                setDiscountProductIdx("");
                            }}
                            className="w-full p-3 font-medium text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none transition-colors appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        >
                            <option value="none">Sin descuento</option>
                            <option value="total">Descuento al Total de la Orden</option>
                            <option value="producto">Descuento a un Producto Específico</option>
                        </select>

                        {discountType !== "none" && (
                            <div className="p-4 mt-3 bg-gray-50 rounded-2xl border border-gray-200">
                                {discountType === "producto" && (
                                    <select
                                        value={discountProductIdx}
                                        onChange={(e) => setDiscountProductIdx(Number(e.target.value))}
                                        className="w-full mb-3 p-3 font-medium text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none transition-colors appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <option value="">Seleccionar Producto...</option>
                                        {order.products?.map((p, idx) => (
                                            <option key={idx} value={idx}>
                                                {p.quantity}x {p.productName} (${(p.price * p.quantity).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={() => setDiscountMode("percentage")}
                                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${discountMode === "percentage" ? 'bg-purple-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-purple-600 hover:text-purple-600'}`}
                                    >
                                        Porcentaje (%)
                                    </button>
                                    <button
                                        onClick={() => setDiscountMode("fixed")}
                                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${discountMode === "fixed" ? 'bg-purple-600 text-white' : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-purple-600 hover:text-purple-600'}`}
                                    >
                                        Monto Fijo ($)
                                    </button>
                                </div>

                                <div className="relative">
                                    {discountMode === "fixed" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>}
                                    <input
                                        type="number"
                                        placeholder={discountMode === "percentage" ? "Ej. 10" : "Ej. 5000"}
                                        value={discountValue}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setDiscountValue(val >= 0 ? val : "");
                                        }}
                                        className={`w-full py-2 font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:outline-none transition-colors ${discountMode === "fixed" ? 'pl-8 pr-3' : 'pl-3 pr-8'}`}
                                    />
                                    {discountMode === "percentage" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen */}
                    <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-200">
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-bold">Subtotal ({order.products?.length || 0} productos)</span>
                                <span className="font-bold text-gray-800">${subTotal.toLocaleString()}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-red-500">
                                    <span className="font-bold">Descuento {discountMode === "percentage" && `(${discountValue}%)`} {discountType === "producto" && `- Prod`}</span>
                                    <span className="font-black">-${discountAmount.toLocaleString()}</span>
                                </div>
                            )}

                            {tipAmount > 0 && (
                                <div className="flex justify-between items-center text-green-500">
                                    <span className="font-bold">Propina {tipMode === "percentage" && `(${tipPercentage}%)`}</span>
                                    <span className="font-black">+${tipAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center">
                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-1">Total a Pagar</p>
                            <p className="text-5xl font-black" style={{ color: ColorGlobal }}>${totalGeneral.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="space-y-4">
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full p-4 font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-2xl focus:border-gray-800 focus:outline-none transition-colors appearance-none text-lg"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23374151' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 16px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                        >
                            <option value="efectivo">💵 Efectivo</option>
                            <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
                            <option value="transferencia">🏦 Transferencia / Nequi</option>
                            <option value="fiado">📝 Fiado (Pendiente Cobro)</option>
                            <option value="otro">🏷️ Otro</option>
                        </select>

                        {paymentMethod === "fiado" && (
                            <div className="space-y-2">
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className={`w-full p-3 font-medium bg-white border-2 rounded-xl focus:outline-none transition-colors appearance-none ${!selectedCustomerId ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-gray-800'}`}
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 10px center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                >
                                    <option value="">Seleccionar Cliente de Crédito...</option>
                                    {creditCustomers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                                        </option>
                                    ))}
                                </select>
                                {!selectedCustomerId && <p className="text-red-500 text-sm font-bold ml-1">Debes seleccionar un cliente para fiar</p>}
                            </div>
                        )}

                        {paymentMethod === "efectivo" && (
                            <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-200/50 space-y-3">
                                <p className="font-black text-amber-700 text-sm">CALCULADORA DE CAMBIO</p>

                                {/* Currency Selector */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setCashCurrency("COP"); setCashReceived(""); }}
                                        className={`flex-1 py-2 text-sm font-black rounded-xl border-2 transition-all ${
                                            cashCurrency === "COP"
                                                ? "bg-amber-600 text-white border-amber-600 shadow"
                                                : "bg-white text-amber-700 border-amber-300 hover:border-amber-500"
                                        }`}
                                    >
                                        🪙 Pesos (COP)
                                    </button>
                                    <button
                                        onClick={() => { setCashCurrency("USD"); setCashReceived(""); }}
                                        className={`flex-1 py-2 text-sm font-black rounded-xl border-2 transition-all ${
                                            cashCurrency === "USD"
                                                ? "bg-green-600 text-white border-green-600 shadow"
                                                : "bg-white text-green-700 border-green-300 hover:border-green-500"
                                        }`}
                                    >
                                        💵 Dólares (USD)
                                    </button>
                                </div>

                                {/* TRM field when USD */}
                                {cashCurrency === "USD" && (
                                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                        <span className="text-xs font-black text-green-700 whitespace-nowrap">TRM del día:</span>
                                        <span className="text-xs text-green-600">1 USD =</span>
                                        <input
                                            type="number"
                                            value={usdExchangeRate}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                if (val > 0) setUsdExchangeRate(val);
                                            }}
                                            className="flex-1 py-1 px-2 text-sm font-black text-green-800 bg-white border border-green-300 rounded-lg focus:outline-none focus:border-green-500"
                                        />
                                        <span className="text-xs font-black text-green-700">COP</span>
                                    </div>
                                )}

                                {/* Cash input + Change display */}
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                {cashCurrency === "USD" ? "$" : "$"}
                                            </span>
                                            <input
                                                type="number"
                                                placeholder={cashCurrency === "USD" ? "USD recibido" : "COP recibido"}
                                                value={cashReceived}
                                                onChange={(e) => setCashReceived(e.target.value ? Number(e.target.value) : "")}
                                                className={`w-full py-3 pl-8 pr-3 font-black text-gray-800 bg-white border-2 rounded-xl focus:outline-none transition-colors ${isShortOnCash ? 'border-red-400 focus:border-red-500 text-red-600' : 'border-amber-200 focus:border-amber-400'}`}
                                            />
                                            {cashCurrency === "USD" && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-green-600">USD</span>
                                            )}
                                        </div>
                                        {cashCurrency === "USD" && cashReceived !== "" && (
                                            <p className="text-xs text-green-700 font-bold mt-1 ml-1">
                                                ≈ ${receivedInCOP.toLocaleString()} COP
                                            </p>
                                        )}
                                        {isShortOnCash && (
                                            <p className="text-red-500 text-sm font-bold mt-1 ml-1">
                                                Monto insuficiente
                                            </p>
                                        )}
                                    </div>

                                    <div className={`px-4 py-3 rounded-xl border-2 text-center min-w-[140px] ${cashReceived ? (isShortOnCash ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') : 'bg-white border-gray-200'}`}>
                                        <p className={`text-xs font-black mb-1 ${cashReceived ? (isShortOnCash ? 'text-red-500' : 'text-green-600') : 'text-gray-400'}`}>
                                            {isShortOnCash ? "FALTA" : "CAMBIO"}
                                        </p>
                                        <p className={`text-xl font-black ${cashReceived ? (isShortOnCash ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
                                            ${isShortOnCash
                                                ? (totalGeneral - receivedInCOP).toLocaleString()
                                                : changeToGive.toLocaleString()}
                                        </p>
                                        {cashCurrency === "USD" && cashReceived !== "" && !isShortOnCash && (
                                            <p className="text-xs font-bold text-green-500 mt-1">en COP</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod !== "efectivo" && paymentMethod !== "fiado" && (
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 font-medium text-sm flex gap-3 items-center">
                                <svg className="w-5 h-5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Verifica el comprobante bancario antes de finalizar la orden.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-gray-600 bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleFinish}
                        disabled={isShortOnCash || (paymentMethod === "fiado" && !selectedCustomerId)}
                        className="flex-1 flex items-center justify-center gap-2 px-8 py-4 font-black text-white bg-green-500 rounded-2xl shadow-lg shadow-green-500/30 hover:bg-green-600 hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-green-500/30 transition-all text-lg"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        COBRAR Y FACTURAR
                    </button>
                </div>

                {/* Hidden Receipt */}
                <div className="hidden">
                    <InvoiceReceipt
                        ref={componentRef}
                        order={{
                            ...order,
                            subTotal,
                            discountAmount,
                            tipAmount,
                            total: totalGeneral,
                            isGuiaPlan,
                            guiaDiscount,
                            paymentMethod
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
