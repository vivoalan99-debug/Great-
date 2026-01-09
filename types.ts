export enum ScenarioType {
  NORMAL = 'NORMAL',
  UNEMPLOYED = 'UNEMPLOYED',
  WORST_CASE = 'WORST_CASE'
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
  thrMonths: number[]; // e.g. [2] for March (0-indexed)
  compensationMonths: number[]; // e.g. [3] for April
  bpjsInitialBalance: number;
}

export interface MortgageConfig {
  principal: number;
  startDate: string; // ISO Date
  tenureYears: number;
  penaltyPercent: number; // e.g. 1 for 1%
  extraPaymentMinMultiple: number; // 6x rule
  useDeposito: boolean;
}

export interface SimulationState {
  currentMonth: number; // 0 to TotalMonths
  cash: number;
  bufferFund: number;
  emergencyFund: number;
  extraPaymentBucket: number;
  depositoBalance: number;
  
  mortgagePrincipal: number;
  mortgageInstallment: number;
  mortgageTermRemaining: number;
  
  isEmployed: boolean;
  bpjsBalance: number;
}

export interface MonthLog {
  monthIndex: number;
  dateStr: string;
  year: number;
  
  incomeBase: number;
  incomeBonus: number; // THR/Compensation
  totalIncome: number;
  
  expensesMandatory: number;
  expensesDiscretionary: number;
  totalExpenses: number;
  
  mortgagePaid: number;
  mortgageInterest: number;
  mortgagePrincipalPaid: number;
  mortgageBalance: number;
  mortgageRate: number;
  
  netFlow: number;
  
  bufferBalance: number;
  emergencyBalance: number;
  extraPaymentBucket: number;
  depositoBalance: number;
  
  events: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // New fields for Deposito tracking
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
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}