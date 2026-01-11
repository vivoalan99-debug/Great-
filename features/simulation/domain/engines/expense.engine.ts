import { Expense, MacroConfig } from '../types';

export interface ExpenseResult {
    mandatoryTotal: number;
    discretionaryTotal: number;
    total: number;
}

export class ExpenseEngine {
    constructor(
        private expenses: Expense[],
        private macro: MacroConfig
    ) {}

    public calculate(yearIndex: number, multiplier: number = 1.0): ExpenseResult {
        let mandatoryTotal = 0;
        let discretionaryTotal = 0;

        this.expenses.forEach(e => {
            // Apply inflation or specific increase rate
            const effectiveRate = Math.max(this.macro.inflationRate, e.annualIncreasePercent);
            const inflatedAmount = e.amount * Math.pow(1 + effectiveRate / 100, yearIndex);

            if (e.category === 'MANDATORY') {
                mandatoryTotal += inflatedAmount;
            } else {
                discretionaryTotal += inflatedAmount;
            }
        });

        // Apply austerity multiplier only to discretionary expenses
        discretionaryTotal *= multiplier;

        return {
            mandatoryTotal,
            discretionaryTotal,
            total: mandatoryTotal + discretionaryTotal
        };
    }
}