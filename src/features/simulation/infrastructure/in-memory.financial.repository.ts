import { FinancialRepository } from '../domain/financial.repository';
import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../../../types';
import { DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_MORTGAGE, DEFAULT_MACRO, DEFAULT_RISK_SETTINGS } from '../../../constants';

export class InMemoryFinancialRepository implements FinancialRepository {
  // This acts as our "Database"
  private _expenses: Expense[] = [...DEFAULT_EXPENSES];
  private _income: IncomeConfig = { ...DEFAULT_INCOME };
  private _mortgage: MortgageConfig = { ...DEFAULT_MORTGAGE };
  private _macro: MacroConfig = { ...DEFAULT_MACRO };
  private _scenario: ScenarioType = ScenarioType.NORMAL;
  private _riskSettings: RiskSettings = { ...DEFAULT_RISK_SETTINGS };

  getExpenses(): Expense[] {
    return [...this._expenses];
  }
  saveExpenses(expenses: Expense[]): void {
    this._expenses = [...expenses];
  }

  getIncome(): IncomeConfig {
    return { ...this._income };
  }
  saveIncome(income: IncomeConfig): void {
    this._income = { ...income };
  }

  getMortgage(): MortgageConfig {
    return { ...this._mortgage };
  }
  saveMortgage(mortgage: MortgageConfig): void {
    this._mortgage = { ...mortgage };
  }

  getMacro(): MacroConfig {
    return { ...this._macro };
  }
  saveMacro(macro: MacroConfig): void {
    this._macro = { ...macro };
  }

  getScenario(): ScenarioType {
    return this._scenario;
  }
  saveScenario(scenario: ScenarioType): void {
    this._scenario = scenario;
  }

  getRiskSettings(): RiskSettings {
    return { ...this._riskSettings };
  }
  saveRiskSettings(settings: RiskSettings): void {
    this._riskSettings = { ...settings };
  }
}
