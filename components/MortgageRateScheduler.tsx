import React from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { InterestRateTier } from '../types';

export const MortgageRateScheduler = () => {
  const { mortgage, setMortgage } = useStore();

  const addTier = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    // Find gap or append to end
    const lastTier = mortgage.rates[mortgage.rates.length - 1];
    const newStart = lastTier ? lastTier.endMonth + 1 : 1;
    
    const newTier: InterestRateTier = {
      id: newId,
      startMonth: newStart,
      endMonth: newStart + 11,
      rate: 11.00
    };
    
    setMortgage({
      ...mortgage,
      rates: [...mortgage.rates, newTier]
    });
  };

  const removeTier = (id: string) => {
    setMortgage({
      ...mortgage,
      rates: mortgage.rates.filter(r => r.id !== id)
    });
  };

  const updateTier = (id: string, updates: Partial<InterestRateTier>) => {
    setMortgage({
      ...mortgage,
      rates: mortgage.rates.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Interest Rate Schedule</h4>
        <button 
           onClick={addTier}
           className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded"
        >
          <Plus size={12} /> Add Tier
        </button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2 w-20">Start Mo</th>
              <th className="px-3 py-2 w-6 text-center"></th>
              <th className="px-3 py-2 w-20">End Mo</th>
              <th className="px-3 py-2 text-right">Rate (%)</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mortgage.rates.map((tier) => (
              <tr key={tier.id} className="hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-xs font-mono focus:border-blue-400 focus:outline-none"
                    value={tier.startMonth}
                    onChange={(e) => updateTier(tier.id, { startMonth: parseInt(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-1 py-2 text-center text-slate-400">
                  <ArrowRight size={12} className="mx-auto" />
                </td>
                <td className="px-3 py-2">
                   <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-xs font-mono focus:border-blue-400 focus:outline-none"
                    value={tier.endMonth}
                    onChange={(e) => updateTier(tier.id, { endMonth: parseInt(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2">
                   <div className="flex items-center justify-end relative">
                     <input 
                        type="number" 
                        step="0.01"
                        className="w-16 bg-white border border-slate-200 rounded px-1 py-0.5 text-right text-xs font-bold text-slate-700 focus:border-blue-400 focus:outline-none"
                        value={tier.rate}
                        onChange={(e) => updateTier(tier.id, { rate: parseFloat(e.target.value) || 0 })}
                     />
                     <span className="ml-1 text-slate-400 text-xs">%</span>
                   </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <button 
                    onClick={() => removeTier(tier.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {mortgage.rates.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-slate-400 italic">
                        No rates defined. Simulation will default to 12.00%.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 px-1">
          * Define non-overlapping month ranges. "Month 1" is the start of the loan. Gaps will default to the last known rate or 12%.
      </p>
    </div>
  );
};