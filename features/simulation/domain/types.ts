
export enum ScenarioType {
  NORMAL = 'NORMAL',
  UNEMPLOYED = 'UNEMPLOYED',
  WORST_CASE = 'WORST_CASE'
}

export interface MacroConfig {
  inflationRate: number;
}

export interface RiskSettings {
  jobLossDate: string;
  notificationDate: string;
}

export interface Expense {
  id: string;
  name: string;
  category: 'MANDATORY' | 'DISCRETIONARY';
  amount: number;
  annualIncreasePercent: number;
}

export interface IncomeConfig {
  baseSalary: number;
  annualIncreasePercent: number;
  thrMonths: number[];
  compensationMonths: number[];
  bpjsInitialBalance: number;
}

export interface InterestRateTier {
  id: string;
  startMonth: number;
  endMonth: number;
  rate: number;
}

export interface MortgageConfig {
  principal: number;
  startDate: string;
  tenureYears: number;
  penaltyPercent: number;
  extraPaymentMinMultiple: number;
  useDeposito: boolean;
  rates: InterestRateTier[];
}

export interface MonthLog {
  monthIndex: number;
  dateStr: string;
  year: number;
  incomeBase: number;
  incomeBonus: number;
  totalIncome: number;
  expensesMandatory: number;
  expensesDiscretionary: number;
  totalExpenses: number;
  mortgagePaid: number;
  mortgageInterest: number;
  mortgagePrincipalPaid: number;
  mortgageBalance: number;
  mortgageRate: number;
  principalStart: number;
  principalAfterRegular: number;
  extraPaymentMade: number;
  installmentBaseline: number;
  installmentCurrent: number;
  installmentNext: number;
  netFlow: number;
  bufferBalance: number;
  emergencyBalance: number;
  extraPaymentBucket: number;
  depositoBalance: number;
  events: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  depositoInterestEarned: number;
  cumulativeDepositoInterest: number;
}

export interface YearLog {
  year: number;
  extraPaymentPaid: number;
  penaltyPaid: number;
  interestSaved: number;
  installmentBefore: number;
  installmentAfter: number;
  principalReduced: number;
}

// NEW: Structured data for the Comparison/Impact Analysis
export interface StrategySnapshot {
    totalAssetInterest: number;
    totalMortgageInterestPaid: number;
    payoffDateStr: string | null;
    payoffMonthIndex: number;
}

export interface ImpactAnalysis {
    cashStrategy: StrategySnapshot;
    depositoStrategy: StrategySnapshot;
    netBenefit: number;
    monthsSaved: number;
    isPayoffAchievedFaster: boolean;
}

export interface SimulationResult {
  logs: MonthLog[];
  yearLogs: YearLog[];
  summary: {
    monthsToFullBuffer: number | null;
    monthsToFullEmergency: number | null;
    mortgagePayoffDate: string | null;
    totalInterestPaid: number;
    totalInterestSaved: number;
    liquidityRunwayMonths: number;
    lowestLiquidityMonths: number; 
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskReason: string; 
    purchasingPowerLoss: number; 
    maxJobSearchMonths: number | null;
    bankruptcyDate: string | null;
  };
  // Pre-calculated comparison data
  impactAnalysis: ImpactAnalysis;
}
