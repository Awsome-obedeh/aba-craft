import SignupLayout from "@/components/auth/SignupLayout";
import BusinessInformation from "@/components/auth/BusinessInformation";

export default function BusinessInformationPage() {
  return (
    <SignupLayout currentStep={4}>
      <BusinessInformation />
    </SignupLayout>
  );
}