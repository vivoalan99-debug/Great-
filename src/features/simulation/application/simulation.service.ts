import { FinancialRepository } from '../domain/financial.repository';
import { runSimulation } from '../domain/engine';
import { SimulationResult, Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../../../types';

export class SimulationService {
  constructor(private repository: FinancialRepository) {}

  public async run(): Promise<SimulationResult> {
    const expenses = await this.repository.getExpenses();
    const income = await this.repository.getIncome();
    const mortgage = await this.repository.getMortgage();
    const macro = await this.repository.getMacro();
    const scenario = await this.repository.getScenario();
    const riskSettings = await this.repository.getRiskSettings();

    return runSimulation(expenses, income, mortgage, macro, scenario, riskSettings);
  }

  public getExpenses(): Expense[] {
    // In a real async repo, these would be async. For now, we align with the sync-like behavior of Zustand for the UI,
    // though the contract allows Promises.
    return this.repository.getExpenses() as Expense[];
  }
  
  public updateExpenses(expenses: Expense[]): SimulationResult {
    this.repository.saveExpenses(expenses);
    // In sync engine, we can just call run(). In async, we'd await.
    // We cast to SimulationResult because our Engine and In-Memory Repo are synchronous.
    return this.run() as unknown as SimulationResult;
  }

  public getIncome(): IncomeConfig {
    return this.repository.getIncome() as IncomeConfig;
  }
  
  public updateIncome(income: IncomeConfig): SimulationResult {
    this.repository.saveIncome(income);
    return this.run() as unknown as SimulationResult;
  }

  public getMortgage(): MortgageConfig {
    return this.repository.getMortgage() as MortgageConfig;
  }
  
  public updateMortgage(mortgage: MortgageConfig): SimulationResult {
    this.repository.saveMortgage(mortgage);
    return this.run() as unknown as SimulationResult;
  }

  public getMacro(): MacroConfig {
    return this.repository.getMacro() as MacroConfig;
  }
  
  public updateMacro(macro: MacroConfig): SimulationResult {
    this.repository.saveMacro(macro);
    return this.run() as unknown as SimulationResult;
  }

  public getScenario(): ScenarioType {
    return this.repository.getScenario() as ScenarioType;
  }
  
  public updateScenario(scenario: ScenarioType): SimulationResult {
    this.repository.saveScenario(scenario);
    return this.run() as unknown as SimulationResult;
  }

  public getRiskSettings(): RiskSettings {
    return this.repository.getRiskSettings() as RiskSettings;
  }
  
  public updateRiskSettings(settings: RiskSettings): SimulationResult {
    this.repository.saveRiskSettings(settings);
    return this.run() as unknown as SimulationResult;
  }
}
