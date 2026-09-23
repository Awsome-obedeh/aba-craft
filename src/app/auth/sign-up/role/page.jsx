import SelectRole from "@/components/auth/SelectRole";
import SignupLayout from "@/components/auth/SignupLayout";


export default function SelectRolePage() {
  return (
    <SignupLayout currentStep={3}>
      <SelectRole />
    </SignupLayout>
  );
}