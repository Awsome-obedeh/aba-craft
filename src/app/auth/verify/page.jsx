"use client";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import axios from "axios";
import { useEffect, useState } from "react";
import { CiCircleCheck } from "react-icons/ci";
import { MdCancel } from "react-icons/md";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
export default function SignUpPage() {

    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    
    const [email, setEmail] = useState('')
 
const router=useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset

    } = useForm();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const userEmail =
                localStorage.getItem("email");

            if (userEmail) {
                 
                setTimeout(() => setEmail(userEmail), 0);
            }
        }

    }, [])

    // console.log("USER EMAIL", email)

    const onSubmit = async (data) => {
        try {


            setIsVerifying(true);
                // api
            const payload = {
                ...data,
                email
            }
            const res = await axios.post('/api/auth/verify', payload);


            toast.success("Email Verified Successfully");

            // localStorage.removeItem("email");
            reset();

            router.push("sign-in");

        }
        catch (error) {

            if (error.response) {
                toast.error(error.response.data.message ||
                    "Something went wrong")
            }

            else if (error.request) {
                // No response from server — pure network/connectivity error.
                // Do NOT touch error.response here; it is undefined.
                toast.error("Network Error, check internet connection")
            }

            else {
                toast.error("Server error")
            }
        }
        finally {
            setIsVerifying(false)
        }
    }


    const handleResendCode = async () => {
        try {
            
            setIsResending(true)
            const res = await axios.post('/api/auth/resend', {email});
            if (res.data) {
                setIsResending(false)
                toast.success(res.data.message)
            }
        }

        catch (error) {

            if (error.response) {
                toast.error(error.response.data.message ||
                    "Something went wrong")
            }

            else if (error.request) {
                // No response from server — pure network/connectivity error.
                // Do NOT touch error.response here; it is undefined.
                toast.error("Network Error, check internet connection")
            }

            else {
                toast.error("Server error")
            }
        }
        finally {
            setIsResending(false)
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
            <div className="flex flex-col items-center justify-center bg-white px-4 flex-1">
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
                    <h1 className="text-xl font-semibold">Verify Registeration Code</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Check email address for code
                    </p>

                    {/* Input */}
                    <div className="mt-6 text-left">
                        <label className="text-xs text-black">Email *</label>
                        <input
                            type="email"
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black"
                            placeholder="Enter email "
                            value={email || " "}
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
                        <label className="text-xs text-black">Invitation Code *</label>
                        <input
                            type="text"
                            className="w-full mt-1 border border-black rounded-md p-3 outline-none focus:ring focus:ring-black"
                            placeholder="Enter invitation code "
                            {...register("invitationCode", {
                                required: "Invitation code is required",
                            })}
                        />
                        {
                            errors.invitationCode && (
                                <p className="text-xs text-red-500 mt-1">{errors.invitationCode.message}</p>
                            )
                        }
                    </div>






                    <button className="w-full mt-6 bg-black text-white py-3 rounded-md font-medium hover:opacity-90 transition">
                        {isVerifying ? "Verifying..." : "Verify"}
                    </button>





                    {/* Divider */}

                </form>
                    <button onClick={handleResendCode} className=" mt-6 text-sm  text-black text-right cursor-pointer rounded-md  hover:opacity-90 transition">
                         { isResending ? "Sending..." : "Resend Code" }
                    </button>
            </div >
        </div >

    )

};

