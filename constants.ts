export const APP_NAME = "FinSim";

// Deprecated: INTEREST_SCHEDULE is now part of MortgageConfig.rates

export const DEPOSITO_RATE = 6.0; // 6% annual
export const BPJS_GROWTH_RATE = 5.7 / 12; // Monthly growth
export const UNEMPLOYMENT_START_MONTH = 18; // Default scenario: Unemployed after 1.5 years

// Default Initial Data
export const DEFAULT_EXPENSES = [
  { id: '1', name: 'Groceries', category: 'MANDATORY', amount: 4000000, annualIncreasePercent: 4 },
  { id: '2', name: 'Utilities', category: 'MANDATORY', amount: 1500000, annualIncreasePercent: 3 },
  { id: '3', name: 'Transport', category: 'MANDATORY', amount: 1000000, annualIncreasePercent: 3 },
  { id: '4', name: 'Entertainment', category: 'DISCRETIONARY', amount: 2000000, annualIncreasePercent: 2 },
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
  useDeposito: true,
  rates: [
    { id: '1', startMonth: 1, endMonth: 24, rate: 3.65 },
    { id: '2', startMonth: 25, endMonth: 60, rate: 7.65 },
    { id: '3', startMonth: 61, endMonth: 120, rate: 9.65 },
    { id: '4', startMonth: 121, endMonth: 360, rate: 11.00 },
  ]
};

export const DEFAULT_MACRO = {
  inflationRate: 4.0 // 4% Annual Inflation
};