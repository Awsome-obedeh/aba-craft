import { SignupProvider } from "@/app/context/SignupContext";
import SignupGuard from "@/components/auth/SignupGuard";


export default function SignupLayout({
  children,
}) {
  return (
    <SignupProvider>
      <SignupGuard>{children}</SignupGuard>
    </SignupProvider>
  );
}
