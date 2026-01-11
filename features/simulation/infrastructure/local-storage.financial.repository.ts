import { FinancialRepository } from '../domain/financial.repository';
import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../domain/types';
import { DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_MORTGAGE, DEFAULT_MACRO, DEFAULT_RISK_SETTINGS } from '../../../constants';

const KEYS = {
  EXPENSES: 'finsim_expenses',
  INCOME: 'finsim_income',
  MORTGAGE: 'finsim_mortgage',
  MACRO: 'finsim_macro',
  SCENARIO: 'finsim_scenario',
  RISK: 'finsim_risk'
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class LocalStorageFinancialRepository implements FinancialRepository {
  
  async getExpenses(): Promise<Expense[]> {
    await delay(50); // Small artificial delay
    const data = localStorage.getItem(KEYS.EXPENSES);
    return data ? JSON.parse(data) : DEFAULT_EXPENSES;
  }
  async saveExpenses(expenses: Expense[]): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  }

  async getIncome(): Promise<IncomeConfig> {
    await delay(50);
    const data = localStorage.getItem(KEYS.INCOME);
    return data ? JSON.parse(data) : DEFAULT_INCOME;
  }
  async saveIncome(income: IncomeConfig): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.INCOME, JSON.stringify(income));
  }

  async getMortgage(): Promise<MortgageConfig> {
    await delay(50);
    const data = localStorage.getItem(KEYS.MORTGAGE);
    return data ? JSON.parse(data) : DEFAULT_MORTGAGE;
  }
  async saveMortgage(mortgage: MortgageConfig): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.MORTGAGE, JSON.stringify(mortgage));
  }

  async getMacro(): Promise<MacroConfig> {
    await delay(50);
    const data = localStorage.getItem(KEYS.MACRO);
    return data ? JSON.parse(data) : DEFAULT_MACRO;
  }
  async saveMacro(macro: MacroConfig): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.MACRO, JSON.stringify(macro));
  }

  async getScenario(): Promise<ScenarioType> {
    await delay(50);
    const data = localStorage.getItem(KEYS.SCENARIO);
    return data ? (data as ScenarioType) : ScenarioType.NORMAL;
  }
  async saveScenario(scenario: ScenarioType): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.SCENARIO, scenario);
  }

  async getRiskSettings(): Promise<RiskSettings> {
    await delay(50);
    const data = localStorage.getItem(KEYS.RISK);
    return data ? JSON.parse(data) : DEFAULT_RISK_SETTINGS;
  }
  async saveRiskSettings(settings: RiskSettings): Promise<void> {
    await delay(50);
    localStorage.setItem(KEYS.RISK, JSON.stringify(settings));
  }
}