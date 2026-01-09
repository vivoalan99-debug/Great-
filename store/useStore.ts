import { create } from 'zustand';
import { Expense, IncomeConfig, MortgageConfig, ScenarioType, SimulationResult } from '../types';
import { DEFAULT_EXPENSES, DEFAULT_INCOME, DEFAULT_MORTGAGE } from '../constants';
import { runSimulation } from '../services/engine';

interface AppState {
  expenses: Expense[];
  income: IncomeConfig;
  mortgage: MortgageConfig;
  scenario: ScenarioType;
  simulationResult: SimulationResult | null;

  setExpenses: (expenses: Expense[]) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  setIncome: (income: IncomeConfig) => void;
  setMortgage: (mortgage: MortgageConfig) => void;
  setScenario: (scenario: ScenarioType) => void;
  run: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  expenses: DEFAULT_EXPENSES,
  income: DEFAULT_INCOME,
  mortgage: DEFAULT_MORTGAGE,
  scenario: ScenarioType.NORMAL,
  simulationResult: null,

  setExpenses: (expenses) => {
    set({ expenses });
    get().run();
  },
  
  updateExpense: (id, updates) => {
    set((state) => ({
        expenses: state.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
    get().run();
  },

  setIncome: (income) => {
    set({ income });
    get().run();
  },

  setMortgage: (mortgage) => {
    set({ mortgage });
    get().run();
  },

  setScenario: (scenario) => {
    set({ scenario });
    get().run();
  },

  run: () => {
    const { expenses, income, mortgage, scenario } = get();
    const result = runSimulation(expenses, income, mortgage, scenario);
    set({ simulationResult: result });
  }
}));