import React from 'react';
import { FormSection } from '../ui/FormSection';

export const ProfileSection = () => (
  <FormSection title="Profile Picture" subtitle="This image will be displayed on your vendor profile">
    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pt-2">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop" 
          alt="Profile Avatar" 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-white p-1 rounded-full shadow-md border border-gray-200">
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
      </div>
      <div className="space-y-2 w-full sm:w-auto text-center sm:text-left">
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Change Photo
          </button>
          <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-xs font-medium text-red-600 bg-white hover:bg-red-50/50 transition-colors">
            <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Photo
          </button>
        </div>
        <p className="text-[10px] text-gray-400">JPG, PNG (Max 2 MB)</p>
      </div>
    </div>
  </FormSection>
);