"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import axios from "axios";
import { useState } from "react";
import { CiCircleCheck } from "react-icons/ci";
import { MdCancel } from "react-icons/md";
import { toast } from "react-toastify";
import { FaRegEyeSlash } from "react-icons/fa6";
import { IoEyeSharp } from "react-icons/io5";
import { useRouter } from "next/navigation";

const passwordChecks = (password) => ({
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialCharacter: /[@$!%*?&]/.test(password),
    hasMinLength: password.length >= 8,
});

const strengthMeta = (score) => {
    if (score <= 2) return { text: "Weak", color: "bg-red-500" };
    if (score <= 4) return { text: "Medium", color: "bg-yellow-500" };
    return { text: "Strong", color: "bg-green-500" };
};

const Requirement = ({ valid, text }) => (
    <div className="flex items-center gap-2 text-sm">
        {valid ? <CiCircleCheck className="w-d h-4 text-green-500" /> : <MdCancel className="w-d h-4 text-red-500" />}
        <span className={valid ? "text-green-600" : "text-gray-500"}>{text}</span>
    </div>
);

export default function CustomerSignUpPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm();

    const password = watch("password", "");
    const checks = passwordChecks(password);
    const score = Object.values(checks).filter(Boolean).length;
    const { text: strengthText, color: strengthColor } = strengthMeta(score);

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            // Force the role to "customer" — the page is customer-only and
            // doesn't surface a role selector.
            const payload = { ...data, role: "customer" };
            const res = await axios.post("/api/auth/sign-up", payload);

            toast.success("Verification code sent to your email");
            localStorage.setItem("email", payload.email);
            // Sign-up's intended role; verify page reads it to choose redirect.
            localStorage.setItem("intendedRole", "customer");
            router.push("/auth/verify");
        } catch (error) {
            console.error("CUSTOMER SIGN UP ERROR:", error);
            if (error.response) toast.error(error.response.data.message || "Something went wrong");
            else if (error.request) toast.error("Network error. Check your internet connection.");
            else toast.error("Unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center bg-white px-4 relative min-h-screen">
            <Image
                src="/sign-up-bg.svg"
                alt="Signup Background"
                className="hidden md:block w-full object-cover opacity-80 flex-1"
                width={400}
                height={400}
            />
            <div className="flex items-center justify-center bg-white px-4 flex-1">
                <form className="w-full max-w-md text-center" onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16  rounded-full flex items-center justify-center">
                            <Image src='/aba-crafts-logo.PNG' width={300} height={400} alt="logo" />
                        </div>
                    </div>

                    <h1 className="text-xl font-semibold">Create a buyer account</h1>
                    <p className="text-sm text-gray-500 mt-2">Shop handcrafted leather goods from Aba artisans.</p>

                    <div className="mt-6 text-left">
                        <label className="text-xs text-black">Email *</label>
                        <input
                            type="email"
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black"
                            placeholder="Enter email"
                            {...register("email", {
                                required: "Email is required",
                                pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" },
                            })}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="mt-6 text-left">
                        <label className="text-xs text-black">Password *</label>
                        <div className="border border-black flex items-center rounded-md mt-1 p-3 outline-none focus-within:ring-2 focus-within:ring-black gap-3">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-[80%] mt-1 outline-none"
                                placeholder="Enter password"
                                {...register("password", {
                                    required: "Password is required",
                                    minLength: { value: 8, message: "Password must be at least 8 characters long" },
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
                        {errors.password && <p className="text-red-500 text-sm mt-4">{errors.password.message}</p>}

                        <div className="mt-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Password Strength</span>
                                <span className="text-sm">{strengthText}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${strengthColor}`}
                                    style={{ width: `${(score / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <Requirement valid={checks.hasUppercase} text="At least one uppercase letter" />
                            <Requirement valid={checks.hasLowercase} text="At least one lowercase letter" />
                            <Requirement valid={checks.hasNumber} text="At least one number" />
                            <Requirement valid={checks.hasSpecialCharacter} text="At least one special character" />
                            <Requirement valid={checks.hasMinLength} text="Minimum 8 characters" />
                        </div>
                    </div>

                    <button
                        className={`w-full mt-6 ${loading ? "bg-gray-500" : "bg-black"} text-white py-3 rounded-md font-medium hover:opacity-90 transition`}
                    >
                        {loading ? "Loading..." : "Continue"}
                    </button>

                    <p className="text-xs text-gray-500 mt-4">
                        Want to sell on AbaCraft?{" "}
                        <Link href="/auth/sign-up" className="text-black font-medium underline">
                            Open a vendor account
                        </Link>
                        .
                    </p>

                    <div className="flex items-center my-6">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="px-3 text-xs text-gray-500">Or sign up with</span>
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    <div className="flex justify-center gap-6">
                        <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center bg-white border">
                            <FaGoogle size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
