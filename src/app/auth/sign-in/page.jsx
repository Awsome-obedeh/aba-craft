"use client"


import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, CircleHelp, LockKeyhole, Mail } from "lucide-react";
import { toast } from "react-toastify";
import { FaRegEyeSlash } from "react-icons/fa6";
import { IoEyeSharp } from "react-icons/io5";
import { useAuthStore } from "@/app/store/authStore";
import { api } from "@/app/lib/axios";


export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors }

    } = useForm();

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const res = await api.post('/auth/sign-in', { ...data }, { baseURL: '/api', skipAuthRefresh: true });

            // Extract token and user data from backend response
            const { accessToken, user } = res.data;


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
                next = "/dashboard/vendor";
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
        <main className="relative flex min-h-svh items-center justify-center bg-[#282522] px-4 py-10 sm:px-8">
            <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/singup-bg.jpg')" }} />
            <div aria-hidden="true" className="absolute inset-0 bg-black/70" />
            <section aria-labelledby="login-title" className="relative w-full max-w-[920px] rounded-xl bg-[#f5f5f5] px-6 pb-10 pt-5 shadow-2xl sm:px-8 sm:pb-14">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <Link href="/" className="inline-flex min-h-9 items-center gap-2 rounded border border-neutral-300 bg-white px-3 text-xs text-neutral-700 hover:bg-neutral-100">
                        <ArrowLeft size={14} aria-hidden="true" /> Back
                    </Link>
                    <button type="button" aria-expanded={showHelp} aria-controls="login-help" onClick={() => setShowHelp(!showHelp)} className="inline-flex min-h-9 items-center gap-2 text-xs text-neutral-800 hover:underline">
                        <CircleHelp size={14} aria-hidden="true" /> Need help?
                    </button>
                </div>
                {showHelp && (
                    <div id="login-help" className="mb-5 rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                        Sign in with the email and password you used to create your account. Forgotten your password? <Link href="/auth/forgot-password" className="text-neutral-900 underline">Reset your password</Link>. If your account is not yet verified, check your inbox for a verification email.
                    </div>
                )}
                <h1 id="login-title" className="text-3xl font-semibold tracking-tight text-black">Welcome back</h1>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-neutral-600">
                    Log in to your account to start selling your leather goods<br className="hidden sm:block" /> on Aba Crafts
                </p>
                <form className="mt-6" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={loading}>
                    <div>
                        <label htmlFor="email" className="text-sm text-neutral-600">Email Address</label>
                        <div className="mt-1.5 flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 focus-within:border-[#b39126] focus-within:ring-2 focus-within:ring-[#b39126]/20">
                            <Mail size={15} className="shrink-0 text-neutral-500" aria-hidden="true" />
                            <input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined}
                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-neutral-900 outline-none focus-visible:outline-none" placeholder="Enter your email address"
                                {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" } })}
                            />
                        </div>
                        {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>
                    <div className="mt-6">
                        <label htmlFor="password" className="text-sm text-neutral-600">Password</label>
                        <div className="mt-1.5 flex items-center gap-3 rounded-md border border-neutral-200 bg-white pl-3 pr-1 focus-within:border-[#b39126] focus-within:ring-2 focus-within:ring-[#b39126]/20">
                            <LockKeyhole size={15} className="shrink-0 text-neutral-500" aria-hidden="true" />
                            <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined}
                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-neutral-900 outline-none focus-visible:outline-none" placeholder="Enter your password"
                                {...register("password", { required: "Password is required", minLength: { value: 8, message: "Password must be at least 8 characters long" } })}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="flex size-11 shrink-0 items-center justify-center rounded text-neutral-500 hover:text-neutral-900">
                                {showPassword ? <IoEyeSharp size={17} aria-hidden="true" /> : <FaRegEyeSlash size={17} aria-hidden="true" />}
                            </button>
                        </div>
                        {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                    </div>
                    <div className="mt-2 text-right">
                        <Link href="/auth/forgot-password" className="inline-block py-1 text-xs text-neutral-700 hover:underline">Forgot password?</Link>
                    </div>
                    <div className="mt-7 flex flex-col items-center sm:ml-auto sm:w-64">
                        <button type="submit" disabled={loading} className="min-h-10 w-full rounded bg-[#b39126] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#9b7c1d] disabled:cursor-wait disabled:opacity-60">
                            {loading ? "Logging in..." : "Login"}
                        </button>
                        <p className="mt-2 text-center text-xs text-neutral-900">
                            Don&apos;t have an account? <Link href="/auth/sign-up" className="underline underline-offset-2">Sign up</Link>
                        </p>
                        <Link href="/auth/customer-signup" className="mt-2 text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-900">Create a buyer account</Link>
                    </div>
                </form>
            </section>
        </main>
    );
}
