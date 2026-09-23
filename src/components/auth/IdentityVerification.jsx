"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSignup } from "@/app/context/SignupContext";
import { submitSignup, signupError, scanSignupDocument } from "@/app/lib/signup";
import DocumentUploadCard from "./DocumentUploadCard";
import BvnInput from "./BvnInput";
import IdentityNumberInput from "./IdentityNumberInput";
import BusinessInput from "./BusinessInput";
import { validateSellerIdentity } from "@/app/lib/seller-identity";

export default function IdentityVerification() {
  const router = useRouter();

  const { signupData, updateVerification, updateBusiness } = useSignup();
  const { cacDocument, bvn } = signupData.verification;
  const { cacNumber, nin, ninDocument, abssin, verificationConsent } = signupData.verification;
  const scanSequence = useRef({ cac: 0, nin: 0 });
  const [scans, setScans] = useState({ cac: {}, nin: {} });
  const scanFile = async (file, purpose) => {
    const sequence = ++scanSequence.current[purpose];
    setScans((prev) => ({ ...prev, [purpose]: { loading: Boolean(file) } }));
    if (!file) return;
    try {
      const { details } = await scanSignupDocument(signupData, file, purpose);
      if (sequence !== scanSequence.current[purpose]) return;
      updateVerification(purpose === "cac" ? {
        registeredName: details.registeredName,
        cacNumber: details.registrationNumber,
        registrationDate: details.registrationDate,
        registeredBusinessType: details.businessType,
      } : { nin: details.nin, individualName: details.individualName });
      setScans((prev) => ({ ...prev, [purpose]: { success: true } }));
    } catch (error) {
      if (sequence !== scanSequence.current[purpose]) return;
      setScans((prev) => ({ ...prev, [purpose]: { error: signupError(error) } }));
    }
  };
  const setDocument = (file, purpose) => {
    updateVerification(purpose === "cac" ? {
      cacDocument: file, registeredName: "", cacNumber: "", registrationDate: "", registeredBusinessType: "",
    } : { ninDocument: file, nin: "", individualName: "" });
    void scanFile(file, purpose);
  };
  const setCacDocument = (file) => setDocument(file, "cac");
  const setBvn = (bvn) => updateVerification({ bvn });
  const pending = useRef(false);
  const [error, setError] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = {
    ...(submitted ? validateSellerIdentity(signupData.verification) : {}),
    cac:
      submitted && !cacDocument
        ? "Please upload your CAC certificate."
        : "",

    bvn:
      submitted && bvn.length !== 11
        ? "Please enter a valid 11-digit BVN."
        : "",
  };

  const isValid =
    Boolean(cacDocument) &&
    bvn.length === 11 && Object.keys(validateSellerIdentity(signupData.verification)).length === 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);

    if (!isValid || scans.cac.loading || scans.nin.loading) {
      return;
    }

    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    try {
      await submitSignup(signupData);
      router.replace("/auth/sign-up/success");
    } catch (error) {
      setError(signupError(error));
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pb-8 pt-6 sm:px-8">
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-forest">
          Verify your Identity and Business
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Upload the required documents below to help us verify you
          and your business. Documents are sent to our AI scanning provider to extract details; review them before submitting.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6"
      >
        {/* ================================= */}
        {/* DOCUMENT */}
        {/* ================================= */}

        <fieldset disabled={loading}>
        <DocumentUploadCard
          number={1}
          title="Business Registration (CAC Certificate )"
          description="Upload the main page showing your business name and registration number. Ensure there are no cropped edges, heavy reflections, or blurs covering the official seal."
          file={cacDocument}
          onFileChange={setCacDocument}
        >
          <ScanStatus scan={scans.cac} file={cacDocument} onRetry={() => scanFile(cacDocument, "cac")} />
          <div className="mt-3 space-y-3">
            <BusinessInput label="Registered business / company name" value={signupData.verification.registeredName}
              placeholder="Registered name shown on the certificate" onChange={(event) => updateVerification({ registeredName: event.target.value })} />
            <BusinessInput label="CAC Registration Number" placeholder="Enter your CAC number (e.g. RC1234567)" value={cacNumber}
              onChange={(event) => updateVerification({ cacNumber: event.target.value.toUpperCase() })} error={errors.cacNumber} />
            <div className="grid gap-3 sm:grid-cols-2">
              <BusinessInput label="Registration date (if available)" value={signupData.verification.registrationDate}
                placeholder="Date as shown on the certificate" onChange={(event) => updateVerification({ registrationDate: event.target.value })} />
              <BusinessInput label="Registered business type (if available)" value={signupData.verification.registeredBusinessType}
                placeholder="Legal business type on the certificate" onChange={(event) => updateVerification({ registeredBusinessType: event.target.value })} />
            </div>
            {signupData.verification.registeredName && <button type="button" className="text-xs font-medium text-[#80651F] underline"
              onClick={() => updateBusiness({ businessName: signupData.verification.registeredName })}>
              Use this name for my business profile
            </button>}
            <p className="text-xs text-gray-500">Review all details. Scanning does not authenticate your certificate.</p>
          </div>
        </DocumentUploadCard>

        {errors.cac && (
          <p className="mt-1 text-right text-xs text-red-500">
            {errors.cac}
          </p>
        )}

        {/* ================================= */}
        {/* BVN */}
        {/* ================================= */}

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-brandBorder
            bg-white
            px-[22px]
            py-[16px]
          "
        >
          <div className="flex items-start gap-[9px]">
            {/* Number */}
            <span
              className="
                flex
                h-[25px]
                w-[25px]
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-forest
                text-xs
                font-medium
                text-white
              "
            >
              2
            </span>

            <div className="flex-1">
              <h2 className="text-[16px] font-semibold leading-[20px] text-[#333]">
                Bank Verification Number (BVN)
              </h2>

              <p className="mt-[3px] text-xs leading-relaxed text-[#333]">
                Please input your valid 11-digit Bank Verification
                Number. Ensure the digits are correct to avoid
                verification failure.
              </p>

              {/* BVN input */}
              <div className="mt-[15px]">
                <BvnInput
                  value={bvn}
                  onChange={setBvn}
                  error={errors.bvn}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================================= */}
        {/* SAVE */}
        {/* ================================= */}

        <div className="mt-4">
          <DocumentUploadCard number={3} title="National Identification Number (NIN)"
            description="Upload a clear image or PDF of your NIN slip, or enter your 11-digit NIN below."
            file={ninDocument} onFileChange={(file) => setDocument(file, "nin")}>
            <ScanStatus scan={scans.nin} file={ninDocument} onRetry={() => scanFile(ninDocument, "nin")} />
            <div className="mt-3">
              <BusinessInput label="Individual name on NIN document" value={signupData.verification.individualName}
                placeholder="Full name as printed on the NIN slip" onChange={(event) => updateVerification({ individualName: event.target.value })} />
            </div>
            <IdentityNumberInput label="NIN" digits={11} value={nin}
              onChange={(nin) => updateVerification({ nin })} error={errors.nin} />
          </DocumentUploadCard>
        </div>

        <section className="mt-4 rounded-2xl border border-brandBorder bg-white px-[22px] py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full bg-forest text-xs text-white">4</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[#333]">ABSSIN Verification Number</h2>
              <p className="mt-1 text-xs text-[#333]">Enter your 10-digit Abia State Social Identity Number. Check the digits before submitting.</p>
              <IdentityNumberInput label="ABSSIN" digits={10} value={abssin}
                onChange={(abssin) => updateVerification({ abssin })} error={errors.abssin} />
            </div>
          </div>
        </section>

        <label className="mt-4 flex items-start gap-2 text-xs text-[#333]">
          <input type="checkbox" checked={verificationConsent} onChange={(event) => updateVerification({ verificationConsent: event.target.checked })} />
          I consent to checking my registration and identity details with authorized verification providers.
        </label>
        {errors.verificationConsent && <p role="alert" className="mt-1 text-xs text-red-500">{errors.verificationConsent}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading || scans.cac.loading || scans.nin.loading}
            className="
              h-11
              min-w-[210px]
              rounded-lg
              bg-forest
              px-[20px]
              text-xs
              font-medium
              text-white
              transition
              hover:bg-clay-dark
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading
              ? "Submitting..."
              : "Submit registration"}
          </button>
        </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

function ScanStatus({ scan, file, onRetry }) {
  return (
    <div className="mt-3" aria-live="polite" aria-busy={Boolean(scan.loading)}>
      {scan.loading && <p className="text-sm text-muted">Scanning document and extracting details?</p>}
      {scan.success && <p className="text-xs text-[#80651F]">Scan complete. Check the extracted details below; missing fields can be entered manually.</p>}
      {scan.error && <p role="alert" className="text-xs text-red-600">{scan.error}</p>}
      {file && !scan.loading && <button type="button" onClick={onRetry} className="mt-2 text-xs font-medium text-[#80651F] underline">Scan again</button>}
    </div>
  );
}
