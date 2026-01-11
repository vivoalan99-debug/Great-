import { MonthLog, YearLog } from '../types';

export class StatisticsEngine {
    private logs: MonthLog[] = [];
    private bufferFullMonth: number | null = null;
    private emergencyFullMonth: number | null = null;
    private payoffDate: string | null = null;

    public logMonth(data: MonthLog) {
        this.logs.push(data);
    }

    public getLogs(): MonthLog[] {
        return this.logs;
    }

    public recordMilestones(
        monthIndex: number, 
        dateStr: string,
        bufferState: { current: number, target: number },
        emergencyState: { current: number, target: number },
        isMortgagePaidOff: boolean
    ) {
        if (this.bufferFullMonth === null && bufferState.current >= bufferState.target - 100) {
            this.bufferFullMonth = monthIndex;
        }
        if (this.emergencyFullMonth === null && emergencyState.current >= emergencyState.target - 100) {
            this.emergencyFullMonth = monthIndex;
        }
        if (isMortgagePaidOff && this.payoffDate === null) {
            this.payoffDate = dateStr; 
        }
    }

    public setPayoffDate(dateIso: string) {
        if (!this.payoffDate) this.payoffDate = dateIso;
    }

    public generateSummary(
        riskSummary: any,
        mortgageInfo: { principal: number, tenureMonths: number, totalSaved: number },
        inflationRate: number,
        jobLossInfo: { index: number, maxMonths: number }
    ) {
        // Job Search Calculation
        let maxJobSearchMonths: number | null = null;
        if (jobLossInfo.index !== -1 && jobLossInfo.index < jobLossInfo.maxMonths) {
            if (riskSummary.bankruptcyMonthIndex !== null) {
                maxJobSearchMonths = Math.max(0, riskSummary.bankruptcyMonthIndex - jobLossInfo.index);
            } else {
                maxJobSearchMonths = jobLossInfo.maxMonths - jobLossInfo.index; 
            }
        }

        // Construct Risk Reason
        let finalReason = riskSummary.riskReason;
        if (jobLossInfo.index !== -1 && maxJobSearchMonths !== null) {
            if (riskSummary.bankruptcyDate) {
                finalReason = `Insolvency ${maxJobSearchMonths} months after job loss.`;
            } else {
                finalReason = `Survived >${maxJobSearchMonths} months without job.`;
            }
        }

        const purchasingPowerLoss = (Math.pow(1 + inflationRate/100, 20) - 1) * 100;
        
        // Approx calculation for total paid if logs not summed fully, otherwise sum logs
        const totalInterestPaid = (mortgageInfo.principal * mortgageInfo.tenureMonths) - mortgageInfo.totalSaved; 

        return {
            monthsToFullBuffer: this.bufferFullMonth,
            monthsToFullEmergency: this.emergencyFullMonth,
            mortgagePayoffDate: this.payoffDate,
            totalInterestPaid, 
            totalInterestSaved: mortgageInfo.totalSaved,
            liquidityRunwayMonths: this.logs[this.logs.length-1]?.bufferBalance > 0 ? 99 : 0,
            lowestLiquidityMonths: riskSummary.lowestLiquidityMonths,
            riskLevel: riskSummary.riskLevel,
            riskReason: finalReason,
            purchasingPowerLoss,
            maxJobSearchMonths,
            bankruptcyDate: riskSummary.bankruptcyDate
        };
    }
}