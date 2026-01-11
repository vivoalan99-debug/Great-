import { FinancialRepository } from '../domain/financial.repository';
import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../domain/types';
import { DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_MORTGAGE, DEFAULT_MACRO, DEFAULT_RISK_SETTINGS } from '../../../constants';

export class InMemoryFinancialRepository implements FinancialRepository {
  private _expenses: Expense[] = [...DEFAULT_EXPENSES];
  private _income: IncomeConfig = { ...DEFAULT_INCOME };
  private _mortgage: MortgageConfig = { ...DEFAULT_MORTGAGE };
  private _macro: MacroConfig = { ...DEFAULT_MACRO };
  private _scenario: ScenarioType = ScenarioType.NORMAL;
  private _riskSettings: RiskSettings = { ...DEFAULT_RISK_SETTINGS };

  async getExpenses(): Promise<Expense[]> { return [...this._expenses]; }
  async saveExpenses(expenses: Expense[]): Promise<void> { this._expenses = [...expenses]; }

  async getIncome(): Promise<IncomeConfig> { return { ...this._income }; }
  async saveIncome(income: IncomeConfig): Promise<void> { this._income = { ...income }; }

  async getMortgage(): Promise<MortgageConfig> { return { ...this._mortgage }; }
  async saveMortgage(mortgage: MortgageConfig): Promise<void> { this._mortgage = { ...mortgage }; }

  async getMacro(): Promise<MacroConfig> { return { ...this._macro }; }
  async saveMacro(macro: MacroConfig): Promise<void> { this._macro = { ...macro }; }

  async getScenario(): Promise<ScenarioType> { return this._scenario; }
  async saveScenario(scenario: ScenarioType): Promise<void> { this._scenario = scenario; }

  async getRiskSettings(): Promise<RiskSettings> { return { ...this._riskSettings }; }
  async saveRiskSettings(settings: RiskSettings): Promise<void> { this._riskSettings = { ...settings }; }
}