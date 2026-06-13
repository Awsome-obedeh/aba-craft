import React from 'react';

export const Select = ({ label, id, options = [], ...props }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        name={id}
        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
        {...props}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={typeof opt === 'object' ? opt.value : opt}>
            {typeof opt === 'object' ? opt.label : opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);