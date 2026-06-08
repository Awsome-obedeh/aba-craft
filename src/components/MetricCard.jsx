import React from 'react';

export const MetricCard = ({ title, value, subtext, trend, isTrendPositive, icon, trendColor }) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-500 tracking-tight flex items-center gap-2">
            {icon} {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">{subtext}</p>
        {trend && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${isTrendPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isTrendPositive ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
    </div>
  );
};