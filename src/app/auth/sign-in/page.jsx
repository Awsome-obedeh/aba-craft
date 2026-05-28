"use client"


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import { LuSquareArrowOutUpRight } from "react-icons/lu";
import { toast } from "react-toastify";
import { FaRegEyeSlash } from "react-icons/fa6";
import { IoEyeSharp } from "react-icons/io5";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";


export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset

    } = useForm();

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const res = await api.post('/auth/sign-in', { ...data });

            // Extract token and user data from backend response
            const { accessToken, user } = res.data;

            console.log("ACCESS TOKEN:", accessToken, "USER:", user);

            // Save to memory (Zustand) -> Interceptor picks this up immediately
            useAuthStore.getState().setAuthData(accessToken, user);

            toast.success("Welcome back!");
            // router.push('/dashboard/vendor/upload-product');
        } catch (error) {
            // ... your error handling
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <form className="w-full max-w-md text-center" onSubmit={handleSubmit(onSubmit)}>
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-xl font-semibold">Welcome to Abacraft</h1>
                <p className="text-sm text-gray-500 mt-2">
                    Use your email and password to log in
                </p>

                {/* Input */}
                <div className="mt-6 text-left">
                    <label className="text-xs text-black">Email *</label>
                    <input
                        type="text"
                        className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring-2 focus:ring-black"
                        placeholder="Enter email "
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^\S+@\S+$/i,
                                message: "Invalid email address",
                            },
                        })}

                    />

                    {errors.email && (
                        <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                    )}
                </div>
                <div className="mt-6 text-left">
                    <label className="text-xs text-black">Password *</label>

                    <div className="border border-black flex items-center rounded-md mt-1 p-3 outline-none focus-within:ring-2 focus-within:ring-black gap-3">

                        <input
                            type={showPassword ? "text" : "password"}
                            className="w-[80%] mt-1  outline-none"
                            placeholder="Enter password "
                            {...register("password", {
                                required: "Password is required",
                                minLength: {
                                    value: 8,
                                    message: "Password must be at least 8 characters long"
                                }
                            })}
                        />

                        <div className="justify-end flex w-full">
                            {showPassword ? (

                                <IoEyeSharp size={20} className="cursor-pointer" onClick={() => setShowPassword(false)} />
                            ) : (
                                <FaRegEyeSlash size={20} className="cursor-pointer" onClick={() => setShowPassword(true)} />
                            )}
                        </div>
                    </div>

                    {errors.password && (
                        <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                    )}
                </div>

                <Link href="sign-up" className="cursor-pointer text-sm text-black text-left py-2 flex gap-2 items-center">Sell on Aba Craft

                    <LuSquareArrowOutUpRight size={20} />
                </Link>

                {/* Button */}
                <button className="w-full mt-6 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition">
                    {loading ? "Logging in..." : "Continue"}
                </button>

                {/* Divider */}
                <div className="flex items-center my-6">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="px-3 text-xs text-gray-500">Or log in with</span>
                    <div className="flex-1 h-px bg-gray-300" />
                </div>


                <div className="flex justify-center gap-6">


                    {/* Google */}
                    <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white border">
                        <FaGoogle size={20} />
                    </button>
                </div>
            </form>
        </div>
    )

};

