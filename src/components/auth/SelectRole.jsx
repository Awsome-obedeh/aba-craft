"use client";

import { useSignup } from "@/app/context/SignupContext";
import { useRouter } from "next/navigation";

import RoleCard from "./RoleCard";

const roles = [
  {
    id: "wholesaler_producer",
    title: "Wholesaler/Producer",
    description:
      "I produce or aggregate leather goods and supply in bulk to businesses around the world.",
    features: [
      "Handle bulk orders & quotations",
      "Manage production capacity",
      "Work with workshops and artisans",
      "Ship large quantities",
    ],
  },
  {
    id: "retailer",
    title: "Retailer",
    description:
      "I sell finished leather products directly to customers in Nigeria.",
    features: [
      "Sell ready-made products",
      "Manage store & inventory",
      "Receive individual orders",
      "Ship to customers nationwide",
    ],
  },
];

export default function SelectRole() {
  const router = useRouter();

  const { signupData, updateRole } = useSignup();
  const selectedRole = signupData.role;
  const setSelectedRole = updateRole;
  const handleContinue = () => {
    if (selectedRole) router.push("/auth/sign-up/business");
  };

  return (
    <div className="flex min-h-[420px] px-[8px] pb-[14px] pt-[6px]">
      {/* LEFT SIDE */}
      <div className="flex w-[39%] items-center justify-center border-r border-[#bcbcbc] px-[14px]">
        <div className="">
          <h2 className="text-[16px] font-semibold leading-[16px] text-[#292929] py-3">
            What best describes
            <br />
            your business?
          </h2>

          <p className="mt-[5px] text-[16px] leading-[18px] text-[#333]">
            Choose the option that matches how you
            <br />
            operate on Abacrafts.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex w-[61%] flex-col pl-[8px] pr-[5px] justify-center">
        {/* Heading */}
        <div>
          <h1 className="text-[16px] font-semibold leading-[19px] text-[#171717]">
            Select Role
          </h1>

          <p className="mt-[2px] text-[13px] leading-[11px] text-[#444]">
            Choose the role that best describes your business.
          </p>
        </div>

        {/* Role cards */}
        <div className="mt-[10px] grid grid-cols-2 gap-[14px] items-center">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role.id}
              title={role.title}
              description={role.description}
              features={role.features}
              selected={selectedRole === role.id}
              onSelect={setSelectedRole}
            />
          ))}
        </div>

        {/* Continue */}
        <div className="mt-[13px] flex justify-end">
          <button
            type="button"
            disabled={!selectedRole}
            onClick={handleContinue}
            className="
             
              rounded-[2px]
              bg-[#bf9726]
              px-9
              py-3
              text-[12px]
              font-bold
              text-white
              transition
              hover:bg-[#ad871f]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}