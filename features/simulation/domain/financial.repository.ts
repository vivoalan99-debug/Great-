import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from './types';

export interface FinancialRepository {
  getExpenses(): Promise<Expense[]>;
  saveExpenses(expenses: Expense[]): Promise<void>;

  getIncome(): Promise<IncomeConfig>;
  saveIncome(income: IncomeConfig): Promise<void>;

  getMortgage(): Promise<MortgageConfig>;
  saveMortgage(mortgage: MortgageConfig): Promise<void>;

  getMacro(): Promise<MacroConfig>;
  saveMacro(macro: MacroConfig): Promise<void>;

  getScenario(): Promise<ScenarioType>;
  saveScenario(scenario: ScenarioType): Promise<void>;

  getRiskSettings(): Promise<RiskSettings>;
  saveRiskSettings(settings: RiskSettings): Promise<void>;
}