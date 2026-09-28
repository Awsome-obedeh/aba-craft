"use client";    
import SignupLayout from "@/components/auth/SignupLayout";
import VerifyAccount from "@/components/auth/VerifyAccount";

export default function VerifyPage() {
  return (
    <SignupLayout
      currentStep={2}
      onBack={() => {
        // This can be replaced with router.back()
      }}
    >
      <VerifyAccount />
    </SignupLayout>
  );
}