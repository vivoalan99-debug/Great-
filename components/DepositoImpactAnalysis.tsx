import React from 'react';
import { useStore } from '../store/useStore';
import { formatMoney } from '../shared/utils/mathUtils';
import { Card } from './ui/Card';
import { TrendingUp, Wallet, Landmark, CheckCircle2 } from 'lucide-react';

export const DepositoImpactAnalysis = () => {
    const { simulationResult } = useStore();

    if (!simulationResult) return null;
    const { impactAnalysis } = simulationResult;
    const { cashStrategy, depositoStrategy, netBenefit, monthsSaved, isPayoffAchievedFaster } = impactAnalysis;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Not Paid";
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const StatRow = ({ label, valCash, valDepo, type = 'neutral', isDate = false }: any) => {
        const isBetter = type === 'inverse' ? valDepo < valCash : valDepo > valCash;
        const isEqual = valDepo === valCash;
        
        // Handle Date comparison
        if (isDate) {
            return (
                <div className="flex flex-col md:grid md:grid-cols-12 md:gap-4 py-4 border-b border-slate-50 last:border-0 text-sm">
                    <div className="md:col-span-4 text-slate-500 font-medium mb-2 md:mb-0 flex items-center">{label}</div>
                    <div className="md:col-span-4 flex md:block justify-between items-center md:text-right">
                         <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Wallet size={10} /> Cash</span>
                         <div className="font-mono text-slate-600 whitespace-nowrap text-base">{formatDate(valCash as string)}</div>
                    </div>
                    <div className="md:col-span-4 flex md:flex-col justify-between items-center md:items-end mt-1 md:mt-0">
                         <span className="md:hidden text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"><Landmark size={10} /> Deposito</span>
                         <div className="flex flex-col items-end">
                            <div className={`font-mono font-bold whitespace-nowrap text-base ${isEqual ? 'text-slate-600' : isBetter ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {formatDate(valDepo as string)}
                            </div>
                            {isPayoffAchievedFaster && (
                                <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                    {monthsSaved > 0 ? `${monthsSaved} Mo Faster` : 'Payoff Achieved'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Handle Number comparison
        const vCash = valCash as number;
        const vDepo = valDepo as number;
        let diffVal = type === 'inverse' ? vCash - vDepo : vDepo - vCash;

        return (
            <div className="flex flex-col md:grid md:grid-cols-12 md:gap-4 py-4 border-b border-slate-50 last:border-0 text-sm">
                <div className="md:col-span-4 text-slate-500 font-medium mb-2 md:mb-0 flex items-center">{label}</div>
                <div className="md:col-span-4 flex md:block justify-between items-center md:text-right">
                     <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Wallet size={10} /> Cash</span>
                     <div className="font-mono text-slate-600 whitespace-nowrap text-base">{formatMoney(vCash)}</div>
                </div>
                <div className="md:col-span-4 flex md:flex-col justify-between items-center md:items-end mt-1 md:mt-0">
                     <span className="md:hidden text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"><Landmark size={10} /> Deposito</span>
                     <div className="flex flex-col items-end">
                        <div className={`font-mono font-bold whitespace-nowrap text-base ${isEqual ? 'text-slate-600' : isBetter ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {formatMoney(vDepo)}
                        </div>
                        {!isEqual && (
                            <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                +{formatMoney(diffVal)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card title="Strategy Comparison: Impact of Deposito (6%)">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
                <div className="lg:col-span-2">
                    <div className="hidden md:grid grid-cols-12 gap-4 pb-3 border-b border-slate-200">
                         <div className="col-span-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Metric</div>
                         <div className="col-span-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                             <Wallet size={12} /> Cash Only
                         </div>
                         <div className="col-span-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                             <Landmark size={12} className="text-blue-500" /> With Deposito
                         </div>
                    </div>
                    
                    <div className="space-y-1">
                        <StatRow label="Accumulated Interest Earned" valCash={cashStrategy.totalAssetInterest} valDepo={depositoStrategy.totalAssetInterest} />
                        <StatRow label="Mortgage Interest Paid" valCash={cashStrategy.totalMortgageInterestPaid} valDepo={depositoStrategy.totalMortgageInterestPaid} type="inverse" />
                        <StatRow label="Projected Payoff Date" valCash={cashStrategy.payoffDateStr} valDepo={depositoStrategy.payoffDateStr} isDate={true} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 flex flex-col justify-center items-center text-center shadow-sm">
                    <div className="mb-3 p-3 bg-emerald-100 rounded-full text-emerald-600 ring-4 ring-emerald-50">
                        <TrendingUp size={28} />
                    </div>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-2">Total Net Benefit</p>
                    <p className="text-3xl font-bold text-emerald-700 mb-3 tracking-tight">{formatMoney(netBenefit)}</p>
                    <p className="text-xs text-emerald-700/80 leading-relaxed px-2">
                        By using the high-yield strategy, you generate additional wealth of <strong>{formatMoney(netBenefit)}</strong> over the simulation period.
                    </p>
                    {isPayoffAchievedFaster && (
                        <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-white/60 rounded-full text-emerald-800 text-xs font-bold border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            {monthsSaved > 0 ? `Mortgage Free ${monthsSaved} Months Sooner` : "Payoff Achieved"}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-xs text-slate-500 leading-relaxed">
                <strong>How it works:</strong> "With Deposito" assumes any funds allocated to the 'Extra Payment Bucket' (surplus cash) are placed in a liquid high-yield account (6% p.a.) until they are used for the annual Extra Payment event or Smart Payoff. The "Net Benefit" includes both interest earned and interest saved.
            </div>
        </Card>
    );
};
