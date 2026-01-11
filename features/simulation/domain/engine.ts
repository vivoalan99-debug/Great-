import { 
  Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, 
  SimulationResult, YearLog, RiskSettings, ImpactAnalysis, StrategySnapshot
} from './types';
import { createStrategy, MonthlyContext } from './strategies';

// Sub-Modules (OOP Engines)
import { ExpenseEngine } from './engines/expense.engine';
import { MortgageEngine } from './engines/mortgage.engine';
import { CashflowEngine } from './engines/cashflow.engine';
import { RiskEngine } from './engines/risk.engine';
import { StatisticsEngine } from './engines/statistics.engine';

// Helper for Date Math
const getMonthDiff = (startDateStr: string, targetDateStr: string) => {
    if (!startDateStr || !targetDateStr) return -1;
    const start = new Date(startDateStr);
    const target = new Date(targetDateStr);
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return -1;
    return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
};

// Helper to convert ISO Date to Month Index for comparison
const getMonthIndexFromDate = (isoDate: string | null) => {
    if (!isoDate) return 9999; // Infinity effectively
    const d = new Date(isoDate);
    return d.getFullYear() * 12 + d.getMonth();
};

/**
 * Internal Orchestrator: Runs a single simulation pass based on provided config.
 * Encapsulated to allow multiple runs (e.g., Main Run vs. Shadow/Comparison Run).
 */
const runSinglePass = (
    expenses: Expense[],
    income: IncomeConfig,
    mortgageConfig: MortgageConfig,
    macro: MacroConfig,
    scenario: ScenarioType,
    riskSettings: RiskSettings
) => {
    // 1. Initialize Domain Engines
    const expenseEngine = new ExpenseEngine(expenses, macro);
    const mortgageEngine = new MortgageEngine(mortgageConfig);
    const cashflowEngine = new CashflowEngine(mortgageConfig.useDeposito);
    
    const jobLossMonthIndex = getMonthDiff(mortgageConfig.startDate, riskSettings.jobLossDate);
    const notificationMonthIndex = getMonthDiff(mortgageConfig.startDate, riskSettings.notificationDate);
    
    const riskEngine = new RiskEngine(scenario, { jobLossMonthIndex, notificationMonthIndex });
    const statsEngine = new StatisticsEngine();
    
    const strategy = createStrategy(scenario, income.bpjsInitialBalance);

    // 2. Setup Loop Variables
    const startDate = new Date(mortgageConfig.startDate);
    const maxMonths = 20 * 12; 
    const yearLogs: YearLog[] = [];

    // 3. Execution Loop
    for (let m = 0; m < maxMonths; m++) {
        const currentYearIdx = Math.floor(m / 12);
        const currentMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
        const dateStr = !isNaN(currentMonthDate.getTime()) 
            ? currentMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : `Month ${m}`;
        
        // A. Income Strategy
        const context: MonthlyContext = {
            monthIndex: m, yearIndex: currentYearIdx, currentDate: currentMonthDate,
            incomeConfig: income, riskSettings, macro, jobLossMonthIndex, notificationMonthIndex
        };
        const incomeRes = strategy.processMonth(context);
        const totalIncome = incomeRes.baseIncome + incomeRes.bonusIncome;

        // B. Expense Calculation
        const expenseRes = expenseEngine.calculate(currentYearIdx, incomeRes.expenseMultiplier);
        
        // C. Mortgage Processing
        const canMakeExtra = incomeRes.isEmployed && !incomeRes.inSurvivalMode;
        const mortgageRes = mortgageEngine.processMonth(
            m, cashflowEngine.getStatus().extra, canMakeExtra, incomeRes.events, yearLogs, currentYearIdx
        );

        if (mortgageRes.extraPaymentMade > 0) {
            cashflowEngine.deductExtraPayment(mortgageRes.extraPaymentMade);
        }

        if (mortgageRes.isPaidOff) {
            statsEngine.setPayoffDate(currentMonthDate.toISOString());
        }

        // D. Cashflow & Bucketing
        const netFlow = totalIncome - expenseRes.total - mortgageRes.installment;
        const mortgageAvg = mortgageRes.installment > 0 ? mortgageRes.installment : mortgageEngine.getStatus().baselineInstallment;
        
        // Targets: Buffer = 3 months, Emergency = 6 months (Expenses + Mortgage)
        const targets = {
            buffer: 3 * expenseRes.total + 1 * mortgageAvg,
            emergency: 6 * expenseRes.total + 6 * mortgageAvg
        };
        
        const cfRes = cashflowEngine.process(netFlow, targets);
        
        if (cfRes.hasBankruptcy) {
            riskEngine.registerBankruptcy(m, dateStr);
            if (!incomeRes.events.includes("INSOLVENT")) incomeRes.events.push("INSOLVENT");
        }

        // E. Risk Analysis
        const totalLiquid = cfRes.buckets.buffer + cfRes.buckets.emergency + cfRes.buckets.extra + cfRes.buckets.deposito;
        const monthlyBurn = expenseRes.total + (mortgageRes.remainingBalance > 0 ? mortgageRes.installment : 0);
        
        const riskState = riskEngine.analyze(
            m, dateStr, netFlow, totalLiquid, monthlyBurn, incomeRes.isEmployed, incomeRes.inSurvivalMode
        );

        statsEngine.recordMilestones(
            m, dateStr,
            { current: cfRes.buckets.buffer, target: targets.buffer },
            { current: cfRes.buckets.emergency, target: targets.emergency },
            mortgageRes.isPaidOff
        );

        // F. Logging
        statsEngine.logMonth({
            monthIndex: m,
            year: currentYearIdx + 2026, // Starting year assumed 2026 based on constants
            dateStr,
            incomeBase: incomeRes.baseIncome,
            incomeBonus: incomeRes.bonusIncome,
            totalIncome,
            expensesMandatory: expenseRes.mandatoryTotal,
            expensesDiscretionary: expenseRes.discretionaryTotal,
            totalExpenses: expenseRes.total,
            mortgagePaid: mortgageRes.installment,
            mortgageInterest: mortgageRes.interestPaid,
            mortgagePrincipalPaid: mortgageRes.principalPaid,
            mortgageBalance: mortgageRes.remainingBalance,
            mortgageRate: mortgageRes.currentRate,
            netFlow,
            bufferBalance: cfRes.buckets.buffer,
            emergencyBalance: cfRes.buckets.emergency,
            extraPaymentBucket: cfRes.buckets.extra,
            depositoBalance: cfRes.buckets.deposito,
            events: incomeRes.events,
            riskLevel: riskState.riskLevel,
            depositoInterestEarned: cfRes.depositoInterestEarned,
            cumulativeDepositoInterest: cashflowEngine.getStatus().cumulativeInterest,
            principalStart: 0, // Simplified for log
            principalAfterRegular: mortgageRes.remainingBalance + mortgageRes.principalPaid,
            extraPaymentMade: mortgageRes.extraPaymentMade,
            installmentBaseline: mortgageEngine.getStatus().baselineInstallment,
            installmentCurrent: mortgageRes.installment,
            installmentNext: mortgageEngine.getStatus().currentInstallment
        });
    }

    // 4. Summarize
    const riskSummary = riskEngine.getSummary();
    const summary = statsEngine.generateSummary(
        riskSummary,
        { 
            principal: mortgageConfig.principal, 
            tenureMonths: mortgageConfig.tenureYears * 12, 
            totalSaved: mortgageEngine.getStatus().accumulatedInterestSaved 
        },
        macro.inflationRate,
        { index: jobLossMonthIndex, maxMonths: maxMonths }
    );

    return { 
        logs: statsEngine.getLogs(), 
        yearLogs, 
        summary,
        // Return raw data needed for Snapshot creation
        _snapshot: {
            totalAssetInterest: cashflowEngine.getStatus().cumulativeInterest,
            totalMortgageInterestPaid: summary.totalInterestPaid,
            payoffDateStr: summary.mortgagePayoffDate,
            payoffMonthIndex: getMonthIndexFromDate(summary.mortgagePayoffDate)
        } as StrategySnapshot
    };
};

/**
 * Main Entry Point.
 * Orchestrates the primary simulation AND the shadow simulation for impact analysis.
 */
export const runSimulation = (
  expenses: Expense[],
  income: IncomeConfig,
  mortgageConfig: MortgageConfig,
  macro: MacroConfig,
  scenario: ScenarioType,
  riskSettings: RiskSettings
): SimulationResult => {
    
    // 1. Run Main Simulation (The User's actual selection)
    const mainRun = runSinglePass(expenses, income, mortgageConfig, macro, scenario, riskSettings);

    // 2. Run Shadow Simulations for Comparison
    // We explicitly run both scenarios: "Cash Only" and "With Deposito" 
    // to build a complete ImpactAnalysis object, regardless of what the user currently selected.
    
    let cashRun, depositoRun;

    if (mortgageConfig.useDeposito) {
        // Main run IS the Deposito run
        depositoRun = mainRun;
        // Shadow run is Cash run
        cashRun = runSinglePass(expenses, income, { ...mortgageConfig, useDeposito: false }, macro, scenario, riskSettings);
    } else {
        // Main run IS the Cash run
        cashRun = mainRun;
        // Shadow run is Deposito run
        depositoRun = runSinglePass(expenses, income, { ...mortgageConfig, useDeposito: true }, macro, scenario, riskSettings);
    }

    // 3. Construct Impact Analysis
    const cashSnapshot = cashRun._snapshot;
    const depoSnapshot = depositoRun._snapshot;
    
    // Calculate Net Benefit: (Extra Interest Earned) + (Interest Saved on Mortgage via faster payoff or penalty diff)
    // Note: Total Interest Paid difference captures the savings.
    const interestEarnedDiff = depoSnapshot.totalAssetInterest - cashSnapshot.totalAssetInterest;
    const mortgageInterestSavedDiff = cashSnapshot.totalMortgageInterestPaid - depoSnapshot.totalMortgageInterestPaid;
    
    const impactAnalysis: ImpactAnalysis = {
        cashStrategy: cashSnapshot,
        depositoStrategy: depoSnapshot,
        netBenefit: interestEarnedDiff + mortgageInterestSavedDiff,
        monthsSaved: cashSnapshot.payoffMonthIndex === 9999 ? 0 : Math.max(0, cashSnapshot.payoffMonthIndex - depoSnapshot.payoffMonthIndex),
        isPayoffAchievedFaster: depoSnapshot.payoffMonthIndex < cashSnapshot.payoffMonthIndex
    };

    return {
        logs: mainRun.logs,
        yearLogs: mainRun.yearLogs,
        summary: mainRun.summary,
        impactAnalysis
    };
};
