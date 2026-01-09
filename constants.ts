export const APP_NAME = "FinSim";

// Interest Rate Schedule based on loan year (1-based)
export const INTEREST_SCHEDULE = [
  { startYear: 1, endYear: 3, rate: 3.65 },
  { startYear: 4, endYear: 6, rate: 7.65 },
  { startYear: 7, endYear: 10, rate: 9.65 },
  { startYear: 11, endYear: 20, rate: 10.65 },
  { startYear: 21, endYear: 99, rate: 12.00 } // Fallback
];

export const DEPOSITO_RATE = 6.0; // 6% annual
export const BPJS_GROWTH_RATE = 5.7 / 12; // Monthly growth
export const UNEMPLOYMENT_START_MONTH = 18; // Default scenario: Unemployed after 1.5 years

// Default Initial Data
export const DEFAULT_EXPENSES = [
  { id: '1', name: 'Groceries', category: 'MANDATORY', amount: 4000000, annualIncreasePercent: 5 },
  { id: '2', name: 'Utilities', category: 'MANDATORY', amount: 1500000, annualIncreasePercent: 3 },
  { id: '3', name: 'Transport', category: 'MANDATORY', amount: 1000000, annualIncreasePercent: 2 },
  { id: '4', name: 'Entertainment', category: 'DISCRETIONARY', amount: 2000000, annualIncreasePercent: 0 },
];

export const DEFAULT_INCOME = {
  baseSalary: 25000000,
  annualIncreasePercent: 5,
  thrMonths: [2], // March (0-indexed)
  compensationMonths: [3], // April
  bpjsInitialBalance: 15000000
};

export const DEFAULT_MORTGAGE = {
  principal: 800000000,
  startDate: '2026-01-01',
  tenureYears: 15,
  penaltyPercent: 1.0,
  extraPaymentMinMultiple: 6,
  useDeposito: true
};