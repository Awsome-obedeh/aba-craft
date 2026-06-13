import React from 'react';

export const FormSection = ({ title, subtitle, children }) => (
  <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);