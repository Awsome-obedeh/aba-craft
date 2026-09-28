import SignupLayout from "@/components/auth/SignupLayout";
import IdentityVerification from "@/components/auth/IdentityVerification";

export default function IdentityVerificationPage() {
  return (
    <SignupLayout
      currentStep={5}
      contentClassName="min-h-[630px]"
    >
      <IdentityVerification />
    </SignupLayout>
  );
}