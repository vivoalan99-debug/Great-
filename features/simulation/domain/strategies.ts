import { IncomeConfig, RiskSettings, MacroConfig } from './types';
import { formatMoney } from '../../../shared/utils/mathUtils';
import { BPJS_GROWTH_RATE } from '../../../constants';

export interface MonthlyContext {
    monthIndex: number;
    currentDate: Date;
    incomeConfig: IncomeConfig;
    riskSettings: RiskSettings;
    macro: MacroConfig;
    yearIndex: number;
    // Pre-calculated indices to avoid date math repetition in strategy
    jobLossMonthIndex: number; 
    notificationMonthIndex: number;
}

export interface MonthlyResult {
    baseIncome: number;
    bonusIncome: number;
    expenseMultiplier: number;
    events: string[];
    isEmployed: boolean;
    inSurvivalMode: boolean;
    bpjsBalance: number;
}

export abstract class ScenarioStrategy {
    protected bpjsBalance: number;
    protected isEmployed: boolean = true;
    protected inSurvivalMode: boolean = false;

    constructor(initialBpjs: number) {
        this.bpjsBalance = initialBpjs;
    }

    public getBpjsBalance(): number {
        return this.bpjsBalance;
    }

    public getStatus() {
        return { isEmployed: this.isEmployed, inSurvivalMode: this.inSurvivalMode };
    }

    abstract processMonth(ctx: MonthlyContext): MonthlyResult;

    protected calculateNormalIncome(ctx: MonthlyContext): { base: number, bonus: number, events: string[] } {
        let base = 0;
        let bonus = 0;
        const events: string[] = [];
        const monthInYear = ctx.monthIndex % 12;

        const salaryMultiplier = Math.pow(1 + ctx.incomeConfig.annualIncreasePercent / 100, ctx.yearIndex);
        const currentBaseSalary = ctx.incomeConfig.baseSalary * salaryMultiplier;

        base = currentBaseSalary;

        if (ctx.incomeConfig.thrMonths.includes(monthInYear)) {
            bonus += currentBaseSalary;
            events.push('THR');
        }
        if (ctx.incomeConfig.compensationMonths.includes(monthInYear)) {
            bonus += currentBaseSalary;
            events.push('Compensation');
        }

        // Grow BPJS
        this.bpjsBalance += this.bpjsBalance * (BPJS_GROWTH_RATE / 100) + (currentBaseSalary * 0.057);

        return { base, bonus, events };
    }
}

export class NormalStrategy extends ScenarioStrategy {
    processMonth(ctx: MonthlyContext): MonthlyResult {
        const income = this.calculateNormalIncome(ctx);
        return {
            baseIncome: income.base,
            bonusIncome: income.bonus,
            expenseMultiplier: 1.0,
            events: income.events,
            isEmployed: true,
            inSurvivalMode: false,
            bpjsBalance: this.bpjsBalance
        };
    }
}

export class JobLossStrategy extends ScenarioStrategy {
    processMonth(ctx: MonthlyContext): MonthlyResult {
        const events: string[] = [];
        let baseIncome = 0;
        let bonusIncome = 0;
        let expenseMultiplier = 1.0;

        const { jobLossMonthIndex, notificationMonthIndex } = ctx;
        
        // Status Check
        if (ctx.monthIndex >= jobLossMonthIndex) {
            this.isEmployed = false;
        }
        
        // Survival Mode Check
        if (ctx.monthIndex >= notificationMonthIndex && ctx.monthIndex < jobLossMonthIndex) {
            if (!this.inSurvivalMode) {
                events.push('Notice Received: Survival Mode');
            }
            this.inSurvivalMode = true;
        }

        if (this.isEmployed) {
            const normal = this.calculateNormalIncome(ctx);
            baseIncome = normal.base;
            bonusIncome = normal.bonus;
            events.push(...normal.events);
            
            if (this.inSurvivalMode) {
                expenseMultiplier = 0.5;
                if (!events.includes('Austerity')) events.push('Austerity');
            }
        } else {
            expenseMultiplier = 0.5;
            if (!events.includes('Austerity')) events.push('Austerity');

            // Severance
            if (ctx.monthIndex === jobLossMonthIndex) {
                events.push('Job Loss Event');
                const salaryMultiplier = Math.pow(1 + ctx.incomeConfig.annualIncreasePercent / 100, ctx.yearIndex);
                const currentSalary = ctx.incomeConfig.baseSalary * salaryMultiplier;
                const severance = currentSalary * 1.0; 
                bonusIncome += severance;
                events.push(`Severance Paid (+${formatMoney(severance)})`);
            }

            // BPJS Liquidate
            if (ctx.monthIndex === jobLossMonthIndex + 1 && this.bpjsBalance > 0) {
                bonusIncome += this.bpjsBalance;
                events.push(`BPJS Liquidated (+${formatMoney(this.bpjsBalance)})`);
                this.bpjsBalance = 0;
            }
        }

        return {
            baseIncome,
            bonusIncome,
            expenseMultiplier,
            events,
            isEmployed: this.isEmployed,
            inSurvivalMode: this.inSurvivalMode,
            bpjsBalance: this.bpjsBalance
        };
    }
}

export const createStrategy = (type: string, initialBpjs: number): ScenarioStrategy => {
    switch (type) {
        case 'UNEMPLOYED':
        case 'WORST_CASE':
            return new JobLossStrategy(initialBpjs);
        default:
            return new NormalStrategy(initialBpjs);
    }
};