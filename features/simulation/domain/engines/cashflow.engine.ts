import { DEPOSITO_RATE } from '../../../../constants';

export interface BucketState {
    buffer: number;
    emergency: number;
    extra: number;
    deposito: number;
}

export interface CashflowResult {
    netFlow: number;
    buckets: BucketState;
    depositoInterestEarned: number;
    hasBankruptcy: boolean;
}

export class CashflowEngine {
    private bufferBalance = 0;
    private emergencyBalance = 0;
    private extraBucket = 0;
    private deposito = 0;
    private accumulatedDepositoInterest = 0;

    constructor(private useDeposito: boolean) {}

    public getStatus() {
        return {
            buffer: this.bufferBalance,
            emergency: this.emergencyBalance,
            extra: this.extraBucket,
            deposito: this.deposito,
            cumulativeInterest: this.accumulatedDepositoInterest
        };
    }

    public process(
        netFlow: number, // Income - Expenses - Mortgage
        targets: { buffer: number, emergency: number }
    ): CashflowResult {
        let currentFlow = netFlow;
        let hasBankruptcy = false;

        if (currentFlow > 0) {
            // --- Filling Strategy (Waterfall) ---
            
            // 1. Fill Buffer
            if (this.bufferBalance < targets.buffer) {
                const fill = Math.min(currentFlow, targets.buffer - this.bufferBalance);
                this.bufferBalance += fill;
                currentFlow -= fill;
            }

            // 2. Fill Emergency
            if (this.bufferBalance >= targets.buffer - 1 && this.emergencyBalance < targets.emergency) {
                const fill = Math.min(currentFlow, targets.emergency - this.emergencyBalance);
                this.emergencyBalance += fill;
                currentFlow -= fill;
            }

            // 3. Overflow to Extra Bucket
            if (currentFlow > 0) {
                this.extraBucket += currentFlow;
                currentFlow = 0;
            }

        } else {
            // --- Draining Strategy ---
            let deficit = Math.abs(currentFlow);

            const draw = (amount: number, source: number): [number, number] => {
                const taken = Math.min(amount, source);
                return [taken, source - taken];
            };

            // Order of liquidation: Extra -> Deposito -> Emergency -> Buffer
            if (this.extraBucket > 0) { 
                const [t, r] = draw(deficit, this.extraBucket); 
                this.extraBucket = r; deficit -= t; 
            }
            if (deficit > 0 && this.deposito > 0) { 
                const [t, r] = draw(deficit, this.deposito); 
                this.deposito = r; deficit -= t; 
            }
            if (deficit > 0 && this.emergencyBalance > 0) { 
                const [t, r] = draw(deficit, this.emergencyBalance); 
                this.emergencyBalance = r; deficit -= t; 
            }
            if (deficit > 0 && this.bufferBalance > 0) { 
                const [t, r] = draw(deficit, this.bufferBalance); 
                this.bufferBalance = r; deficit -= t; 
            }

            if (deficit > 0.01) {
                hasBankruptcy = true;
            }
        }

        // --- Investment Growth (Deposito) ---
        let monthlyInterest = 0;
        if (this.useDeposito && this.extraBucket > 0) {
            monthlyInterest = this.extraBucket * (DEPOSITO_RATE / 100 / 12);
            this.extraBucket += monthlyInterest;
            this.accumulatedDepositoInterest += monthlyInterest;
        }

        return {
            netFlow,
            buckets: {
                buffer: this.bufferBalance,
                emergency: this.emergencyBalance,
                extra: this.extraBucket,
                deposito: this.deposito
            },
            depositoInterestEarned: monthlyInterest,
            hasBankruptcy
        };
    }

    public deductExtraPayment(amount: number) {
        // Used by Mortgage Engine to take money out for smart payment
        this.extraBucket -= amount;
        if (this.extraBucket < 0) this.extraBucket = 0; // Safety check
    }
}