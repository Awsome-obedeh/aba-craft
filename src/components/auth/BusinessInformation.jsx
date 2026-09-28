"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useSignup } from "@/app/context/SignupContext";
import BusinessInput from "./BusinessInput";
import BusinessSelect from "./BusinessSelect";
import BusinessTextarea from "./BusinessTextarea";
import PhoneInput from "./PhoneInput";
import { nigeriaStates, validateBusinessLocation } from "@/app/lib/business-location";
import { validBusinessTypes } from "@/app/lib/business-types";

const stateOptions = nigeriaStates.map((state) => ({ value: state, label: state }));

const businessTypes = [
  {
    value: "leather_manufacturer",
    label: "Leather Manufacturer",
  },
  {
    value: "leather_supplier",
    label: "Leather Supplier",
  },
  {
    value: "leather_artisan",
    label: "Leather Artisan",
  },
  {
    value: "leather_retailer",
    label: "Leather Retailer",
  },
  {
    value: "leather_wholesaler",
    label: "Leather Wholesaler",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function BusinessInformation() {
  const router = useRouter();

  const { signupData, updateBusiness } = useSignup();
  const form = signupData.business;
  const [submitted, setSubmitted] = useState(false);
  const updateField = (field, value) => updateBusiness({ [field]: value });

  const validateForm = () => {
    const errors = validateBusinessLocation(form);

    if (!form.businessName.trim()) {
      errors.businessName =
        "Business name is required.";
    }

    if (!validBusinessTypes(form.businessType)) {
      errors.businessType =
        "Please select at least one business type.";
    }

    if (!/^[\d\s-]{7,20}$/.test(form.phoneNumber.trim())) {
      errors.phoneNumber =
        "Please enter a valid phone number.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email =
        "Please enter a valid email address.";
    }

    return errors;
  };

  const errors = submitted
    ? validateForm()
    : {};

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    router.push("/auth/sign-up/identity");
  };

  return (
    <div className="px-[17px] pb-[12px] pt-[7px]">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-semibold leading-[21px] text-[#111]">
          Business Information
        </h1>

        <p className="mt-[2px] text-xs leading-relaxed text-[#444]">
          Tell us about your business so we can verify and set up your
          <br />
          account.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-[17px]"
      >
        {/* ===================================== */}
        {/* BUSINESS DETAILS */}
        {/* ===================================== */}

        <section>
          <h2 className="mb-[11px] text-xs font-semibold text-[#222]">
            1. Business Details
          </h2>

          {/* Name + Type */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <BusinessInput
              label="Business Name"
              placeholder="Enter your business name"
              value={form.businessName}
              onChange={(event) =>
                updateField(
                  "businessName",
                  event.target.value
                )
              }
              error={errors.businessName}
            />

            <BusinessSelect
              label="Business Types"
              multiple
              value={form.businessType}
              onChange={(selectedTypes) =>
                updateField(
                  "businessType",
                  selectedTypes
                )
              }
              options={businessTypes}
              error={errors.businessType}
            />
          </div>

          {/* Description */}
          <div className="mt-[10px]">
            <BusinessTextarea
              label="Business Description (Optional)"
              placeholder="Describe your business, products or services"
              value={form.businessDescription}
              onChange={(event) =>
                updateField(
                  "businessDescription",
                  event.target.value
                )
              }
              maxWords={300}
            />
          </div>
        </section>

        {/* ===================================== */}
        {/* CONTACT INFORMATION */}
        {/* ===================================== */}

        <section className="mt-[15px]">
          <h2 className="mb-[11px] text-xs font-semibold text-[#222]">
            2. Contact Information of Business
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Phone */}
            <PhoneInput
              label="Phone Number"
              countryCode={form.countryCode}
              onCountryCodeChange={(event) =>
                updateField(
                  "countryCode",
                  event.target.value
                )
              }
              phone={form.phoneNumber}
              onPhoneChange={(event) =>
                updateField(
                  "phoneNumber",
                  event.target.value.replace(
                    /[^\d\s-]/g,
                    ""
                  )
                )
              }
              error={errors.phoneNumber}
            />

            {/* Email */}
            <BusinessInput
              label="Email Address"
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value
                )
              }
              error={errors.email}
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 text-[12px] font-semibold text-[#222]">
            3. Location/ Workshop Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BusinessSelect
              label="State"
              placeholder="Select state"
              value={form.state}
              options={stateOptions}
              onChange={(event) => updateBusiness({ state: event.target.value, lga: "", city: "" })}
              error={errors.state}
              disable
           
            />
            <BusinessInput
              label="LGA"
              placeholder="Enter LGA"
              value={form.lga}
              onChange={(event) => updateField("lga", event.target.value)}
              error={errors.lga}
            />
            <BusinessInput
              label="City/Town"
              placeholder="Enter city/town"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              error={errors.city}
            />
          </div>
          <div className="mt-4">
            <BusinessTextarea
              label="Business/Workshop Address"
              placeholder="Enter your full business/workshop address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              maxWords={300}
              error={errors.address}
            />
          </div>
          <div className="mt-4">
            <BusinessInput
              label="Nearest Landmark (Optional)"
              placeholder="Enter nearest landmark"
              value={form.landmark}
              onChange={(event) => updateField("landmark", event.target.value)}
              error={errors.landmark}
            />
          </div>
        </section>

        {/* Continue */}
        <div className="mt-[16px] flex justify-end">
          <button
            type="submit"
            className="
              h-[24px]
              min-w-[118px]
              rounded-[2px]
              bg-[#bf9726]
              px-[14px]
              text-xs
              font-medium
              text-white
              transition
              hover:bg-[#ad871f]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );
}
