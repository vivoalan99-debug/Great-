import React from 'react';

export const Card = ({ children, className = '', title }: { children?: React.ReactNode; className?: string; title?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
    {title && <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>}
    {children}
  </div>
);

export const SummaryCard = ({ label, value, subtext, color = 'blue' }: { label: string; value: string; subtext?: string; color?: 'blue'|'green'|'red'|'amber' }) => {
    const colorClasses = {
        blue: 'text-blue-600',
        green: 'text-emerald-600',
        red: 'text-rose-600',
        amber: 'text-amber-600'
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
            <span className="text-slate-500 text-xs font-medium uppercase">{label}</span>
            <span className={`text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</span>
            {subtext && <span className="text-slate-400 text-xs mt-1">{subtext}</span>}
        </div>
    );
};