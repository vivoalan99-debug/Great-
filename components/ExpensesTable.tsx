import React from 'react';
import { useStore } from '../store/useStore';
import { formatMoney } from '../services/mathUtils';
import { Trash2, Plus } from 'lucide-react';

export const ExpensesTable: React.FC = () => {
  const { expenses, setExpenses, updateExpense, macro } = useStore();

  const handleAmountChange = (id: string, val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10) || 0;
    updateExpense(id, { amount: num });
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-medium">
          <tr>
            <th className="px-4 py-3">Expense Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Monthly (IDR)</th>
            <th className="px-4 py-3 text-right cursor-help" title="Specific increase rate. Uses Global Inflation if higher.">Min Inc. %</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
              <td className="px-4 py-2">
                <input 
                  className="bg-transparent font-medium text-slate-700 w-full focus:outline-none focus:border-b focus:border-blue-500"
                  value={item.name}
                  onChange={(e) => updateExpense(item.id, { name: e.target.value })}
                />
              </td>
              <td className="px-4 py-2">
                <select 
                   className="bg-transparent text-slate-500 text-xs rounded border border-slate-200 p-1"
                   value={item.category}
                   onChange={(e) => updateExpense(item.id, { category: e.target.value as any })}
                >
                  <option value="MANDATORY">MANDATORY</option>
                  <option value="DISCRETIONARY">DISCRETIONARY</option>
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <input 
                  className="bg-transparent text-right w-full focus:outline-none focus:border-b focus:border-blue-500 font-mono text-slate-700"
                  value={item.amount.toLocaleString('id-ID')}
                  onChange={(e) => handleAmountChange(item.id, e.target.value)}
                />
              </td>
              <td className="px-4 py-2 text-right">
                <input 
                  type="number"
                  className={`bg-transparent text-right w-12 focus:outline-none focus:border-b focus:border-blue-500 ${item.annualIncreasePercent < macro.inflationRate ? 'text-slate-400' : 'text-slate-700'}`}
                  value={item.annualIncreasePercent}
                  onChange={(e) => updateExpense(item.id, { annualIncreasePercent: parseFloat(e.target.value) })}
                />
              </td>
              <td className="px-4 py-2 text-center">
                <button 
                    onClick={() => removeExpense(item.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-slate-700">
            <td className="px-4 py-3" colSpan={2}>Total Monthly Expenses</td>
            <td className="px-4 py-3 text-right text-blue-700">{formatMoney(totalMonthly)}</td>
            <td colSpan={2} className="text-xs text-slate-400 font-normal px-4">Global: {macro.inflationRate}%</td>
          </tr>
        </tbody>
      </table>
      <div className="p-2 bg-slate-50 border-t border-slate-200">
          <button 
            onClick={addExpense}
            className="flex items-center gap-2 text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
          >
              <Plus size={14} /> Add Expense
          </button>
      </div>
    </div>
  );
};