import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { runSimulation } from '../services/engine';
import { formatMoney } from '../services/mathUtils';
import { Card } from './ui/Card';
import { TrendingUp, Wallet, Landmark, CheckCircle2 } from 'lucide-react';

export const DepositoImpactAnalysis = () => {
    const { expenses, income, mortgage, macro, scenario } = useStore();

    const comparison = useMemo(() => {
        // 1. Scenario Without Deposito (Idle Cash)
        const simCash = runSimulation(
            expenses, income, 
            { ...mortgage, useDeposito: false }, 
            macro, scenario
        );

        // 2. Scenario With Deposito (High Yield)
        const simDeposito = runSimulation(
            expenses, income, 
            { ...mortgage, useDeposito: true }, 
            macro, scenario
        );

        const getStats = (sim: any) => {
            const lastLog = sim.logs[sim.logs.length - 1];
            const payoffDateStr = sim.summary.mortgagePayoffDate;
            let payoffDisplay = "Not Paid";
            let payoffSort = 99999;

            if (payoffDateStr) {
                const date = new Date(payoffDateStr);
                payoffDisplay = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                payoffSort = date.getFullYear() * 12 + date.getMonth();
            }

            return {
                totalAssetInterest: lastLog.cumulativeDepositoInterest,
                totalMortgageInterestPaid: sim.summary.totalInterestPaid,
                payoffDisplay,
                payoffSort,
                logs: sim.logs
            };
        };

        return {
            cash: getStats(simCash),
            deposito: getStats(simDeposito)
        };
    }, [expenses, income, mortgage, macro, scenario]);

    const { cash, deposito } = comparison;
    
    // Deltas
    const assetInterestDelta = deposito.totalAssetInterest - cash.totalAssetInterest;
    const mortgageInterestDelta = cash.totalMortgageInterestPaid - deposito.totalMortgageInterestPaid; // Positive if Depo saves money
    const netBenefit = assetInterestDelta + mortgageInterestDelta;
    
    // Avoid calculating months saved if the baseline never pays off (infinite).
    const monthsSaved = (cash.payoffSort === 99999) ? 0 : Math.max(0, cash.payoffSort - deposito.payoffSort);
    const achievedPayoff = cash.payoffSort === 99999 && deposito.payoffSort < 99999;

    const StatRow = ({ label, valCash, valDepo, type = 'neutral', isDate = false }: any) => {
        const isBetter = type === 'inverse' ? valDepo < valCash : valDepo > valCash;
        const isEqual = valDepo === valCash;
        
        let diffVal = 0;
        if (!isDate) {
             diffVal = type === 'inverse' ? valCash - valDepo : valDepo - valCash;
        }

        return (
            <div className="flex flex-col md:grid md:grid-cols-12 md:gap-4 py-4 border-b border-slate-50 last:border-0 text-sm">
                {/* Label Column */}
                <div className="md:col-span-4 text-slate-500 font-medium mb-2 md:mb-0 flex items-center">
                    {label}
                </div>
                
                {/* Cash Value Column */}
                <div className="md:col-span-4 flex md:block justify-between items-center md:text-right">
                     <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Wallet size={10} /> Cash
                     </span>
                     <div className="font-mono text-slate-600 whitespace-nowrap text-base">
                        {isDate ? valCash : formatMoney(valCash)}
                     </div>
                </div>

                {/* Deposito Value Column */}
                <div className="md:col-span-4 flex md:flex-col justify-between items-center md:items-end mt-1 md:mt-0">
                     <span className="md:hidden text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1">
                        <Landmark size={10} /> Deposito
                     </span>
                     <div className="flex flex-col items-end">
                        <div className={`font-mono font-bold whitespace-nowrap text-base ${
                            isEqual ? 'text-slate-600' : isBetter ? 'text-emerald-600' : 'text-slate-600'
                        }`}>
                            {isDate ? valDepo : formatMoney(valDepo)}
                        </div>
                        
                        {/* Stacked Delta Value - BELOW the main value */}
                        {!isEqual && !isDate && (
                            <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                +{formatMoney(diffVal)}
                            </div>
                        )}
                        {isDate && monthsSaved > 0 && (
                            <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                {monthsSaved} Mo Faster
                            </div>
                        )}
                         {isDate && achievedPayoff && (
                            <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 whitespace-nowrap">
                                Payoff Achieved
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
                    {/* Desktop Header */}
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
                        <StatRow label="Accumulated Interest Earned" valCash={cash.totalAssetInterest} valDepo={deposito.totalAssetInterest} />
                        <StatRow label="Mortgage Interest Paid" valCash={cash.totalMortgageInterestPaid} valDepo={deposito.totalMortgageInterestPaid} type="inverse" />
                        <StatRow label="Projected Payoff Date" valCash={cash.payoffDisplay} valDepo={deposito.payoffDisplay} isDate={true} />
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
                    {(monthsSaved > 0 || achievedPayoff) && (
                        <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-white/60 rounded-full text-emerald-800 text-xs font-bold border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            {achievedPayoff ? "Achieved Payoff" : `Mortgage Free ${monthsSaved} Months Sooner`}
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