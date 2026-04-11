import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/src/firebase/config";
import { RestaurantId } from "@/src/global/id";
import { Order } from "@/src/features/comanda/types/order.types";
import { useAuth } from "@/src/context/AuthContext";

export type OrderWithId = Order & { id: string };

export const useOrders = () => {
    const [orders, setOrders] = useState<OrderWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        // All authenticated users can see all orders
        const q = query(
            collection(db, "restaurants", RestaurantId, "orders"),
            orderBy("date", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedOrders: OrderWithId[] = snapshot.docs.map(doc => {
                    const data = doc.data() as Order;
                    return { ...data, id: doc.id };
                });
                setOrders(fetchedOrders);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Error fetching orders:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    return { orders, loading, error };
};


