import { MortgageConfig, YearLog } from '../types';
import { calculatePMT } from '../../../../shared/utils/mathUtils';

export interface MortgagePaymentResult {
    installment: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
    currentRate: number;
    extraPaymentMade: number;
    isPaidOff: boolean;
}

export class MortgageEngine {
    private currentPrincipal: number;
    private monthsRemaining: number;
    private baselinePrincipal: number;
    private baselineInstallment: number; // The "Ghost" installment if no extra payments were made
    private currentInstallment: number;
    private accumulatedInterestSaved: number = 0;

    constructor(private config: MortgageConfig) {
        this.currentPrincipal = config.principal;
        this.monthsRemaining = config.tenureYears * 12;
        
        this.baselinePrincipal = config.principal;
        this.baselineInstallment = calculatePMT(
            config.principal, 
            this.getRate(0), 
            this.monthsRemaining
        );
        this.currentInstallment = this.baselineInstallment;
    }

    public getStatus() {
        return {
            balance: this.currentPrincipal,
            baselineInstallment: this.baselineInstallment,
            currentInstallment: this.currentInstallment,
            accumulatedInterestSaved: this.accumulatedInterestSaved
        };
    }

    private getRate(monthIndex: number): number {
        const currentMonthNum = monthIndex + 1;
        const tier = this.config.rates.find(r => currentMonthNum >= r.startMonth && currentMonthNum <= r.endMonth);
        if (!tier) {
            // Fallback to last known rate or default 12% if none defined
            if (this.config.rates.length > 0) return this.config.rates[this.config.rates.length - 1].rate;
            return 12.0;
        }
        return tier.rate;
    }

    public processMonth(
        monthIndex: number, 
        extraBucketBalance: number, 
        canMakeExtraPayment: boolean,
        events: string[],
        yearLogs: YearLog[],
        yearIndex: number
    ): MortgagePaymentResult {
        
        // 1. Baseline Calculation (Ghost Tracking for comparison)
        if (this.baselinePrincipal > 0) {
            // Recalculate baseline installment if rate changes
            if (monthIndex > 0 && this.getRate(monthIndex) !== this.getRate(monthIndex - 1)) {
                 this.baselineInstallment = calculatePMT(this.baselinePrincipal, this.getRate(monthIndex), this.monthsRemaining);
            }
            
            const blRate = this.getRate(monthIndex) / 100 / 12;
            const blInterest = this.baselinePrincipal * blRate;
            const blPrincipalPaid = Math.min(this.baselineInstallment, this.baselinePrincipal + blInterest) - blInterest;
            this.baselinePrincipal -= blPrincipalPaid;
        }

        // 2. Real Calculation
        if (this.currentPrincipal <= 0) {
            return {
                installment: 0, principalPaid: 0, interestPaid: 0,
                remainingBalance: 0, currentRate: 0, extraPaymentMade: 0, isPaidOff: true
            };
        }

        // Clean up small dust amounts
        if (this.currentPrincipal < 10000) {
            this.currentPrincipal = 0;
            return {
                installment: 0, principalPaid: 0, interestPaid: 0,
                remainingBalance: 0, currentRate: 0, extraPaymentMade: 0, isPaidOff: true
            };
        }

        const currentRate = this.getRate(monthIndex);
        const monthlyRate = currentRate / 100 / 12;

        // Rate Change Event
        if (monthIndex > 0 && this.getRate(monthIndex) !== this.getRate(monthIndex - 1)) {
            // Recalculate based on current balance
            this.currentInstallment = calculatePMT(this.currentPrincipal, currentRate, this.monthsRemaining);
            events.push(`Rate: ${currentRate}%`);
        }

        const interestPaid = this.currentPrincipal * monthlyRate;
        // Payment is typically fixed installment, but capped at remaining debt + interest
        const actualPayment = Math.min(this.currentInstallment, this.currentPrincipal + interestPaid);
        const principalPaid = actualPayment - interestPaid;
        
        this.currentPrincipal -= principalPaid;
        this.monthsRemaining--;

        // 3. Extra Payment Logic
        let extraPaymentMade = 0;
        // Logic: Once a year (month 0, 12, etc), if employed and bucket full
        if (monthIndex > 0 && monthIndex % 12 === 0 && this.currentPrincipal > 0 && canMakeExtraPayment) {
            const minExtra = this.config.extraPaymentMinMultiple * this.currentInstallment;
            
            if (extraBucketBalance >= minExtra) {
                const amountToPay = extraBucketBalance;
                const penaltyAmt = amountToPay * (this.config.penaltyPercent / 100);
                const netReduction = Math.min(amountToPay - penaltyAmt, this.currentPrincipal);

                const instBefore = this.currentInstallment;
                
                // Reduce Principal
                this.currentPrincipal -= netReduction;
                extraPaymentMade = amountToPay;

                // Recalculate Installment
                // Note: monthsRemaining was already decremented above, so we use current value
                const newInstallment = calculatePMT(this.currentPrincipal, currentRate, this.monthsRemaining);
                
                // Banking rule safety: Installment usually doesn't increase on recalculation unless tenure shortens
                this.currentInstallment = Math.min(instBefore, newInstallment);

                const intSaved = Math.max(0, (instBefore - this.currentInstallment) * this.monthsRemaining - netReduction);
                this.accumulatedInterestSaved += intSaved;

                yearLogs.push({
                    year: yearIndex,
                    extraPaymentPaid: amountToPay,
                    penaltyPaid: penaltyAmt,
                    principalReduced: netReduction,
                    installmentBefore: instBefore,
                    installmentAfter: this.currentInstallment,
                    interestSaved: intSaved
                });
            }
        }

        return {
            installment: actualPayment,
            principalPaid,
            interestPaid,
            remainingBalance: this.currentPrincipal,
            currentRate,
            extraPaymentMade,
            isPaidOff: this.currentPrincipal <= 0
        };
    }
}