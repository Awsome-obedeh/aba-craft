import React from 'react';

export const Input = ({ label, id, value, onChange, error, ...props }) => (
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
     aria-invalid={Boolean(error)}
     aria-describedby={error ? `${id}-error` : undefined}
     {...props}

    />
    {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
  </div>
);
