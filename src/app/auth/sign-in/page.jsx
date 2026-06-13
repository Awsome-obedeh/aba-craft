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
import Image from "next/image";


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

            // Honor ?redirect= (validated by caller to prevent open redirects),
            // otherwise default per role so a customer doesn't land on a vendor page.
            const params = new URLSearchParams(window.location.search);
            const requestedRedirect = params.get("redirect");
            let next;
            if (requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")) {
                next = requestedRedirect;
            } else if (user.role === "vendor") {
                next = "/dashboard/vendor/profile";
            } else if (user.role === "admin") {
                next = "/dashboard";
            } else {
                next = "/dashboard/products";
            }

            toast.success("Welcome back!");
            router.push(next);
        } catch (error) {
            // Server replied with EMAIL_NOT_VERIFIED — send them back to the
            // verify screen rather than dumping a generic toast.
            if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
                localStorage.setItem("email", data.email);
                toast.info("Verify your email to continue");
                router.push("/auth/verify");
                return;
            }

            
            if (error.response) {
                toast.error(error.response.data?.message || "Something went wrong");
            } else if (error.request) {
                toast.error("Network error. Check your internet connection.");
            } else {
                toast.error("Unexpected error occurred");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <form className="w-full max-w-md text-center" onSubmit={handleSubmit(onSubmit)}>
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16  rounded-full flex items-center justify-center">
                        <Image src='/aba-crafts-logo.PNG' width={300} height={400} alt="logo"/>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-xl font-semibold">Welcome to Aba Crafts</h1>
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

                <div className="text-left text-sm text-gray-600 space-y-5 mt-5">
                    <Link href="sign-up" className="text-black flex gap-2 items-center hover:underline">
                        Sell on Aba Crafts
                        <LuSquareArrowOutUpRight size={20} />
                    </Link>
                    <Link href="customer-signup" className="text-black hover:underline block">
                        Create a buyer account
                    </Link>
                </div>

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

