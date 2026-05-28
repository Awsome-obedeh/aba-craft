"use client";
import Image from "next/image";
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

export default function SignUpPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset

    } = useForm();

    const password = watch("password", "");

    // Password checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialCharacter = /[@$!%*?&]/.test(password);
    const hasMinLength = password.length >= 8;

    // Password strength calculation
    const strengthChecks = [
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialCharacter,
        hasMinLength,
    ];

    const strength = strengthChecks.filter(Boolean).length;

    const getStrengthText = () => {
        if (strength <= 2) return "Weak";
        if (strength <= 4) return "Medium";
        return "Strong";
    };

    const getStrengthColor = () => {
        if (strength <= 2) return "bg-red-500";
        if (strength <= 4) return "bg-yellow-500";
        return "bg-green-500";
    };

    const Requirement = ({ valid, text }) => (
        <div className="flex items-center gap-2 text-sm">
            {valid ? (
                <CiCircleCheck className="w-d h-4 text-green-500" />
            ) : (
                <MdCancel className="w-d h-4 text-red-500" />
            )}

            <span className={valid ? "text-green-600" : "text-gray-500"}>
                {text}
            </span>
        </div>
    );

    const onSubmit = async (data) => {
        try {



            setLoading(true);
            // api
            const payload = {
                ...data
            }
            const res = await axios.post('/api/auth/sign-up', payload);
            console.log(res)

            toast.success("Verification Code Sent to email");
            localStorage.setItem("email", payload.email);
            router.push('/auth/verify')
        }
        catch (error) {
            console.error("SIGN UP ERROR:", error);

            // Axios server error
            if (error.response) {
                toast.error(
                    error.response.data.message ||
                    "Something went wrong"
                );
            }

            // Network error
            else if (error.request) {
                toast.error(
                    "Network error. Check your internet connection."
                );
            }

            // Unexpected error
            else {
                toast.error(
                    "Unexpected error occurred"
                );
            }
        }
        finally {
            setLoading(false)
        }
    }
    return (


        <div className="flex flex-col md:flex-row items-center justify-center bg-white px-4 relative min-h-screen  ">

            <Image
                src="/sign-up-bg.svg"
                alt="Signup Background"
                className="hidden md:block w-full object-cover opacity-20 flex-1"
                width={400}
                height={400}
            />
            <div className="flex items-center justify-center bg-white px-4 flex-1">
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
                    <h1 className="text-xl font-semibold">Create an Account</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Use your email to create an account
                    </p>

                    {/* Input */}
                    <div className="mt-6 text-left">
                        <label className="text-xs text-black">Email *</label>
                        <input
                            type="email"
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black"
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
                        <div className="border border-black flex items-center  rounded-md mt-1 p-3 outline-none focus-within:ring-2 focus-within:ring-black gap-3">

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
                            <p className="text-red-500 text-sm mt-4">
                                {errors.password.message}
                            </p>
                        )}

                        {/* Strength Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">
                                    Password Strength
                                </span>

                                <span className="text-sm">
                                    {getStrengthText()}
                                </span>
                            </div>

                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                                    style={{
                                        width: `${(strength / 5) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="mt-4 space-y-2">
                            <Requirement
                                valid={hasUppercase}
                                text="At least one uppercase letter"
                            />

                            <Requirement
                                valid={hasLowercase}
                                text="At least one lowercase letter"
                            />

                            <Requirement
                                valid={hasNumber}
                                text="At least one number"
                            />

                            <Requirement
                                valid={hasSpecialCharacter}
                                text="At least one special character"
                            />

                            <Requirement
                                valid={hasMinLength}
                                text="Minimum 8 characters"
                            />
                        </div>


                    </div>








                    <button className={`w-full mt-6 ${loading ? 'bg-gray-500' : 'bg-black'}  text-white py-3 rounded-md font-medium hover:opacity-90 transition`}>
                        {loading ? "Loading..." : "Continue"}
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
            </div >
        </div >

    )

};

