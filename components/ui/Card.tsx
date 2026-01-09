import React from 'react';
import { LucideIcon } from 'lucide-react';

export const Card = ({ children, className = '', title }: { children?: React.ReactNode; className?: string; title?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
    {title && <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>}
    {children}
  </div>
);

export const SummaryCard = ({ 
    label, 
    value, 
    subtext, 
    color = 'blue',
    icon: Icon,
    className = ''
}: { 
    label: string; 
    value: string; 
    subtext?: string; 
    color?: 'blue'|'green'|'red'|'amber';
    icon?: LucideIcon;
    className?: string;
}) => {
    const styles = {
        blue: { text: 'text-blue-600', bg: 'bg-blue-50', icon: 'text-blue-500' },
        green: { text: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'text-emerald-500' },
        red: { text: 'text-rose-600', bg: 'bg-rose-50', icon: 'text-rose-500' },
        amber: { text: 'text-amber-600', bg: 'bg-amber-50', icon: 'text-amber-500' }
    };

    const style = styles[color];

    return (
        <div className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col transition-all hover:shadow-md ${className}`}>
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
                    <div className={`text-2xl font-bold mt-1 ${style.text}`}>{value}</div>
                </div>
                {Icon && (
                    <div className={`p-2.5 rounded-xl ${style.bg} ${style.icon}`}>
                        <Icon size={20} strokeWidth={2.5} />
                    </div>
                )}
            </div>
            {subtext && <span className="text-slate-400 text-xs mt-2 font-medium">{subtext}</span>}
        </div>
    );
};