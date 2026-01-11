import { FinancialRepository } from '../domain/financial.repository';
import { Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../domain/types';

// Future Implementation
// When you have a backend, simply switch the repository instantiation in useStore.ts
// from LocalStorageFinancialRepository to ApiFinancialRepository.

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class ApiFinancialRepository implements FinancialRepository {
  
  private async fetchJson<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  }

  private async postJson<T>(endpoint: string, data: any): Promise<void> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  }

  async getExpenses(): Promise<Expense[]> { return this.fetchJson<Expense[]>('/expenses'); }
  async saveExpenses(expenses: Expense[]): Promise<void> { return this.postJson('/expenses', expenses); }

  async getIncome(): Promise<IncomeConfig> { return this.fetchJson<IncomeConfig>('/income'); }
  async saveIncome(income: IncomeConfig): Promise<void> { return this.postJson('/income', income); }

  async getMortgage(): Promise<MortgageConfig> { return this.fetchJson<MortgageConfig>('/mortgage'); }
  async saveMortgage(mortgage: MortgageConfig): Promise<void> { return this.postJson('/mortgage', mortgage); }

  async getMacro(): Promise<MacroConfig> { return this.fetchJson<MacroConfig>('/macro'); }
  async saveMacro(macro: MacroConfig): Promise<void> { return this.postJson('/macro', macro); }

  async getScenario(): Promise<ScenarioType> { return this.fetchJson<ScenarioType>('/scenario'); }
  async saveScenario(scenario: ScenarioType): Promise<void> { return this.postJson('/scenario', { type: scenario }); }

  async getRiskSettings(): Promise<RiskSettings> { return this.fetchJson<RiskSettings>('/risk-settings'); }
  async saveRiskSettings(settings: RiskSettings): Promise<void> { return this.postJson('/risk-settings', settings); }
}