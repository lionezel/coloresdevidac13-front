"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/firebase/config";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { ColorGlobal } from "@/src/global/colorGlobal";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.replace("/home");
        }
    }, [user, loading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            router.push("/home");
        } catch (err: any) {
            console.error("Login error:", err?.code, err?.message);
            if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
                setError("Correo o contraseña incorrectos. Verifica tus credenciales.");
            } else if (err?.code === "auth/too-many-requests") {
                setError("Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.");
            } else if (err?.code === "auth/network-request-failed") {
                setError("Error de red. Revisa tu conexión a internet.");
            } else if (err?.code === "auth/invalid-email") {
                setError("El formato del correo electrónico no es válido.");
            } else {
                setError(err?.message || "Ocurrió un error al iniciar sesión.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div
                    className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderTopColor: ColorGlobal }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#f8f5f0]">
            {/* Background decorative elements */}
            <div
                className="absolute top-0 left-0 right-0 h-[55%] rounded-b-[60px]"
                style={{ backgroundColor: ColorGlobal }}
            />
            <div className="absolute top-8 right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
            <div className="absolute top-20 left-6 w-20 h-20 rounded-full opacity-10 bg-white" />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo / Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-white shadow-2xl mb-6">
                        <span className="text-4xl">🍽️</span>
                    </div>
                    <h1 className="text-4xl font-black text-white font-[Ubuntu] tracking-tight">
                        Colores de Vida Mesera
                    </h1>
                    <p className="text-white/70 mt-2 font-medium text-lg">
                        Bienvenida, mesera
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.15)]">
                    <h2 className="text-2xl font-black text-gray-800 mb-1 font-[Ubuntu]">
                        Iniciar Sesión
                    </h2>
                    <p className="text-gray-500 text-sm mb-7">
                        Ingresa tus credenciales para continuar
                    </p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="mesera@coloresdevida.com"
                                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl text-gray-800 font-medium focus:outline-none focus:border-gray-800 transition-colors bg-gray-50 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-4 border-2 border-gray-100 rounded-2xl text-gray-800 font-medium focus:outline-none focus:border-gray-800 transition-colors bg-gray-50 focus:bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 rounded-2xl text-white font-black text-lg tracking-wide shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: ColorGlobal,
                                boxShadow: `0 8px 20px ${ColorGlobal}50`,
                            }}
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-3">
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Entrando...
                                </span>
                            ) : "Entrar"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-white/50 text-xs mt-8">
                    ¿Problemas para ingresar? Contacta al administrador.
                </p>
            </div>
        </div>
    );
}
