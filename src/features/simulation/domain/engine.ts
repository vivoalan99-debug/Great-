import { 
  Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, 
  SimulationResult, MonthLog, YearLog, InterestRateTier, RiskSettings
} from '../../../types';
import { DEPOSITO_RATE, BPJS_GROWTH_RATE } from '../../../constants';
import { calculatePMT } from '../../../services/mathUtils';

// Helper: Simple money formatter for logs (M notation)
const formatMoney = (n: number) => (n/1000000).toFixed(2) + 'M';

// Helper: Get Rate for a specific month (1-based index)
const getRateForMonth = (monthIndex: number, rates: InterestRateTier[]): number => {
  const currentMonthNum = monthIndex + 1;
  const tier = rates.find(r => currentMonthNum >= r.startMonth && currentMonthNum <= r.endMonth);
  // Fallback to the last defined rate or a default high rate if configuration is missing
  if (!tier) {
      if (rates.length > 0) return rates[rates.length - 1].rate;
      return 12.0;
  }
  return tier.rate;
};

// Helper: Calculate month difference between two ISO strings with safety check
const getMonthDiff = (startDateStr: string, targetDateStr: string) => {
    if (!startDateStr || !targetDateStr) return -1;
    const start = new Date(startDateStr);
    const target = new Date(targetDateStr);
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return -1;
    return (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
};

export const runSimulation = (
  expenses: Expense[],
  income: IncomeConfig,
  mortgage: MortgageConfig,
  macro: MacroConfig,
  scenario: ScenarioType,
  riskSettings: RiskSettings
): SimulationResult => {
  
  const startDate = new Date(mortgage.startDate);
  const maxMonths = 20 * 12; 
  const logs: MonthLog[] = [];
  const yearLogs: YearLog[] = [];
  
  // -- Determine Critical Risk Indices --
  const jobLossMonthIndex = scenario !== ScenarioType.NORMAL 
        ? getMonthDiff(mortgage.startDate, riskSettings.jobLossDate)
        : -1;
  
  const notificationMonthIndex = scenario !== ScenarioType.NORMAL 
        ? getMonthDiff(mortgage.startDate, riskSettings.notificationDate)
        : -1;

  // -- Initial State --
  let currentPrincipal = mortgage.principal;
  let monthsRemaining = mortgage.tenureYears * 12;
  
  // -- Baseline State (Shadow tracking) --
  let baselinePrincipal = mortgage.principal;
  let baselineInstallment = 0; 

  const initialRate = getRateForMonth(0, mortgage.rates);
  let currentInstallment = calculatePMT(currentPrincipal, initialRate, monthsRemaining);
  baselineInstallment = currentInstallment; 
  const initialInstallment = currentInstallment;

  let bufferBalance = 0;
  let emergencyBalance = 0;
  let extraBucket = 0;
  let deposito = 0;
  let bpjs = income.bpjsInitialBalance;
  
  let accumulatedInterestPaid = 0;
  let accumulatedInterestSaved = 0;
  let accumulatedDepositoInterest = 0;

  // Initialize Employment Status
  // If job loss date is invalid (-1) or in past, and we are in a risk scenario, start as unemployed
  let isEmployed = true;
  if (scenario !== ScenarioType.NORMAL && jobLossMonthIndex < 0) {
      isEmployed = false;
  }

  // If notification is invalid (-1) but job loss is valid, assume we are notified immediately (Survival Mode)
  let inSurvivalMode = false;
  if (scenario !== ScenarioType.NORMAL && notificationMonthIndex < 0 && jobLossMonthIndex >= 0) {
      inSurvivalMode = true;
  }

  // Track logic
  let bufferFullMonth: number | null = null;
  let emergencyFullMonth: number | null = null;
  let payoffDate: string | null = null;
  
  // Risk Analysis Trackers
  let lowestLiquidity = 999;
  let hasBankruptcy = false;
  let bankruptcyMonthIndex: number | null = null;
  let bankruptcyDateStr = '';
  
  let maxRiskSeverity = 0;
  let maxRiskReason = 'Financial plan is robust.';

  for (let m = 0; m < maxMonths; m++) {
    const currentYearIdx = Math.floor(m / 12);
    const monthInYear = m % 12;
    // Calculate date safely
    const currentMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
    const dateStr = !isNaN(currentMonthDate.getTime()) 
        ? currentMonthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : `Month ${m}`;
    
    // Auto-Payoff for Dust
    if (currentPrincipal > 0 && currentPrincipal < 10000) currentPrincipal = 0;
    if (currentPrincipal <= 0 && payoffDate === null) {
      currentPrincipal = 0;
      currentInstallment = 0;
      payoffDate = currentMonthDate.toISOString();
    }

    // Rate Determination
    const previousRate = m > 0 ? getRateForMonth(m - 1, mortgage.rates) : initialRate;
    const currentRate = getRateForMonth(m, mortgage.rates);
    const monthlyRate = currentRate / 100 / 12;
    const principalStart = currentPrincipal;

    // --- 0. Status Check (Employment & Knowledge) ---
    const events: string[] = [];
    
    // Start "Hoarding" / Survival Mode if we know we are losing the job
    if (jobLossMonthIndex >= 0 && m >= notificationMonthIndex && m < jobLossMonthIndex && notificationMonthIndex !== -1) {
        if (!inSurvivalMode) {
            inSurvivalMode = true;
            events.push('Notice Received: Survival Mode');
        }
    }

    // Job Loss Event
    if (m === jobLossMonthIndex) {
        isEmployed = false;
        events.push('Job Loss Event');
    }

    // --- 1. Income ---
    let monthlyBase = 0;
    let monthlyBonus = 0;

    // Salary Growth
    const salaryMultiplier = Math.pow(1 + income.annualIncreasePercent / 100, currentYearIdx);
    const currentBaseSalary = income.baseSalary * salaryMultiplier;

    if (isEmployed) {
         monthlyBase = currentBaseSalary;
         
         // THR
         if (income.thrMonths.includes(monthInYear)) {
             monthlyBonus += currentBaseSalary;
             events.push('THR');
         }
         // Compensation
         if (income.compensationMonths.includes(monthInYear)) {
             monthlyBonus += currentBaseSalary;
             events.push('Compensation');
         }
         // BPJS Growth
         bpjs += bpjs * (BPJS_GROWTH_RATE / 100) + (currentBaseSalary * 0.057);
    } else {
        // UNEMPLOYED
        monthlyBase = 0;

        // Severance Payout (On the month of job loss)
        if (m === jobLossMonthIndex) {
            const severance = currentBaseSalary * 1.0; 
            monthlyBonus += severance;
            events.push(`Severance Paid (+${formatMoney(severance)})`);
        }

        // BPJS Claim (1 Month AFTER job loss)
        if (m === jobLossMonthIndex + 1 && bpjs > 0) {
            monthlyBonus += bpjs;
            events.push(`BPJS Liquidated (+${formatMoney(bpjs)})`);
            bpjs = 0;
        }
    }

    const totalIncome = monthlyBase + monthlyBonus;

    // --- 2. Expenses ---
    let mandExpenses = 0;
    let discExpenses = 0;

    expenses.forEach(e => {
        const effectiveRate = Math.max(macro.inflationRate, e.annualIncreasePercent);
        const itemInflated = e.amount * Math.pow(1 + effectiveRate/100, currentYearIdx);
        if (e.category === 'MANDATORY') mandExpenses += itemInflated;
        else discExpenses += itemInflated;
    });

    // AUSTERITY LOGIC
    if (!isEmployed || inSurvivalMode) {
        const multiplier = scenario === ScenarioType.WORST_CASE ? 0 : 0.5;
        discExpenses *= multiplier;
        if (!events.includes('Austerity')) events.push('Austerity');
    }

    const totalExpenses = mandExpenses + discExpenses;

    // --- 3. Mortgage ---
    let interestPayment = 0;
    let principalPayment = 0;
    let actualPayment = 0;
    const installmentBeforeUpdate = currentInstallment;

    // A. Baseline Shadow
    if (baselinePrincipal > 0) {
        const blPrevRate = m > 0 ? getRateForMonth(m - 1, mortgage.rates) : initialRate;
        const blCurrRate = getRateForMonth(m, mortgage.rates);
        if (blCurrRate !== blPrevRate && m > 0) {
            baselineInstallment = calculatePMT(baselinePrincipal, blCurrRate, monthsRemaining);
        }
        const blInterest = baselinePrincipal * monthlyRate;
        const blPayment = Math.min(baselineInstallment, baselinePrincipal + blInterest);
        baselinePrincipal -= (blPayment - blInterest);
    }

    // B. Actual
    if (currentPrincipal > 0) {
        interestPayment = currentPrincipal * monthlyRate;
        
        if (currentRate !== previousRate && m > 0) {
           currentInstallment = calculatePMT(currentPrincipal, currentRate, monthsRemaining);
           events.push(`Rate: ${currentRate}%`);
        }

        actualPayment = Math.min(currentInstallment, currentPrincipal + interestPayment);
        principalPayment = actualPayment - interestPayment;
    }

    currentPrincipal -= principalPayment;
    accumulatedInterestPaid += interestPayment;
    const principalAfterRegular = currentPrincipal;

    // --- 4. Net Flow ---
    let netFlow = totalIncome - totalExpenses - actualPayment;
    let cashSurplus = netFlow;

    // --- 5. Allocation / Withdrawal ---
    // Targets
    const M_avg = initialInstallment;
    const E = totalExpenses; 
    const bufferTarget = 3 * E + 1 * M_avg;
    const emergencyTarget = 6 * E + 6 * M_avg;

    if (cashSurplus > 0) {
        // Accumulation Priority: Buffer -> Emergency -> Deposito
        if (bufferBalance < bufferTarget) {
            const flow = Math.min(cashSurplus, bufferTarget - bufferBalance);
            bufferBalance += flow;
            cashSurplus -= flow;
        }
        if (bufferBalance >= bufferTarget - 1 && emergencyBalance < emergencyTarget) {
            const flow = Math.min(cashSurplus, emergencyTarget - emergencyBalance);
            emergencyBalance += flow;
            cashSurplus -= flow;
        }
        if (cashSurplus > 0) {
            extraBucket += cashSurplus;
            cashSurplus = 0;
        }
    } else {
        // Deficit / Withdrawal Priority: Extra Bucket -> Deposito -> Emergency -> Buffer
        let deficit = Math.abs(cashSurplus);
        
        const draw = (amount: number, source: number): [number, number] => {
            const taken = Math.min(amount, source);
            return [taken, source - taken];
        };

        if (extraBucket > 0) {
            const [taken, rem] = draw(deficit, extraBucket);
            extraBucket = rem; deficit -= taken;
        }
        if (deficit > 0 && deposito > 0) {
             const [taken, rem] = draw(deficit, deposito);
             deposito = rem; deficit -= taken;
        }
        if (deficit > 0 && emergencyBalance > 0) {
            const [taken, rem] = draw(deficit, emergencyBalance);
            emergencyBalance = rem; deficit -= taken;
        }
        if (deficit > 0 && bufferBalance > 0) {
             const [taken, rem] = draw(deficit, bufferBalance);
             bufferBalance = rem; deficit -= taken;
        }
        
        if (deficit > 0.01) {
            events.push("INSOLVENT");
            if (!hasBankruptcy) {
                hasBankruptcy = true;
                bankruptcyMonthIndex = m;
                bankruptcyDateStr = dateStr;
            }
        }
    }

    if (bufferFullMonth === null && bufferBalance >= bufferTarget - 100) bufferFullMonth = m;
    if (emergencyFullMonth === null && emergencyBalance >= emergencyTarget - 100) emergencyFullMonth = m;

    // --- 6. Deposito Interest ---
    let monthlyDepositoInterest = 0;
    if (mortgage.useDeposito && extraBucket > 0) {
        monthlyDepositoInterest = extraBucket * (DEPOSITO_RATE / 100 / 12);
        extraBucket += monthlyDepositoInterest;
        accumulatedDepositoInterest += monthlyDepositoInterest;
    }

    // --- 7. Extra Payment Logic ---
    let extraPaymentMade = 0;
    if (m > 0 && m % 12 === 0 && currentPrincipal > 0 && isEmployed && !inSurvivalMode) {
        const minExtra = mortgage.extraPaymentMinMultiple * currentInstallment;
        if (extraBucket >= minExtra) {
            const amountToPay = extraBucket; 
            const penaltyAmt = amountToPay * (mortgage.penaltyPercent / 100);
            const finalRed = Math.min(amountToPay - penaltyAmt, currentPrincipal);
            
            const instBefore = currentInstallment;
            currentPrincipal -= finalRed;
            extraBucket -= amountToPay;
            extraPaymentMade = amountToPay;

            let newInst = calculatePMT(currentPrincipal, currentRate, monthsRemaining - 1);
            if (newInst > instBefore) newInst = instBefore; 
            currentInstallment = newInst;

            const intSaved = Math.max(0, (instBefore - newInst) * (monthsRemaining - 1) - finalRed);
            accumulatedInterestSaved += intSaved;

            yearLogs.push({
                year: currentYearIdx, 
                extraPaymentPaid: amountToPay,
                penaltyPaid: penaltyAmt,
                principalReduced: finalRed,
                installmentBefore: instBefore,
                installmentAfter: newInst,
                interestSaved: intSaved
            });
            events.push(`Extra Pmt: ${formatMoney(amountToPay)}`);
        }
    }

    monthsRemaining--;

    // --- Risk Analysis ---
    const totalLiquid = bufferBalance + emergencyBalance + extraBucket + deposito;
    const monthlyBurnRate = totalExpenses + (currentPrincipal > 0 ? currentInstallment : 0);
    const liquidityMonths = monthlyBurnRate > 0 ? totalLiquid / monthlyBurnRate : 999;
    
    // Lowest Liquidity Tracking:
    if (m >= notificationMonthIndex || notificationMonthIndex === -1) {
        if (liquidityMonths < lowestLiquidity) lowestLiquidity = liquidityMonths;
    }

    // Risk Level Classification
    let monthlyRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let reason = '';

    if (hasBankruptcy) {
        monthlyRisk = 'HIGH';
        reason = `Bankrupt`;
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
             if (liquidityMonths < 1 && m > 6) { 
                 monthlyRisk = 'MEDIUM'; 
                 reason = 'Fragile (Buffer < 1mo)'; 
             }
        }
    }

    const severity = monthlyRisk === 'HIGH' ? 2 : monthlyRisk === 'MEDIUM' ? 1 : 0;
    if (severity > maxRiskSeverity) {
        maxRiskSeverity = severity;
        maxRiskReason = reason;
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
        cumulativeDepositoInterest: accumulatedDepositoInterest,
        principalStart,
        principalAfterRegular,
        extraPaymentMade,
        installmentCurrent: installmentBeforeUpdate,
        installmentNext: currentInstallment
    });

    if (currentPrincipal <= 1 && payoffDate === null) {
         payoffDate = logs[logs.length-1].dateStr;
    }
  }

  // Final Summary Logic
  let finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (hasBankruptcy) finalRiskLevel = 'HIGH';
  else if (maxRiskSeverity === 2) finalRiskLevel = 'HIGH';
  else if (maxRiskSeverity === 1) finalRiskLevel = 'MEDIUM';

  let maxJobSearchMonths: number | null = null;
  if (jobLossMonthIndex !== -1 && jobLossMonthIndex < maxMonths) {
      if (hasBankruptcy && bankruptcyMonthIndex !== null) {
          maxJobSearchMonths = Math.max(0, bankruptcyMonthIndex - jobLossMonthIndex);
      } else {
          maxJobSearchMonths = maxMonths - jobLossMonthIndex; 
      }
  }

  const purchasingPowerLoss = (Math.pow(1 + macro.inflationRate/100, 20) - 1) * 100;
  
  let finalReason = maxRiskReason;
  if (scenario !== ScenarioType.NORMAL && maxJobSearchMonths !== null) {
      if (hasBankruptcy) {
          finalReason = `Insolvency ${maxJobSearchMonths} months after job loss.`;
      } else {
          finalReason = `Survived >${maxJobSearchMonths} months without job.`;
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
          liquidityRunwayMonths: logs[logs.length-1].bufferBalance > 0 ? 99 : 0, 
          lowestLiquidityMonths: lowestLiquidity,
          riskLevel: finalRiskLevel,
          riskReason: finalReason,
          purchasingPowerLoss,
          maxJobSearchMonths,
          bankruptcyDate: bankruptcyDateStr || null
      }
  };
};
