import React from 'react';
import { FormSection } from '../ui/FormSection';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export const BusinessDetailsSection = ({ data, onChange }) => (
  <FormSection title="Business Details" subtitle="Provide your business information">
    <div className="space-y-4">
      <Input label="Business Name" id="businessName" value={data.businessName || ""} onChange={onChange} />
      <Input label="Category" id="category" value={data.category || ""} onChange={onChange} />
      <Select label="Business Type" id="businessType" value={data.businessType || ""} options={['Sole Proprietorship', 'Partnership', 'LLC']} onChange={onChange} />
      
      <div className="w-full">
        <label htmlFor="businessDescription" className="block text-xs font-medium text-gray-700 mb-1.5">
          Business Description
        </label>
        <div className="relative">
          <textarea
            id="businessDescription"
            name="businessDescription"
            rows={4}
            placeholder="Business Description"
            value={data.businessDescription || ""}
            onChange={onChange}
            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder-gray-400 transition-all resize-none"
          />
          {/* <span className="absolute bottom-3 right-3 text-[10px] text-gray-400 tracking-wider">
            0/100 words
          </span> */}
        </div>
      </div>
    </div>
  </FormSection>
);