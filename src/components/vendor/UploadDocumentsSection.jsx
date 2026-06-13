import React from 'react';
import { FormSection } from '../ui/FormSection';

export const UploadDocumentsSection = () => (
  <FormSection title="Upload Document (optional)" subtitle="Upload any supporting documents that can strengthen your business' credibility. (E.g., awards, licenses, certificates)">
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/50 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer">
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-gray-600 font-medium">Drag & drop images here</span>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-center">
        <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors w-full sm:w-auto">
          <svg className="w-3.5 h-3.5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Upload from device
        </button>
        <button type="button" className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors w-full sm:w-auto">
          <svg className="w-3.5 h-3.5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          Use Camera
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-3">Supported formats: PDF, JPG, PNG (Max 5MB each)</p>
    </div>
  </FormSection>
);