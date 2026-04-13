import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Addition } from "../types/addition";
import { db } from "@/src/firebase/config";
import { RestaurantId } from "@/src/global/id";

export function useAdditions(categoryName: string) {
    const [additions, setAdditions] = useState<Addition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!categoryName) {
            setLoading(false);
            return;
        }

        // Suscripción única a la colección "additions"
        const q = query(collection(db, "restaurants", RestaurantId, "additions"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Addition[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const catValue = data.category || data.categoryName || data.cat || data.id_category;
                return {
                    id: docSnap.id,
                    name: data.name || "",
                    price: data.price || 0,
                    category: String(catValue || ""),
                } as Addition;
            });

            // Filtrar por categoría (case-insensitive)
            const filtered = items.filter(
                (a) => a.category?.toLowerCase() === categoryName?.toLowerCase()
            );

            setAdditions(filtered);
            setLoading(false);
        }, () => {
            setLoading(false);
        });

        return () => unsubscribe();
    }, [categoryName]);

    return { additions, loading };
}
