import React, { forwardRef } from "react";
import { Order } from "../../comanda/types/order.types";
import { ColorGlobal } from "@/src/global/colorGlobal";

interface InvoiceReceiptProps {
    order: (Order & {
        subTotal?: number;
        discountAmount?: number;
        tipAmount?: number;
        isGuiaPlan?: boolean;
        guiaDiscount?: number;
    }) | null;
}

export const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
    ({ order }, ref) => {
        if (!order) return null;

        const formatPrice = (num: number) => {
            return num.toLocaleString('es-CO', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
            }).replace(',', '.');
            // In Colombia, sometimes numbers are represented without decimals just using dots for thousands.
            // e.g. 59000 -> "59.000". `toLocaleString('es-CO')` automatically does `59.000` for 59000.
        };

        // Standard formatting 59000 -> 59.000
        const priceToString = (num: number) => num.toLocaleString('es-CO');

        const formatDate = (dateInput: any) => {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strTime = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds + ' ' + ampm;

            return `${day}/${month}/${year} ${strTime}`;
        };

        return (
            <div ref={ref} className="bg-white text-black font-mono w-full max-w-[300px] mx-auto text-[12px] p-2 leading-tight" style={{ fontFamily: '"Courier New", Courier, monospace', width: '300px' }}>
                <div className="flex flex-col items-center mb-4 text-center">
                    <img src="/logoc.jpeg" alt="Colores de Vida" className="w-[180px] h-auto mb-2 grayscale" style={{ filter: 'grayscale(100%) brightness(0.8) contrast(1.2)' }} />
                    <p>COLORES DE VIDA</p>
                    <p>2DO TRAMO ESCALERAS ELECTRICAS</p>
                    <p>COMUNA 13 - MEDELLIN</p>
                    <p>TELEFONO: 310 743 3397</p>
                    <p>NIT: 1152185281-1</p>
                    <p>GRACIAS POR VISITARNOS</p>
                    <p>**** CUENTA POR PAGAR ****</p>
                </div>

                <div className="mb-4">
                    <div className="grid grid-cols-[100px_1fr]">
                        <span>Recibo:</span>
                        <span>{order.orderNumber ? `JS011${order.orderNumber}` : "JS011850"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <span>Fecha:</span>
                        <span>{formatDate(order.date)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <span>Equipo:</span>
                        <span>DESKTOP-4DFJV64</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr]">
                        <span>Atendido X:</span>
                        <span>{order.mesera?.toUpperCase() || "ADMIN"}</span>
                    </div>
                </div>

                <div className="mb-2">
                    <div className="grid grid-cols-[1fr_50px_40px_60px] border-b border-black border-dashed pb-1 mb-1">
                        <span>Producto</span>
                        <span className="text-right">Precio</span>
                        <span className="text-right">Cant</span>
                        <span className="text-right">Valor</span>
                    </div>
                    {order.products.map((p, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_50px_40px_60px] items-start mb-1 leading-none" style={{ alignItems: 'flex-start' }}>
                            <span className="uppercase pr-1" style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>{p.productName}</span>
                            <span className="text-right">{priceToString(p.price)}</span>
                            <span className="text-right">x{p.quantity}</span>
                            <span className="text-right">{priceToString(p.price * p.quantity)}</span>
                        </div>
                    ))}
                    <div className="border-t border-black border-dashed mt-1"></div>
                </div>

                <div className="mb-4 mt-2 uppercase">
                    <p>PRODUCTOS A PAGAR EN CAJA:{order.products.reduce((acc, p) => acc + p.quantity, 0)}</p>
                </div>

                <div className="mb-4">
                    <div className="grid grid-cols-[80px_1fr]">
                        <span className="font-bold">Subtotal:</span>
                        <span>{priceToString(order.subTotal || order.total)}</span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr]">
                        <span>Impuesto:</span>
                        <span>000</span>
                    </div>

                    {order.discountAmount ? (
                        <div className="grid grid-cols-[80px_1fr]">
                            <span>Descuento:</span>
                            <span>-{priceToString(order.discountAmount)}</span>
                        </div>
                    ) : null}

                    {order.tipAmount ? (
                        <div className="grid grid-cols-[80px_1fr]">
                            <span>Propina:</span>
                            <span>+{priceToString(order.tipAmount)}</span>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-[80px_1fr] mt-2 text-[14px]">
                        <span className="font-bold">TOTAL:</span>
                        <span className="font-bold">{priceToString(order.total)}</span>
                    </div>

                    <p className="mt-1 font-bold text-[14px] uppercase mb-4">
                        {order.paymentMethod?.toLowerCase() === 'efectivo' ? "VENTA EN EFECTIVO" : "VENTA CON TARJETA"}
                    </p>

                    {order.paymentMethod?.toLowerCase() !== 'efectivo' && (
                        <p className="text-center mb-4">
                            A card payment was received
                        </p>
                    )}

                    <div className="grid grid-cols-[80px_1fr] mt-4">
                        <span>MONTO</span>
                        <span className="text-right">{priceToString(order.total)}</span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] font-bold mt-1 text-[13px]">
                        <span>Total</span>
                        <span className="text-right">{priceToString(order.total)}</span>
                    </div>
                </div>
            </div>
        );
    }
);

InvoiceReceipt.displayName = "InvoiceReceipt";
