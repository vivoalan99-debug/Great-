import { create } from 'zustand';
import { Expense, IncomeConfig, MortgageConfig, ScenarioType, SimulationResult, MacroConfig, RiskSettings } from '../types';
import { InMemoryFinancialRepository } from '../features/simulation/infrastructure/in-memory.financial.repository';
import { SimulationService } from '../features/simulation/application/simulation.service';

// --- Dependency Injection Composition Root ---
// In a larger app, this would be in a dedicated DI container.
const repository = new InMemoryFinancialRepository();
const service = new SimulationService(repository);

interface AppState {
  expenses: Expense[];
  income: IncomeConfig;
  mortgage: MortgageConfig;
  macro: MacroConfig;
  scenario: ScenarioType;
  riskSettings: RiskSettings;
  simulationResult: SimulationResult | null;

  setExpenses: (expenses: Expense[]) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  setIncome: (income: IncomeConfig) => void;
  setMortgage: (mortgage: MortgageConfig) => void;
  setMacro: (macro: MacroConfig) => void;
  setScenario: (scenario: ScenarioType) => void;
  setRiskSettings: (settings: RiskSettings) => void;
  run: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initialize state from repository (via service)
  expenses: service.getExpenses(),
  income: service.getIncome(),
  mortgage: service.getMortgage(),
  macro: service.getMacro(),
  scenario: service.getScenario(),
  riskSettings: service.getRiskSettings(),
  simulationResult: null,

  setExpenses: (expenses) => {
    const result = service.updateExpenses(expenses);
    set({ expenses, simulationResult: result });
  },
  
  updateExpense: (id, updates) => {
    const currentExpenses = get().expenses;
    const newExpenses = currentExpenses.map(e => e.id === id ? { ...e, ...updates } : e);
    const result = service.updateExpenses(newExpenses);
    set({ expenses: newExpenses, simulationResult: result });
  },

  setIncome: (income) => {
    const result = service.updateIncome(income);
    set({ income, simulationResult: result });
  },

  setMortgage: (mortgage) => {
    const result = service.updateMortgage(mortgage);
    set({ mortgage, simulationResult: result });
  },

  setMacro: (macro) => {
    const result = service.updateMacro(macro);
    set({ macro, simulationResult: result });
  },

  setScenario: (scenario) => {
    const result = service.updateScenario(scenario);
    set({ scenario, simulationResult: result });
  },

  setRiskSettings: (riskSettings) => {
    const result = service.updateRiskSettings(riskSettings);
    set({ riskSettings, simulationResult: result });
  },

  run: async () => {
    const result = await service.run();
    set({ simulationResult: result });
  }
}));
