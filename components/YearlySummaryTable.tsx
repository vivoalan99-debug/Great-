import React from 'react';
import { useStore } from '../store/useStore';
import { formatMoney } from '../shared/utils/mathUtils';
import { Card } from './ui/Card';

export const YearlySummaryTable = () => {
  const { simulationResult } = useStore();

  if (!simulationResult) return null;
  const { yearLogs } = simulationResult;

  return (
    <Card title="Yearly Summary & Extra Payments">
        <div className="overflow-auto max-h-[500px] -mx-5 sm:mx-0">
            <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-3 pl-5 font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Year</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Extra Paid</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Penalty</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Principal Red.</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Inst. Before</th>
                        <th className="p-3 text-right font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Inst. After</th>
                        <th className="p-3 pr-5 text-right font-semibold text-emerald-600 uppercase tracking-wider border-b border-slate-200">Int. Saved</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {yearLogs.map((log) => (
                        <tr key={log.year} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-3 pl-5 font-medium text-slate-700">{2026 + log.year}</td>
                            <td className="p-3 text-right text-blue-600 font-medium group-hover:text-blue-700">
                                {formatMoney(log.extraPaymentPaid)}
                            </td>
                            <td className="p-3 text-right text-rose-500">
                                {log.penaltyPaid > 0 ? formatMoney(log.penaltyPaid) : '-'}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">
                                {formatMoney(log.principalReduced)}
                            </td>
                            <td className="p-3 text-right text-slate-400 decoration-slate-300">
                                {formatMoney(log.installmentBefore)}
                            </td>
                            <td className="p-3 text-right text-slate-700 font-medium">
                                {formatMoney(log.installmentAfter)}
                            </td>
                            <td className="p-3 pr-5 text-right text-emerald-600 font-bold bg-emerald-50/30 group-hover:bg-emerald-100/30 transition-colors">
                                {formatMoney(log.interestSaved)}
                            </td>
                        </tr>
                    ))}
                    {yearLogs.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 italic bg-slate-50/30">
                                No extra payment events recorded yet. 
                                <br/>
                                <span className="text-xs opacity-70">Adjust settings or increase income to trigger extra payments.</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
  );
};