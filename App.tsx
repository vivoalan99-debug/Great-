import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { 
  LayoutDashboard, Wallet, Home, PieChart, 
  Settings, Menu, X, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { ExpensesTable } from './components/ExpensesTable';
import { CashflowChart, MortgageChart } from './components/Charts';
import { DepositoGrowthChart } from './components/DepositoGrowthChart';
import { InterestSavedChart } from './components/InterestSavedChart';
import { Card, SummaryCard } from './components/ui/Card';
import { formatMoney } from './services/mathUtils';
import { ScenarioType } from './types';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all ${
      active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    <Icon size={20} />
    {!collapsed && <span>{label}</span>}
  </button>
);

export default function App() {
  const { run, simulationResult, scenario, setScenario, income, setIncome, mortgage, setMortgage } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  useEffect(() => {
    run();
  }, []);

  if (!simulationResult) return <div className="min-h-screen flex items-center justify-center text-slate-400">Initializing Engine...</div>;

  const { summary, logs } = simulationResult;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between">
            {!collapsed && <span className="font-bold text-lg text-slate-800 tracking-tight">FinSim</span>}
            <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-slate-600">
                {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
        </div>
        <div className="flex-1 p-3 space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={collapsed} />
            <SidebarItem icon={Wallet} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} collapsed={collapsed} />
            <SidebarItem icon={Home} label="Mortgage" active={activeTab === 'mortgage'} onClick={() => setActiveTab('mortgage')} collapsed={collapsed} />
            <SidebarItem icon={PieChart} label="Simulation" active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} collapsed={collapsed} />
        </div>
        <div className="p-4 border-t border-slate-100">
             {!collapsed && (
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <p className="text-xs font-semibold text-slate-500 mb-2">SCENARIO</p>
                 <select 
                   className="w-full text-sm p-1.5 rounded border border-slate-300 bg-white"
                   value={scenario}
                   onChange={(e) => setScenario(e.target.value as ScenarioType)}
                 >
                    <option value={ScenarioType.NORMAL}>Normal</option>
                    <option value={ScenarioType.UNEMPLOYED}>Unemployed (18mo)</option>
                    <option value={ScenarioType.WORST_CASE}>Worst Case</option>
                 </select>
               </div>
             )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
            <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">
                  {summary.riskLevel} Risk
               </div>
            </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                  label="Liquidity Runway" 
                  value={`${summary.liquidityRunwayMonths.toFixed(1)} Mo`} 
                  subtext="Survival without income"
                  color={summary.liquidityRunwayMonths < 6 ? 'red' : 'green'}
                />
                <SummaryCard 
                  label="Buffer Full" 
                  value={summary.monthsToFullBuffer ? `Month ${summary.monthsToFullBuffer}` : 'Never'} 
                  subtext="3x Expenses + Mortgage"
                />
                <SummaryCard 
                  label="Mortgage Free" 
                  value={summary.mortgagePayoffDate ? new Date(summary.mortgagePayoffDate).getFullYear().toString() : 'Active'} 
                  subtext="Payoff Year"
                  color="blue"
                />
                <SummaryCard 
                  label="Principal" 
                  value={formatMoney(mortgage.principal)} 
                  subtext="Starting Amount"
                />
            </div>

            {activeTab === 'dashboard' && (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Funds Accumulation">
                            <CashflowChart data={logs} />
                        </Card>
                        <Card title="Mortgage Burndown">
                            <MortgageChart data={logs} />
                        </Card>
                        <DepositoGrowthChart />
                    </div>
                    <div className="space-y-6">
                        <Card title="Quick Edit Expenses">
                            <ExpensesTable />
                        </Card>
                        <Card title="Income Settings">
                           <div className="space-y-4">
                              <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Base Monthly Salary</label>
                                 <input 
                                   type="number" 
                                   className="w-full border border-slate-200 rounded p-2 text-sm"
                                   value={income.baseSalary}
                                   onChange={(e) => setIncome({...income, baseSalary: parseInt(e.target.value)})} 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Annual Increase (%)</label>
                                 <input 
                                   type="number" 
                                   className="w-full border border-slate-200 rounded p-2 text-sm"
                                   value={income.annualIncreasePercent}
                                   onChange={(e) => setIncome({...income, annualIncreasePercent: parseFloat(e.target.value)})} 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">BPJS Initial Balance</label>
                                 <input 
                                   type="number" 
                                   className="w-full border border-slate-200 rounded p-2 text-sm"
                                   value={income.bpjsInitialBalance}
                                   onChange={(e) => setIncome({...income, bpjsInitialBalance: parseInt(e.target.value)})} 
                                 />
                              </div>
                           </div>
                        </Card>
                    </div>
                </div>
                </>
            )}

            {activeTab === 'expenses' && (
               <Card title="Detailed Expenses Management" className="min-h-[500px]">
                  <ExpensesTable />
               </Card>
            )}

            {activeTab === 'mortgage' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       <Card title="Mortgage Configuration" className="lg:col-span-1">
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">Principal Amount</label>
                                   <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2"
                                       value={mortgage.principal}
                                       onChange={(e) => setMortgage({...mortgage, principal: parseInt(e.target.value)})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">Tenure (Years)</label>
                                   <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2"
                                       value={mortgage.tenureYears}
                                       onChange={(e) => setMortgage({...mortgage, tenureYears: parseInt(e.target.value)})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">Penalty Percent (%)</label>
                                   <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2"
                                       value={mortgage.penaltyPercent}
                                       step="0.1"
                                       onChange={(e) => setMortgage({...mortgage, penaltyPercent: parseFloat(e.target.value)})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">Min Extra Payment (x Installment)</label>
                                   <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2"
                                       value={mortgage.extraPaymentMinMultiple}
                                       onChange={(e) => setMortgage({...mortgage, extraPaymentMinMultiple: parseInt(e.target.value)})}
                                   />
                               </div>
                               <div className="flex items-center gap-2 pt-2">
                                   <input 
                                       type="checkbox" 
                                       checked={mortgage.useDeposito}
                                       onChange={(e) => setMortgage({...mortgage, useDeposito: e.target.checked})}
                                       className="w-4 h-4 text-blue-600 rounded"
                                   />
                                   <label className="text-sm text-slate-700">Park Extra Payment in Deposito (6%)</label>
                               </div>
                           </div>
                       </Card>
                       <div className="lg:col-span-2">
                           <InterestSavedChart />
                       </div>
                   </div>
                   
                   <Card title="Extra Payment Log">
                      <div className="overflow-auto max-h-96">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="p-2">Year</th>
                                    <th className="p-2 text-right">Extra Paid</th>
                                    <th className="p-2 text-right">Penalty</th>
                                    <th className="p-2 text-right">Principal Reduced</th>
                                    <th className="p-2 text-right">Inst. Before</th>
                                    <th className="p-2 text-right">Inst. After</th>
                                    <th className="p-2 text-right text-emerald-600">Interest Saved</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {simulationResult.yearLogs.map((log) => (
                                    <tr key={log.year}>
                                        <td className="p-2 font-medium">{2026 + log.year}</td>
                                        <td className="p-2 text-right text-blue-600">{formatMoney(log.extraPaymentPaid)}</td>
                                        <td className="p-2 text-right text-red-500">{formatMoney(log.penaltyPaid)}</td>
                                        <td className="p-2 text-right font-bold">{formatMoney(log.principalReduced)}</td>
                                        <td className="p-2 text-right text-slate-500">{formatMoney(log.installmentBefore)}</td>
                                        <td className="p-2 text-right text-slate-700 font-medium">{formatMoney(log.installmentAfter)}</td>
                                        <td className="p-2 text-right text-emerald-600 font-bold">{formatMoney(log.interestSaved)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {simulationResult.yearLogs.length === 0 && <p className="text-center p-4 text-slate-400">No extra payments triggered yet.</p>}
                      </div>
                   </Card>
                </div>
            )}
            
            {activeTab === 'simulation' && (
                <Card title="Monthly Ledger">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-50">Date</th>
                                    <th className="p-3">Event</th>
                                    <th className="p-3 text-right">Total Income</th>
                                    <th className="p-3 text-right">Total Exp</th>
                                    <th className="p-3 text-right">Mortgage Paid</th>
                                    <th className="p-3 text-right">Net Flow</th>
                                    <th className="p-3 text-right bg-emerald-50 text-emerald-800">Buffer</th>
                                    <th className="p-3 text-right bg-green-50 text-green-800">Emergency</th>
                                    <th className="p-3 text-right bg-blue-50 text-blue-800">Extra Bucket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                                {logs.map((log) => (
                                    <tr key={log.monthIndex} className="hover:bg-slate-50">
                                        <td className="p-3 sticky left-0 bg-white">{log.dateStr}</td>
                                        <td className="p-3">
                                            {log.events.map(e => (
                                                <span key={e} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] mr-1">{e}</span>
                                            ))}
                                        </td>
                                        <td className="p-3 text-right">{formatMoney(log.totalIncome)}</td>
                                        <td className="p-3 text-right text-slate-500">{formatMoney(log.totalExpenses)}</td>
                                        <td className="p-3 text-right text-slate-500">{formatMoney(log.mortgagePaid)}</td>
                                        <td className={`p-3 text-right font-bold ${log.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatMoney(log.netFlow)}
                                        </td>
                                        <td className="p-3 text-right bg-emerald-50/50">{formatMoney(log.bufferBalance)}</td>
                                        <td className="p-3 text-right bg-green-50/50">{formatMoney(log.emergencyBalance)}</td>
                                        <td className="p-3 text-right bg-blue-50/50">{formatMoney(log.extraPaymentBucket)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}