import React from 'react';
import { FormSection } from '../ui/FormSection';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SkeletonCard } from '../skeletons/SkeletonCard';

export const PersonalDetailsSection = ({ data, onChange, loading }) => (

  <FormSection title="Personal Details" subtitle="Update your personal and contact information">
   

    {
      !loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" id="fullName"  value={data.fullName} onChange={onChange} />
          <Input label="Email" id="email" type="email"  value={data.email || ''} onChange={onChange} />
          <Input label="Phone" id="phoneNumber" type="tel"  value={data.phoneNumber || ''} onChange={onChange} />
          <Select label="Sex" id="sex"  value={data.sex || ""} options={['Female', 'Male', 'Other']} onChange={onChange} />
          <Select label="Verification Type" id="verificationMethod"  value={data.verificationType || ''} options={['NIN', 'BVN',]} onChange={onChange} />
          <Input label="Verification Number" id="verificationNumber"  value={data.verificationNumber || ""} onChange={onChange} />
        </div>
      ) : (<SkeletonCard/>)
    }

  </FormSection>
);