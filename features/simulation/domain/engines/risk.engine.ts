import { ScenarioType } from '../types';

export interface RiskState {
    liquidityMonths: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    hasBankruptcy: boolean;
    bankruptcyDateStr: string | null;
}

export class RiskEngine {
    private lowestLiquidity = 999;
    private maxRiskSeverity = 0;
    private maxRiskReason = 'Financial plan is robust.';
    private hasBankruptcy = false;
    private bankruptcyMonthIndex: number | null = null;
    private bankruptcyDateStr: string | null = null;

    constructor(
        private scenario: ScenarioType,
        private riskSettings: { jobLossMonthIndex: number; notificationMonthIndex: number }
    ) {}

    public analyze(
        monthIndex: number,
        dateStr: string,
        netFlow: number,
        totalLiquidAssets: number,
        monthlyBurnRate: number,
        isEmployed: boolean,
        inSurvivalMode: boolean
    ): RiskState {
        // 1. Calculate Liquidity Runway
        const liquidityMonths = monthlyBurnRate > 0 ? totalLiquidAssets / monthlyBurnRate : 999;

        // 2. Track Lowest Liquidity (only during relevant risk periods)
        const { notificationMonthIndex } = this.riskSettings;
        if (this.scenario !== ScenarioType.NORMAL && (monthIndex >= notificationMonthIndex || notificationMonthIndex === -1)) {
            if (liquidityMonths < this.lowestLiquidity) this.lowestLiquidity = liquidityMonths;
        }

        // 3. Determine Monthly Risk Level
        let monthlyRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let reason = '';

        if (this.hasBankruptcy) {
            monthlyRisk = 'HIGH'; 
            reason = 'Bankrupt';
        } else if (!isEmployed) {
            if (liquidityMonths < 3) { monthlyRisk = 'HIGH'; reason = 'Runway < 3mo (Unemployed)'; }
            else if (liquidityMonths < 6) { monthlyRisk = 'MEDIUM'; reason = 'Runway < 6mo (Unemployed)'; }
        } else if (inSurvivalMode) {
            if (liquidityMonths < 3) { monthlyRisk = 'HIGH'; reason = 'Critical Pre-loss Runway'; }
            else { monthlyRisk = 'MEDIUM'; reason = 'Survival Mode (Preparing)'; }
        } else {
            if (netFlow < 0) {
                 if (liquidityMonths < 3) { monthlyRisk = 'HIGH'; reason = 'High Burn Rate & Low Liquidity'; }
                 else if (liquidityMonths < 6) { monthlyRisk = 'MEDIUM'; reason = 'Negative Cashflow'; }
            } else {
                 if (liquidityMonths < 1 && monthIndex > 6) { monthlyRisk = 'MEDIUM'; reason = 'Fragile (Buffer < 1mo)'; }
            }
        }

        // 4. Update Max Severity
        const severity = monthlyRisk === 'HIGH' ? 2 : monthlyRisk === 'MEDIUM' ? 1 : 0;
        if (severity > this.maxRiskSeverity) {
            this.maxRiskSeverity = severity;
            this.maxRiskReason = reason;
        }

        return {
            liquidityMonths,
            riskLevel: monthlyRisk,
            reason,
            hasBankruptcy: this.hasBankruptcy,
            bankruptcyDateStr: this.bankruptcyDateStr
        };
    }

    public registerBankruptcy(monthIndex: number, dateStr: string) {
        if (!this.hasBankruptcy) {
            this.hasBankruptcy = true;
            this.bankruptcyMonthIndex = monthIndex;
            this.bankruptcyDateStr = dateStr;
        }
    }

    public getSummary() {
        let finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (this.hasBankruptcy) finalRiskLevel = 'HIGH';
        else if (this.maxRiskSeverity === 2) finalRiskLevel = 'HIGH';
        else if (this.maxRiskSeverity === 1) finalRiskLevel = 'MEDIUM';

        return {
            lowestLiquidityMonths: this.lowestLiquidity,
            riskLevel: finalRiskLevel,
            riskReason: this.maxRiskReason,
            bankruptcyDate: this.bankruptcyDateStr,
            bankruptcyMonthIndex: this.bankruptcyMonthIndex
        };
    }
}