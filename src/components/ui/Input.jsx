import React from 'react';

export const Input = ({ label, id, value, onChange }) => (
  <div className="w-full">
    <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    <input
      id={id}
      name={id}
      className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder-gray-400 transition-all"
     value={value}
     onChange={onChange}
     disabled={false}

    />
  </div>
);