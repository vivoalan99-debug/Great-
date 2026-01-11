import React from 'react';
import { useStore } from '../store/useStore';
import { formatMoney } from '../shared/utils/mathUtils';
import { Trash2, Plus, ArrowUpRight } from 'lucide-react';
import { DebouncedInput } from './ui/DebouncedInput';

export const ExpensesTable: React.FC = () => {
  const { expenses, setExpenses, updateExpense, macro } = useStore();

  // Helper for currency formatted inputs (visual only, passes number back)
  const CurrencyInput = ({ value, onChange, className }: { value: number, onChange: (val: number) => void, className: string }) => {
     // Local formatting logic handled inside DebouncedInput via type='text' if we wanted masking,
     // but for simplicity we keep it raw number or standard input here.
     // To keep it simple and robust:
     return (
         <DebouncedInput 
            type="text" // Use text to allow formatting if needed later, but sending number back
            formatType="number"
            className={className}
            value={value}
            onChange={(val) => onChange(val as number)}
         />
     );
  };

  const addExpense = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setExpenses([...expenses, { 
        id: newId, 
        name: 'New Expense', 
        category: 'DISCRETIONARY', 
        amount: 1000000, 
        annualIncreasePercent: macro.inflationRate 
    }]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const totalMonthly = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="w-full -mx-2 sm:mx-0">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-slate-500 font-medium border-b border-slate-100">
          <tr>
            <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider">Expense</th>
            <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider w-24 hidden sm:table-cell">Type</th>
            <th className="px-2 py-3 text-right font-semibold text-xs uppercase tracking-wider w-32">Monthly</th>
            <th className="px-2 py-3 text-right font-semibold text-xs uppercase tracking-wider w-20" title="Annual Increase %">
                <span className="border-b border-dotted border-slate-400 cursor-help">Inc %</span>
            </th>
            <th className="px-2 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {expenses.map((item) => {
            const isOverridden = item.annualIncreasePercent > macro.inflationRate;
            
            return (
            <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
              <td className="px-2 py-2">
                <DebouncedInput
                  type="text"
                  className="bg-transparent font-medium text-slate-700 w-full focus:outline-none focus:text-blue-600 placeholder:text-slate-300"
                  value={item.name}
                  placeholder="Expense Name"
                  onChange={(val) => updateExpense(item.id, { name: val as string })}
                />
              </td>
              <td className="px-2 py-2 hidden sm:table-cell">
                <select 
                   className={`bg-transparent text-[10px] uppercase font-bold tracking-wider rounded border border-transparent hover:border-slate-200 p-1 cursor-pointer focus:outline-none focus:border-blue-300 ${item.category === 'MANDATORY' ? 'text-rose-600 bg-rose-50/50' : 'text-emerald-600 bg-emerald-50/50'}`}
                   value={item.category}
                   onChange={(e) => updateExpense(item.id, { category: e.target.value as any })}
                >
                  <option value="MANDATORY">Mandatory</option>
                  <option value="DISCRETIONARY">Flexible</option>
                </select>
              </td>
              <td className="px-2 py-2 text-right">
                <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">Rp</span>
                    <CurrencyInput 
                        className="bg-transparent text-right w-full focus:outline-none focus:text-blue-600 font-mono text-slate-700 font-medium"
                        value={item.amount}
                        onChange={(val) => updateExpense(item.id, { amount: val })}
                    />
                </div>
              </td>
              <td className="px-2 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    {isOverridden && <ArrowUpRight size={10} className="text-amber-500" />}
                    <DebouncedInput
                        type="number"
                        formatType="number"
                        className={`bg-transparent text-right w-10 focus:outline-none focus:border-b focus:border-blue-500 font-mono text-xs ${isOverridden ? 'text-amber-600 font-bold' : 'text-slate-400'}`}
                        value={item.annualIncreasePercent}
                        onChange={(val) => updateExpense(item.id, { annualIncreasePercent: val as number })}
                    />
                </div>
              </td>
              <td className="px-2 py-2 text-center">
                <button 
                    onClick={() => removeExpense(item.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </button>
              </td>
            </tr>
          )})}
          <tr className="bg-slate-50/50 font-semibold text-slate-700 border-t border-slate-200">
            <td className="px-2 py-3 text-xs uppercase text-slate-500" colSpan={2}>Total</td>
            <td className="px-2 py-3 text-right text-blue-700 font-bold">{formatMoney(totalMonthly)}</td>
            <td className="px-2 py-3 text-right text-xs text-slate-400">
                Avg {((expenses.reduce((acc, curr) => acc + curr.annualIncreasePercent, 0) / expenses.length) || 0).toFixed(1)}%
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 flex justify-center">
          <button 
            onClick={addExpense}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors border border-dashed border-blue-200 hover:border-blue-300"
          >
              <Plus size={14} /> Add New Expense
          </button>
      </div>
    </div>
  );
};