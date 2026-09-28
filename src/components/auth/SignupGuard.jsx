"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSignup } from "@/app/context/SignupContext";
import { validateBusinessLocation } from "@/app/lib/business-location";
import { validBusinessTypes } from "@/app/lib/business-types";

const paths = ["/auth/sign-up", "/auth/sign-up/verify", "/auth/sign-up/role", "/auth/sign-up/business", "/auth/sign-up/identity"];

export default function SignupGuard({ children }) {
  const { signupData: data } = useSignup();
  const pathname = usePathname();
  const router = useRouter();
  const step = paths.indexOf(pathname);
  let missing = -1;
  if (!data.account.email || data.account.password.length < 8 ||
      data.account.password !== data.account.confirmPassword || !data.account.acceptedTerms) missing = 0;
  else if (!data.verificationToken) missing = 1;
  else if (!data.role) missing = 2;
  else if (!data.business.businessName.trim() || !validBusinessTypes(data.business.businessType) ||
      !data.business.phoneNumber.trim() || !data.business.email.trim() ||
      Object.keys(validateBusinessLocation(data.business)).length > 0) missing = 3;
  const redirect = step > missing && missing >= 0 ? paths[missing] : null;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);
  return redirect ? <p role="status">Returning to the first incomplete step...</p> : children;
}
