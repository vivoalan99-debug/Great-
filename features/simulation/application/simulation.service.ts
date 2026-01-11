import { FinancialRepository } from '../domain/financial.repository';
import { runSimulation } from '../domain/engine';
import { SimulationResult, Expense, IncomeConfig, MortgageConfig, MacroConfig, ScenarioType, RiskSettings } from '../domain/types';

export class SimulationService {
  constructor(private repository: FinancialRepository) {}

  public async runSimulation(): Promise<SimulationResult> {
    const [expenses, income, mortgage, macro, scenario, riskSettings] = await Promise.all([
      this.repository.getExpenses(),
      this.repository.getIncome(),
      this.repository.getMortgage(),
      this.repository.getMacro(),
      this.repository.getScenario(),
      this.repository.getRiskSettings()
    ]);

    // Note: In a full backend architecture, 'runSimulation' would happen on the server
    // and this method would just return the result from the API.
    // For now, we fetch data async, then calculate locally.
    return runSimulation(expenses, income, mortgage, macro, scenario, riskSettings);
  }

  // Each update method now saves data to persistence layer, 
  // then re-runs the simulation and returns the fresh result.
  
  public async updateExpenses(expenses: Expense[]): Promise<SimulationResult> {
    await this.repository.saveExpenses(expenses);
    return this.runSimulation();
  }

  public async updateIncome(income: IncomeConfig): Promise<SimulationResult> {
    await this.repository.saveIncome(income);
    return this.runSimulation();
  }

  public async updateMortgage(mortgage: MortgageConfig): Promise<SimulationResult> {
    await this.repository.saveMortgage(mortgage);
    return this.runSimulation();
  }

  public async updateMacro(macro: MacroConfig): Promise<SimulationResult> {
    await this.repository.saveMacro(macro);
    return this.runSimulation();
  }

  public async updateScenario(scenario: ScenarioType): Promise<SimulationResult> {
    await this.repository.saveScenario(scenario);
    return this.runSimulation();
  }

  public async updateRiskSettings(settings: RiskSettings): Promise<SimulationResult> {
    await this.repository.saveRiskSettings(settings);
    return this.runSimulation();
  }
}