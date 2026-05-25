"use client"
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import { LuSquareArrowOutUpRight } from "react-icons/lu";

export default function LoginPage() {

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
            // api
            const payload = {
                ...data
            }
            const res = await axios.post('/api/auth/sign-in', payload);
            console.log(res)


            router.push('/dashboard/vendor/upload-product')
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
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-md text-center">
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
                    Use your email
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
                    <input
                        type="password"
                        className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring-2 focus:ring-black"
                        placeholder="Enter password "
                    />
                </div>

                <Link href="/vendor/sign-up" className="cursor-pointer text-sm text-black text-left py-2 flex gap-2 items-center">Sell on Aba Craft

                    <LuSquareArrowOutUpRight size={20} />
                </Link>

                {/* Button */}
                <button className="w-full mt-6 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition">
                    Continue
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
            </div>
        </div>
    )

};

