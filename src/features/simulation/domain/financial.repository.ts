import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../../../types';

export interface FinancialRepository {
  getExpenses(): Promise<Expense[]> | Expense[];
  saveExpenses(expenses: Expense[]): Promise<void> | void;

  getIncome(): Promise<IncomeConfig> | IncomeConfig;
  saveIncome(income: IncomeConfig): Promise<void> | void;

  getMortgage(): Promise<MortgageConfig> | MortgageConfig;
  saveMortgage(mortgage: MortgageConfig): Promise<void> | void;

  getMacro(): Promise<MacroConfig> | MacroConfig;
  saveMacro(macro: MacroConfig): Promise<void> | void;

  getScenario(): Promise<ScenarioType> | ScenarioType;
  saveScenario(scenario: ScenarioType): Promise<void> | void;

  getRiskSettings(): Promise<RiskSettings> | RiskSettings;
  saveRiskSettings(settings: RiskSettings): Promise<void> | void;
}
