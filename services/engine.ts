import { 
  Expense, IncomeConfig, MortgageConfig, ScenarioType, 
  SimulationResult, MonthLog, YearLog 
} from '../types';
import { INTEREST_SCHEDULE, DEPOSITO_RATE, BPJS_GROWTH_RATE } from '../constants';
import { calculatePMT } from './mathUtils';

const getAnnualRate = (yearIdx: number): number => {
  const yearNum = yearIdx + 1;
  const schedule = INTEREST_SCHEDULE.find(s => yearNum >= s.startYear && yearNum <= s.endYear);
  return schedule ? schedule.rate : 12.0;
};

export const runSimulation = (
  expenses: Expense[],
  income: IncomeConfig,
  mortgage: MortgageConfig,
  scenario: ScenarioType
): SimulationResult => {
  
  const startDate = new Date(mortgage.startDate);
  const maxMonths = 20 * 12; 
  const logs: MonthLog[] = [];
  const yearLogs: YearLog[] = [];
  
  // -- Initial State --
  let currentPrincipal = mortgage.principal;
  let monthsRemaining = mortgage.tenureYears * 12;
  
  // Calculate Initial Installment (Year 1 rate)
  const initialRate = getAnnualRate(0);
  let currentInstallment = calculatePMT(currentPrincipal, initialRate, monthsRemaining);
  const initialInstallment = currentInstallment; // Used for buffers

  let bufferBalance = 0;
  let emergencyBalance = 0;
  let extraBucket = 0;
  let deposito = 0;
  let bpjs = income.bpjsInitialBalance;
  
  let accumulatedInterestPaid = 0;
  let accumulatedInterestSaved = 0;
  let accumulatedDepositoInterest = 0;

  let isEmployed = true;
  let unemploymentCounter = 0;

  // Track logic
  let bufferFullMonth: number | null = null;
  let emergencyFullMonth: number | null = null;
  let payoffDate: string | null = null;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let liquidityMonths = 0;

  // Unemployment Trigger
  const unemploymentStartMonth = scenario === ScenarioType.UNEMPLOYED ? 18 : 
                                 scenario === ScenarioType.WORST_CASE ? 6 : 9999;

  for (let m = 0; m < maxMonths; m++) {
    if (currentPrincipal <= 1000 && payoffDate === null) {
      // Mortgage effectively paid
      currentPrincipal = 0;
      currentInstallment = 0;
      payoffDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1).toISOString();
    }

    const currentYearIdx = Math.floor(m / 12);
    const monthInYear = m % 12;
    const currentRate = getAnnualRate(currentYearIdx);
    const monthlyRate = currentRate / 100 / 12;

    // --- 1. Income ---
    let monthlyBase = 0;
    let monthlyBonus = 0;
    const events: string[] = [];

    // Check Employment
    if (m === unemploymentStartMonth) {
        isEmployed = false;
        events.push('Job Loss');
    }

    // Salary Growth (Annual)
    const salaryMultiplier = Math.pow(1 + income.annualIncreasePercent / 100, currentYearIdx);
    const currentBaseSalary = income.baseSalary * salaryMultiplier;

    if (isEmployed) {
        // Last salary check
        if (m < unemploymentStartMonth) {
             monthlyBase = currentBaseSalary;
             // THR
             if (income.thrMonths.includes(monthInYear)) {
                 monthlyBonus += currentBaseSalary;
                 events.push('THR Received');
             }
             // Compensation
             if (income.compensationMonths.includes(monthInYear)) {
                 monthlyBonus += currentBaseSalary;
                 events.push('Compensation Received');
             }
             // BPJS Growth
             bpjs += bpjs * (BPJS_GROWTH_RATE / 100) + (currentBaseSalary * 0.057);
        } else if (m === unemploymentStartMonth) {
            // Final salary + Severance/Compensation
            monthlyBase = currentBaseSalary; // Final month salary
            monthlyBonus += currentBaseSalary; // Severance (simplified as 1x)
            events.push('Severance Paid');
        }
    } else {
        // Unemployed
        monthlyBase = 0;
        // BPJS Claim (1 month after unemployment)
        if (m === unemploymentStartMonth + 1 && bpjs > 0) {
            monthlyBonus += bpjs;
            bpjs = 0;
            events.push('BPJS Claimed');
        }
    }

    const totalIncome = monthlyBase + monthlyBonus;

    // --- 2. Expenses ---
    // Expense Inflation
    const expenseMultiplier = Math.pow(1 + 0.04, currentYearIdx); // Assume 4% general inflation for simplicity if not per-item
    // Or iterate items
    let mandExpenses = 0;
    let discExpenses = 0;

    expenses.forEach(e => {
        const itemInflated = e.amount * Math.pow(1 + e.annualIncreasePercent/100, currentYearIdx);
        if (e.category === 'MANDATORY') mandExpenses += itemInflated;
        else discExpenses += itemInflated;
    });

    // If Unemployed, maybe cut discretionary?
    // Let's assume Worst Case cuts discretionary by 50%, others keep it.
    if (!isEmployed && scenario === ScenarioType.WORST_CASE) {
        discExpenses *= 0.5;
        events.push('Expenses Cut');
    }

    const totalExpenses = mandExpenses + discExpenses;

    // --- 3. Mortgage Payment ---
    let interestPayment = 0;
    let principalPayment = 0;
    let actualPayment = 0;

    if (currentPrincipal > 0) {
        interestPayment = currentPrincipal * monthlyRate;
        // Check if rate changed this month (Jan of new year) or if it's month 0
        if (monthInYear === 0 || m === 0) {
           if (monthInYear === 0 && m > 0) {
               const newInstallment = calculatePMT(currentPrincipal, currentRate, monthsRemaining);
               currentInstallment = newInstallment; 
               events.push(`Rate Change: ${currentRate}%`);
           }
        }
        
        actualPayment = Math.min(currentInstallment, currentPrincipal + interestPayment);
        principalPayment = actualPayment - interestPayment;
        if (principalPayment < 0) principalPayment = 0;
    }

    // --- 4. Targets ---
    const M_avg = initialInstallment;
    const E = totalExpenses; 
    const bufferTarget = 3 * E + 1 * M_avg;
    const emergencyTarget = 12 * E + 12 * M_avg;

    // --- 5. Net Flow & Allocation ---
    let netFlow = totalIncome - totalExpenses - actualPayment;
    let cashSurplus = netFlow;

    // Flow logic
    if (cashSurplus > 0) {
        // 1. Fill Buffer
        if (bufferBalance < bufferTarget) {
            const needed = bufferTarget - bufferBalance;
            const flow = Math.min(cashSurplus, needed);
            bufferBalance += flow;
            cashSurplus -= flow;
        }
        
        // 2. Fill Emergency
        if (bufferBalance >= bufferTarget - 1 && emergencyBalance < emergencyTarget) {
            const needed = emergencyTarget - emergencyBalance;
            const flow = Math.min(cashSurplus, needed);
            emergencyBalance += flow;
            cashSurplus -= flow;
        }

        // 3. Extra Payment Bucket
        if (bufferBalance >= bufferTarget - 1 && emergencyBalance >= emergencyTarget - 1) {
            extraBucket += cashSurplus;
            cashSurplus = 0;
        }
    } else {
        // Deficit! Drain resources
        let deficit = Math.abs(cashSurplus);
        
        // 1. Drain Extra Bucket
        if (extraBucket > 0) {
            const taken = Math.min(extraBucket, deficit);
            extraBucket -= taken;
            deficit -= taken;
        }

        // 2. Drain Deposito (if allowed to access?)
        if (deficit > 0 && deposito > 0) {
             const taken = Math.min(deposito, deficit);
             deposito -= taken;
             deficit -= taken;
        }

        // 3. Drain Emergency
        if (deficit > 0 && emergencyBalance > 0) {
            const taken = Math.min(emergencyBalance, deficit);
            emergencyBalance -= taken;
            deficit -= taken;
        }

        // 4. Drain Buffer
        if (deficit > 0 && bufferBalance > 0) {
             const taken = Math.min(bufferBalance, deficit);
             bufferBalance -= taken;
             deficit -= taken;
        }

        // 5. Still deficit? Default risk.
        if (deficit > 0) {
            events.push("CASHFLOW DEFICIT");
            riskLevel = 'HIGH';
        }
    }

    // Targets Met Logging
    if (bufferFullMonth === null && bufferBalance >= bufferTarget - 100) bufferFullMonth = m;
    if (emergencyFullMonth === null && emergencyBalance >= emergencyTarget - 100) emergencyFullMonth = m;

    // --- 6. Deposito Interest ---
    let monthlyDepositoInterest = 0;
    if (mortgage.useDeposito && extraBucket > 0) {
        monthlyDepositoInterest = extraBucket * (DEPOSITO_RATE / 100 / 12);
        extraBucket += monthlyDepositoInterest;
        accumulatedDepositoInterest += monthlyDepositoInterest;
    }

    // --- 7. Apply Extra Payment (Yearly, in January of next year) ---
    if (m > 0 && m % 12 === 0 && currentPrincipal > 0) {
        // Apply Extra Payment Logic
        // 1. Min Rule
        const minExtra = mortgage.extraPaymentMinMultiple * currentInstallment;
        let availableExtra = extraBucket;
        
        let amountToPay = 0;
        
        if (availableExtra >= minExtra) {
            amountToPay = availableExtra;
        } else if (availableExtra >= currentPrincipal) {
             amountToPay = availableExtra;
        }

        if (amountToPay > 0) {
             // 2. Penalty
             const penaltyAmt = amountToPay * (mortgage.penaltyPercent / 100);
             const effectivePrincipalReduction = amountToPay - penaltyAmt;
             
             // Cap at remaining principal
             const finalRed = Math.min(effectivePrincipalReduction, currentPrincipal);
             
             // Snapshot before
             const instBefore = currentInstallment;
             
             // Apply
             currentPrincipal -= finalRed;
             extraBucket -= amountToPay; // Empty bucket
             
             // 3. Recalculate Installment
             const remainingTermMonths = monthsRemaining; // Approx
             let newInst = calculatePMT(currentPrincipal, currentRate, remainingTermMonths);
             
             if (newInst > instBefore) newInst = instBefore; // Clamp
             
             currentInstallment = newInst;
             
             // Calculate Interest Saved
             // Formula: (OldTotalFuturePayment - OldTotalFuturePrincipal) - (NewTotalFuturePayment - NewTotalFuturePrincipal)
             // Simplified: (instBefore - newInst) * remainingTermMonths - finalRed
             // This represents the interest portion of the payments that we just eliminated.
             const interestSavedThisEvent = Math.max(0, (instBefore - newInst) * remainingTermMonths - finalRed);
             accumulatedInterestSaved += interestSavedThisEvent;

             // Log Year
             yearLogs.push({
                 year: currentYearIdx, 
                 extraPaymentPaid: amountToPay,
                 penaltyPaid: penaltyAmt,
                 principalReduced: finalRed,
                 installmentBefore: instBefore,
                 installmentAfter: newInst,
                 interestSaved: interestSavedThisEvent
             });
             
             events.push(`Extra Payment: ${formatMoney(amountToPay)}`);
        }
    }

    // Update Principal
    currentPrincipal -= principalPayment;
    accumulatedInterestPaid += interestPayment;
    monthsRemaining--;

    // Risk Analysis for current state
    // Liquidity Runway: (Buffer + Emergency + Extra) / Total Expenses
    const totalLiquid = bufferBalance + emergencyBalance + extraBucket + deposito;
    liquidityMonths = totalExpenses > 0 ? totalLiquid / totalExpenses : 999;
    
    if (liquidityMonths < 3) riskLevel = 'HIGH';
    else if (liquidityMonths < 6) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    logs.push({
        monthIndex: m,
        year: currentYearIdx + 2026,
        dateStr: new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        incomeBase: monthlyBase,
        incomeBonus: monthlyBonus,
        totalIncome,
        expensesMandatory: mandExpenses,
        expensesDiscretionary: discExpenses,
        totalExpenses,
        mortgagePaid: actualPayment,
        mortgageInterest: interestPayment,
        mortgagePrincipalPaid: principalPayment,
        mortgageBalance: currentPrincipal,
        mortgageRate: currentRate,
        netFlow,
        bufferBalance,
        emergencyBalance,
        extraPaymentBucket: extraBucket,
        depositoBalance: deposito,
        events,
        riskLevel,
        // New Logs
        depositoInterestEarned: monthlyDepositoInterest,
        cumulativeDepositoInterest: accumulatedDepositoInterest
    });

    if (currentPrincipal <= 1 && payoffDate === null) {
         payoffDate = logs[logs.length-1].dateStr;
    }
  }

  return {
      logs,
      yearLogs,
      summary: {
          monthsToFullBuffer: bufferFullMonth,
          monthsToFullEmergency: emergencyFullMonth,
          mortgagePayoffDate: payoffDate,
          totalInterestPaid: accumulatedInterestPaid,
          totalInterestSaved: accumulatedInterestSaved,
          liquidityRunwayMonths: liquidityMonths,
          riskLevel: riskLevel
      }
  };
};

const formatMoney = (n: number) => (n/1000000).toFixed(1) + 'M';
