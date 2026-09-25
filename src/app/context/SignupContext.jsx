"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
} from "react";

const SignupContext = createContext(null);

const initialSignupData = {
  account: {
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  },

  verificationToken: "",
  role: "",

  business: {
    businessName: "",
    businessType: [],
    businessDescription: "",
    state: "Abia",
    lga: "",
    city: "",
    address: "",
    landmark: "",
    countryCode: "+234",
    phoneNumber: "",
    email: "",
  },

  verification: {
    bvn: "",
    cacDocument: null,
    cacNumber: "",
    registeredName: "",
    registrationDate: "",
    registeredBusinessType: "",
    individualName: "",
    nin: "",
    ninDocument: null,
    abssin: "",
    verificationConsent: false,
  },
};

export function SignupProvider({ children }) {
  const [signupData, setSignupData] =
    useState(initialSignupData);

  const updateAccount = (data) => {
    setSignupData((prev) => ({
      ...prev,
      verificationToken: data.email !== undefined && data.email !== prev.account.email ? "" : prev.verificationToken,
      account: {
        ...prev.account,
        ...data,
      },
    }));
  };

  const updateRole = (role) => {
    setSignupData((prev) => ({
      ...prev,
      role,
    }));
  };

  const updateBusiness = (data) => {
    setSignupData((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        ...data,
      },
    }));
  };

  const updateVerification = (data) => {
    setSignupData((prev) => ({
      ...prev,
      verification: {
        ...prev.verification,
        ...data,
      },
    }));
  };

  const resetSignup = useCallback(() => {
    setSignupData(initialSignupData);
  }, []);

  return (
    <SignupContext.Provider
      value={{
        signupData,
        updateAccount,
        setVerificationToken: (verificationToken) => setSignupData((prev) => ({ ...prev, verificationToken })),
        updateRole,
        updateBusiness,
        updateVerification,
        resetSignup,
      }}
    >
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const context = useContext(SignupContext);

  if (!context) {
    throw new Error(
      "useSignup must be used inside SignupProvider"
    );
  }

  return context;
}
