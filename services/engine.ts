import { 
  Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, 
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
  macro: MacroConfig,
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

  // Track logic
  let bufferFullMonth: number | null = null;
  let emergencyFullMonth: number | null = null;
  let payoffDate: string | null = null;
  
  // Risk Analysis Trackers
  let lowestLiquidity = 999;
  let lowestLiquidityMonth = '';
  let hasBankruptcy = false;
  let bankruptcyDate = '';
  
  // We'll track the "worst" risk level encountered
  let maxRiskSeverity = 0; // 0=Low, 1=Med, 2=High
  let maxRiskReason = 'Financial plan is robust.';

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

    // --- 2. Expenses with Inflation Impact ---
    // Rule: Use the higher of Global Inflation or the specific expense increase rate
    // This allows granular overrides for high-inflation items (like Education)
    // while ensuring everything else scales with the Macro setting.
    
    let mandExpenses = 0;
    let discExpenses = 0;

    expenses.forEach(e => {
        // Determine effective growth rate for this item
        const effectiveRate = Math.max(macro.inflationRate, e.annualIncreasePercent);
        
        const itemInflated = e.amount * Math.pow(1 + effectiveRate/100, currentYearIdx);
        
        if (e.category === 'MANDATORY') mandExpenses += itemInflated;
        else discExpenses += itemInflated;
    });

    if (!isEmployed && scenario === ScenarioType.WORST_CASE) {
        discExpenses *= 0.5;
        if (!events.includes('Expenses Cut')) events.push('Expenses Cut');
    }

    const totalExpenses = mandExpenses + discExpenses;

    // --- 3. Mortgage Payment ---
    let interestPayment = 0;
    let principalPayment = 0;
    let actualPayment = 0;

    if (currentPrincipal > 0) {
        interestPayment = currentPrincipal * monthlyRate;
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
    // Inflation Adjustment: Targets should technically grow with inflation/salary, 
    // but often people keep the fixed amount target. 
    // For this engine, we will scale the targets based on CURRENT expense levels (which include inflation).
    const M_avg = initialInstallment; // Mortgage doesn't inflate
    const E = totalExpenses; 
    const bufferTarget = 3 * E + 1 * M_avg;
    const emergencyTarget = 12 * E + 12 * M_avg;

    // --- 5. Net Flow & Allocation ---
    let netFlow = totalIncome - totalExpenses - actualPayment;
    let cashSurplus = netFlow;

    if (cashSurplus > 0) {
        if (bufferBalance < bufferTarget) {
            const needed = bufferTarget - bufferBalance;
            const flow = Math.min(cashSurplus, needed);
            bufferBalance += flow;
            cashSurplus -= flow;
        }
        if (bufferBalance >= bufferTarget - 1 && emergencyBalance < emergencyTarget) {
            const needed = emergencyTarget - emergencyBalance;
            const flow = Math.min(cashSurplus, needed);
            emergencyBalance += flow;
            cashSurplus -= flow;
        }
        if (bufferBalance >= bufferTarget - 1 && emergencyBalance >= emergencyTarget - 1) {
            extraBucket += cashSurplus;
            cashSurplus = 0;
        }
    } else {
        let deficit = Math.abs(cashSurplus);
        
        if (extraBucket > 0) {
            const taken = Math.min(extraBucket, deficit);
            extraBucket -= taken;
            deficit -= taken;
        }
        if (deficit > 0 && deposito > 0) {
             const taken = Math.min(deposito, deficit);
             deposito -= taken;
             deficit -= taken;
        }
        if (deficit > 0 && emergencyBalance > 0) {
            const taken = Math.min(emergencyBalance, deficit);
            emergencyBalance -= taken;
            deficit -= taken;
        }
        if (deficit > 0 && bufferBalance > 0) {
             const taken = Math.min(bufferBalance, deficit);
             bufferBalance -= taken;
             deficit -= taken;
        }
        if (deficit > 0) {
            events.push("CASHFLOW DEFICIT");
            if (!hasBankruptcy) {
                hasBankruptcy = true;
                bankruptcyDate = new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
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

    // --- 7. Extra Payment ---
    if (m > 0 && m % 12 === 0 && currentPrincipal > 0) {
        const minExtra = mortgage.extraPaymentMinMultiple * currentInstallment;
        let availableExtra = extraBucket;
        let amountToPay = 0;
        
        if (availableExtra >= minExtra) {
            amountToPay = availableExtra;
        } else if (availableExtra >= currentPrincipal) {
             amountToPay = availableExtra;
        }

        if (amountToPay > 0) {
             const penaltyAmt = amountToPay * (mortgage.penaltyPercent / 100);
             const effectivePrincipalReduction = amountToPay - penaltyAmt;
             const finalRed = Math.min(effectivePrincipalReduction, currentPrincipal);
             const instBefore = currentInstallment;
             
             currentPrincipal -= finalRed;
             extraBucket -= amountToPay; 
             
             const remainingTermMonths = monthsRemaining; 
             let newInst = calculatePMT(currentPrincipal, currentRate, remainingTermMonths);
             if (newInst > instBefore) newInst = instBefore; 
             currentInstallment = newInst;
             
             const interestSavedThisEvent = Math.max(0, (instBefore - newInst) * remainingTermMonths - finalRed);
             accumulatedInterestSaved += interestSavedThisEvent;

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

    // --- Risk Analyst (Per Month) ---
    const totalLiquid = bufferBalance + emergencyBalance + extraBucket + deposito;
    const liquidityMonths = totalExpenses > 0 ? totalLiquid / totalExpenses : 999;
    const dateStr = new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Update global Lowest
    if (liquidityMonths < lowestLiquidity) {
        lowestLiquidity = liquidityMonths;
        lowestLiquidityMonth = dateStr;
    }

    // Assess Current Risk Level
    let monthlyRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let reason = '';

    // Check for Deficit first
    if (netFlow < 0 && totalLiquid <= 0 && Math.abs(netFlow) > 0.01) {
        // Actually run out of money
        monthlyRisk = 'HIGH';
        reason = 'Insolvency (Bankruptcy)';
    } else {
        if (!isEmployed) {
            if (liquidityMonths < 3) { monthlyRisk = 'HIGH'; reason = 'Runway < 3mo (Unemployed)'; }
            else if (liquidityMonths < 6) { monthlyRisk = 'MEDIUM'; reason = 'Runway < 6mo (Unemployed)'; }
        } else {
            // Employed
            if (liquidityMonths < 1) { monthlyRisk = 'HIGH'; reason = 'Runway < 1mo'; }
            else if (liquidityMonths < 3) { monthlyRisk = 'MEDIUM'; reason = 'Runway < 3mo'; }
            
            // NEW: Inflation/Stagflation Risk Check
            // If inflation is higher than salary growth, purchasing power erodes, leading to long term risk
            if (macro.inflationRate > income.annualIncreasePercent + 1) {
                // If expenses have grown to be > 80% of income due to inflation
                const dti = totalExpenses / totalIncome;
                if (dti > 0.9) {
                     monthlyRisk = 'HIGH';
                     reason = 'Stagflation: Costs overtaking Income';
                } else if (monthlyRisk === 'LOW') {
                    // Downgrade to Medium purely due to macroeconomic squeeze
                    monthlyRisk = 'MEDIUM';
                    reason = 'High Inflation Erosion';
                }
            }
        }
    }

    // Update Global Max Risk
    const severity = monthlyRisk === 'HIGH' ? 2 : monthlyRisk === 'MEDIUM' ? 1 : 0;
    if (severity > maxRiskSeverity) {
        maxRiskSeverity = severity;
        maxRiskReason = reason + ` at ${dateStr}`;
    } else if (severity === maxRiskSeverity && monthlyRisk === 'HIGH' && hasBankruptcy) {
        // Bankruptcy trumps other highs
         maxRiskReason = `Bankruptcy at ${bankruptcyDate}`;
    }

    logs.push({
        monthIndex: m,
        year: currentYearIdx + 2026,
        dateStr,
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
        riskLevel: monthlyRisk,
        depositoInterestEarned: monthlyDepositoInterest,
        cumulativeDepositoInterest: accumulatedDepositoInterest
    });

    if (currentPrincipal <= 1 && payoffDate === null) {
         payoffDate = logs[logs.length-1].dateStr;
    }
  }

  // --- Final Summary Risk Logic ---
  let finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  
  if (hasBankruptcy) {
      finalRiskLevel = 'HIGH';
      maxRiskReason = `Bankruptcy occurred in ${bankruptcyDate}`;
  } else if (maxRiskSeverity === 2) {
      finalRiskLevel = 'HIGH';
      // maxRiskReason already set
  } else if (maxRiskSeverity === 1) {
      finalRiskLevel = 'MEDIUM';
  }

  // Purchasing Power Impact
  // Compare initial expense vs expense at year 20 with just the inflation applied
  const purchasingPowerLoss = (Math.pow(1 + macro.inflationRate/100, 20) - 1) * 100;

  return {
      logs,
      yearLogs,
      summary: {
          monthsToFullBuffer: bufferFullMonth,
          monthsToFullEmergency: emergencyFullMonth,
          mortgagePayoffDate: payoffDate,
          totalInterestPaid: accumulatedInterestPaid,
          totalInterestSaved: accumulatedInterestSaved,
          liquidityRunwayMonths: logs[logs.length - 1].bufferBalance > 0 ? logs[logs.length - 1].bufferBalance / logs[logs.length - 1].totalExpenses : 0, // Approx final
          lowestLiquidityMonths: lowestLiquidity,
          riskLevel: finalRiskLevel,
          riskReason: maxRiskReason,
          purchasingPowerLoss
      }
  };
};

const formatMoney = (n: number) => (n/1000000).toFixed(1) + 'M';