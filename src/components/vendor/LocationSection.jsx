import React from 'react';
import { FormSection } from '../ui/FormSection';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export const LocationSection = ({ data, onChange }) => (
  <FormSection title="Set Location" subtitle="Set the location for your business">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Select label="Country" id="country" value={data.country} options={['Nigeria', 'Ghana', 'Kenya'] || " "} onChange={onChange} />
      <Select label="State" id="state" value={data.state} options={['Abia State', 'Lagos State', 'Rivers State'] || " "} onChange={onChange} />
      <Select label="LGA" id="lga" value={data.lga} options={['Aba North', 'Aba South', 'Umuahia North'] || " "} onChange={onChange} />
    </div>
    <Input label="Business Address" id="address" value={data.address || " "} onChange={onChange} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Postal Code (Optional)" id="postalCode" value={data.postalCode || " "} onChange={onChange} />
      <Input label="Business Landmark" id="landmark" value={data.landmark || " "} onChange={onChange} />
    </div>
  </FormSection>
);