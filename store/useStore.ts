import { create } from 'zustand';
import { Expense, IncomeConfig, MortgageConfig, ScenarioType, SimulationResult, MacroConfig, RiskSettings } from '../features/simulation/domain/types';
import { DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_MORTGAGE, DEFAULT_MACRO, DEFAULT_RISK_SETTINGS } from '../constants';
import { SimulationService } from '../features/simulation/application/simulation.service';
import { LocalStorageFinancialRepository } from '../features/simulation/infrastructure/local-storage.financial.repository';

// Dependency Injection Root
// To switch to API, simply change 'LocalStorageFinancialRepository' to 'ApiFinancialRepository'
const repository = new LocalStorageFinancialRepository();
const service = new SimulationService(repository);

interface AppState {
  expenses: Expense[];
  income: IncomeConfig;
  mortgage: MortgageConfig;
  macro: MacroConfig;
  scenario: ScenarioType;
  riskSettings: RiskSettings;
  simulationResult: SimulationResult | null;
  
  isInitialized: boolean;
  isLoading: boolean;

  // Async Actions
  loadInitialData: () => Promise<void>;
  setExpenses: (expenses: Expense[]) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  setIncome: (income: IncomeConfig) => Promise<void>;
  setMortgage: (mortgage: MortgageConfig) => Promise<void>;
  setMacro: (macro: MacroConfig) => Promise<void>;
  setScenario: (scenario: ScenarioType) => Promise<void>;
  setRiskSettings: (settings: RiskSettings) => Promise<void>;
  run: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  expenses: DEFAULT_EXPENSES,
  income: DEFAULT_INCOME,
  mortgage: DEFAULT_MORTGAGE,
  macro: DEFAULT_MACRO,
  scenario: ScenarioType.NORMAL,
  riskSettings: DEFAULT_RISK_SETTINGS,
  simulationResult: null,
  isInitialized: false,
  isLoading: false,

  loadInitialData: async () => {
      set({ isLoading: true });
      try {
          // Parallel fetch for speed
          const [expenses, income, mortgage, macro, scenario, riskSettings] = await Promise.all([
              repository.getExpenses(),
              repository.getIncome(),
              repository.getMortgage(),
              repository.getMacro(),
              repository.getScenario(),
              repository.getRiskSettings()
          ]);
          
          set({ 
              expenses, income, mortgage, macro, scenario, riskSettings,
              isInitialized: true 
          });
          
          // Run first simulation
          await get().run();
      } catch (err) {
          console.error("Failed to load initial data", err);
      } finally {
          set({ isLoading: false });
      }
  },

  setExpenses: async (expenses) => {
    set({ expenses, isLoading: true });
    const result = await service.updateExpenses(expenses);
    set({ simulationResult: result, isLoading: false });
  },
  
  updateExpense: async (id, updates) => {
    const currentExpenses = get().expenses;
    const newExpenses = currentExpenses.map(e => e.id === id ? { ...e, ...updates } : e);
    await get().setExpenses(newExpenses);
  },

  setIncome: async (income) => {
    set({ income, isLoading: true });
    const result = await service.updateIncome(income);
    set({ simulationResult: result, isLoading: false });
  },

  setMortgage: async (mortgage) => {
    set({ mortgage, isLoading: true });
    const result = await service.updateMortgage(mortgage);
    set({ simulationResult: result, isLoading: false });
  },

  setMacro: async (macro) => {
    set({ macro, isLoading: true });
    const result = await service.updateMacro(macro);
    set({ simulationResult: result, isLoading: false });
  },

  setScenario: async (scenario) => {
    set({ scenario, isLoading: true });
    const result = await service.updateScenario(scenario);
    set({ simulationResult: result, isLoading: false });
  },

  setRiskSettings: async (riskSettings) => {
    set({ riskSettings, isLoading: true });
    const result = await service.updateRiskSettings(riskSettings);
    set({ simulationResult: result, isLoading: false });
  },

  run: async () => {
    // With API integration, we don't recalculate locally in the store.
    // We ask the service to get us the latest result.
    set({ isLoading: true });
    const result = await service.runSimulation();
    set({ simulationResult: result, isLoading: false });
  }
}));