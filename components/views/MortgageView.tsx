import React from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../ui/Card';
import { DebouncedInput } from '../ui/DebouncedInput';
import { MortgageRateScheduler } from '../MortgageRateScheduler';
import { DepositoImpactAnalysis } from '../DepositoImpactAnalysis';
import { InterestSavedChart } from '../InterestSavedChart';
import { MortgageAmortizationChart } from '../MortgageAmortizationChart';
import { YearlySummaryTable } from '../YearlySummaryTable';

export const MortgageView = () => {
    const { mortgage, setMortgage } = useStore();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Mortgage Configuration" className="lg:col-span-1">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Principal Amount</label>
                            <DebouncedInput 
                                type="number" formatType="number"
                                className="w-full border border-slate-200 rounded p-2"
                                value={mortgage.principal}
                                onChange={(val) => setMortgage({...mortgage, principal: val as number})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tenure (Years)</label>
                            <DebouncedInput 
                                type="number" formatType="number"
                                className="w-full border border-slate-200 rounded p-2"
                                value={mortgage.tenureYears}
                                onChange={(val) => setMortgage({...mortgage, tenureYears: val as number})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Penalty Percent (%)</label>
                            <DebouncedInput 
                                type="number" formatType="number" step="0.1"
                                className="w-full border border-slate-200 rounded p-2"
                                value={mortgage.penaltyPercent}
                                onChange={(val) => setMortgage({...mortgage, penaltyPercent: val as number})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Min Extra Payment (x Installment)</label>
                            <DebouncedInput 
                                type="number" formatType="number"
                                className="w-full border border-slate-200 rounded p-2"
                                value={mortgage.extraPaymentMinMultiple}
                                onChange={(val) => setMortgage({...mortgage, extraPaymentMinMultiple: val as number})}
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2 pb-2">
                            <input 
                                type="checkbox" 
                                checked={mortgage.useDeposito}
                                onChange={(e) => setMortgage({...mortgage, useDeposito: e.target.checked})}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <label className="text-sm text-slate-700">Park Extra Payment in Deposito (6%)</label>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <MortgageRateScheduler />
                        </div>
                    </div>
                </Card>
                <div className="lg:col-span-2 space-y-6">
                    <DepositoImpactAnalysis />
                    <InterestSavedChart />
                </div>
            </div>
            
            <MortgageAmortizationChart />
            <YearlySummaryTable />
        </div>
    );
};