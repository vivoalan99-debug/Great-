import React from 'react';
import { useStore } from '../../store/useStore';
import { Card, SummaryCard } from '../ui/Card';
import { CashflowChart, MortgageChart } from '../Charts';
import { MonthlyCashflowChart } from '../MonthlyCashflowChart';
import { DepositoGrowthChart } from '../DepositoGrowthChart';
import { InterestSavedChart } from '../InterestSavedChart';
import { ExpensesTable } from '../ExpensesTable';
import { DebouncedInput } from '../ui/DebouncedInput';
import { formatMoney } from '../../shared/utils/mathUtils';
import { TrendingDown, ShieldCheck, ShieldAlert, AlertTriangle, CalendarClock, CheckCircle, Home } from 'lucide-react';
import { ScenarioType } from '../../features/simulation/domain/types';

export const DashboardView = () => {
    const { simulationResult, scenario, macro, setMacro, income, setIncome } = useStore();

    if (!simulationResult) return null;
    const { summary, logs } = simulationResult;

    const getRiskConfig = (level: string) => {
        switch(level) {
            case 'HIGH': return { color: 'red' as const, icon: ShieldAlert, border: 'border-rose-200' };
            case 'MEDIUM': return { color: 'amber' as const, icon: AlertTriangle, border: 'border-amber-200' };
            default: return { color: 'green' as const, icon: ShieldCheck, border: 'border-slate-100' };
        }
    };
    const riskConfig = getRiskConfig(summary.riskLevel);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 {scenario === ScenarioType.NORMAL ? (
                    <SummaryCard 
                        label="Runway" 
                        value={`${summary.liquidityRunwayMonths.toFixed(1)} Mo`} 
                        subtext={`Min: ${summary.lowestLiquidityMonths.toFixed(1)} Mo`}
                        color={riskConfig.color}
                        icon={riskConfig.icon}
                        className={riskConfig.border}
                    />
                ) : (
                     <SummaryCard 
                        label="Job Search Runway" 
                        value={summary.maxJobSearchMonths !== null ? `${summary.maxJobSearchMonths} Mo` : 'Safe'} 
                        subtext={summary.bankruptcyDate ? `Insolvent: ${summary.bankruptcyDate}` : "Runway > 20y"}
                        color={riskConfig.color}
                        icon={CalendarClock}
                        className={riskConfig.border}
                    />
                )}
                <SummaryCard 
                  label="Buffer Full" 
                  value={summary.monthsToFullBuffer ? `Month ${summary.monthsToFullBuffer}` : 'Never'} 
                  subtext="3x Expenses"
                  color={summary.monthsToFullBuffer ? 'green' : 'amber'}
                  icon={summary.monthsToFullBuffer ? CheckCircle : AlertTriangle}
                />
                <SummaryCard 
                  label="Mortgage Free" 
                  value={summary.mortgagePayoffDate ? new Date(summary.mortgagePayoffDate).getFullYear().toString() : 'Active'} 
                  subtext="Payoff Year"
                  color="blue"
                  icon={Home}
                />
                <SummaryCard 
                  label="Purchasing Power" 
                  value={`-${summary.purchasingPowerLoss.toFixed(1)}%`} 
                  subtext="Inflation Loss (20y)"
                  color="red"
                  icon={TrendingDown}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Funds Accumulation">
                        <CashflowChart data={logs} />
                    </Card>
                    <MonthlyCashflowChart />
                    <Card title="Mortgage Burndown">
                        <MortgageChart data={logs} />
                    </Card>
                    <InterestSavedChart />
                    <DepositoGrowthChart />
                </div>
                <div className="space-y-6">
                    <Card title="Macro Settings" className="border-l-4 border-l-rose-400">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Inflation Rate</label>
                                    <span className="text-lg font-bold text-rose-600">{macro.inflationRate}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="15" step="0.5"
                                    className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    value={macro.inflationRate}
                                    onChange={(e) => setMacro({...macro, inflationRate: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Future Value (100M)</p>
                                <span className="text-sm font-bold text-slate-800">
                                    {formatMoney(100000000 * Math.pow(1 - macro.inflationRate/100, 20))}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card title="Quick Expenses">
                        <ExpensesTable />
                    </Card>
                    
                    <Card title="Income Configuration">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Salary</label>
                                <DebouncedInput 
                                    type="number" formatType="number"
                                    className="w-full border border-slate-200 rounded p-2 text-sm"
                                    value={income.baseSalary}
                                    onChange={(val) => setIncome({...income, baseSalary: val as number})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Annual Inc %</label>
                                    <DebouncedInput 
                                        type="number" formatType="number"
                                        className="w-full border border-slate-200 rounded p-2 text-sm"
                                        value={income.annualIncreasePercent}
                                        onChange={(val) => setIncome({...income, annualIncreasePercent: val as number})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BPJS Init</label>
                                    <DebouncedInput 
                                        type="number" formatType="number"
                                        className="w-full border border-slate-200 rounded p-2 text-sm"
                                        value={income.bpjsInitialBalance}
                                        onChange={(val) => setIncome({...income, bpjsInitialBalance: val as number})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};