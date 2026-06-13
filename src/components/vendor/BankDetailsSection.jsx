import React from 'react';
import { FormSection } from '../ui/FormSection';
import { Input } from '../ui/Input';

export const BankDetailsSection = ({ data, onChange }) => (
  <FormSection title="Bank Details" subtitle="Enter your bank account details for payouts">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Bank Name" id="bankName" value={data.bankName || " "} onChange={onChange} />
      <Input label="Account Number" id="accountNumber" value={data.accountNumber || " "} onChange={onChange} />
      <div className="sm:col-span-2">
        <Input label="Account Name" id="accountName" value={data.accountName || " "} onChange={onChange} />
      </div>
      <Input label="Account Type" id="accountType" value={data.accountType || " "} onChange={onChange} />
      <Input label="BVN" id="bvn" value={data.bvn || " "} onChange={onChange} />
    </div>
  </FormSection>
);