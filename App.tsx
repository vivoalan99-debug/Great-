import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { 
  LayoutDashboard, Wallet, Home, PieChart, 
  Settings, Menu, X, AlertTriangle, CheckCircle,
  ShieldAlert, ShieldCheck, PiggyBank, TrendingDown, Download, FileText, Info, CalendarClock, Siren
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { ExpensesTable } from './components/ExpensesTable';
import { CashflowChart, MortgageChart } from './components/Charts';
import { MonthlyCashflowChart } from './components/MonthlyCashflowChart';
import { DepositoGrowthChart } from './components/DepositoGrowthChart';
import { InterestSavedChart } from './components/InterestSavedChart';
import { MortgageAmortizationChart } from './components/MortgageAmortizationChart';
import { YearlySummaryTable } from './components/YearlySummaryTable';
import { DepositoImpactAnalysis } from './components/DepositoImpactAnalysis';
import { MortgageRateScheduler } from './components/MortgageRateScheduler';
import { Card, SummaryCard } from './components/ui/Card';
import { formatMoney } from './services/mathUtils';
import { ScenarioType } from './types';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all group ${
      active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
    title={collapsed ? label : ''}
  >
    <Icon size={20} className="shrink-0" />
    <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
        <span className="whitespace-nowrap">{label}</span>
    </div>
  </button>
);

export default function App() {
  const { 
      run, simulationResult, scenario, setScenario, 
      income, setIncome, mortgage, setMortgage,
      macro, setMacro, riskSettings, setRiskSettings
  } = useStore();
  
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    run();
  }, []);

  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    setIsExporting(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#f8fafc'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; 
        const pageHeight = 297; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`FinSim-Report-${activeTab}-${dateStr}.pdf`);
    } catch (err) {
        console.error("Export failed", err);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportLedgerPDF = () => {
    if (!simulationResult) return;
    
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    const logs = simulationResult.logs;

    doc.setFontSize(16);
    doc.text("FinSim - Monthly Simulation Ledger", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 20);

    const tableData = logs.map(log => {
       const extraPaid = log.extraPaymentMade > 0;
       
       // Format: Principal Before (after regular pmt) -> After (after extra pmt)
       const principalString = extraPaid 
          ? `${(log.principalAfterRegular/1000000).toFixed(1)}M -> ${(log.mortgageBalance/1000000).toFixed(1)}M`
          : `${(log.mortgageBalance/1000000).toFixed(1)}M`;

       // Format: Installment Before -> After
       const instChanged = Math.abs(log.installmentCurrent - log.installmentNext) > 1000;
       const installmentString = instChanged && extraPaid
          ? `${(log.installmentCurrent/1000000).toFixed(1)}M -> ${(log.installmentNext/1000000).toFixed(1)}M`
          : `${(log.installmentCurrent/1000000).toFixed(1)}M`;

       return [
         log.dateStr,
         log.events.length > 0 ? log.events.join(", ") : "-",
         formatMoney(log.totalIncome),
         formatMoney(log.totalExpenses),
         formatMoney(log.mortgagePaid),
         extraPaid ? formatMoney(log.extraPaymentMade) : "-",
         principalString,
         installmentString,
         formatMoney(log.netFlow),
         formatMoney(log.bufferBalance),
         formatMoney(log.emergencyBalance),
         formatMoney(log.extraPaymentBucket)
       ];
    });

    autoTable(doc, {
      startY: 25,
      head: [[
          "Date", "Events", "Income", "Expenses", "Regular Pmt", "Extra Pmt", 
          "Principal", "Installment", "Net Flow", "Buffer", "Emergency", "Extra Bucket"
      ]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [59, 130, 246], valign: 'middle' },
      columnStyles: {
          0: { cellWidth: 16 }, // Date
          1: { cellWidth: 25 }, // Events
          // Money columns auto-width usually works, but Principal/Installment need space
          6: { cellWidth: 25, fontStyle: 'bold' }, // Principal
          7: { cellWidth: 25, fontStyle: 'bold' }, // Installment
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`FinSim-Ledger-${dateStr}.pdf`);
  };

  if (!simulationResult) return <div className="min-h-screen flex items-center justify-center text-slate-400">Initializing Engine...</div>;

  const { summary, logs } = simulationResult;

  const getRiskConfig = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
      switch(level) {
          case 'HIGH': return { 
              color: 'red' as const, 
              icon: ShieldAlert, 
              bg: 'bg-rose-50', 
              text: 'text-rose-700', 
              border: 'border-rose-200 ring-2 ring-rose-50'
          };
          case 'MEDIUM': return { 
              color: 'amber' as const, 
              icon: AlertTriangle, 
              bg: 'bg-amber-50', 
              text: 'text-amber-700',
              border: 'border-amber-200 ring-2 ring-amber-50'
          };
          default: return { 
              color: 'green' as const, 
              icon: ShieldCheck, 
              bg: 'bg-emerald-50', 
              text: 'text-emerald-700',
              border: 'border-slate-100'
          };
      }
  };
  
  const riskConfig = getRiskConfig(summary.riskLevel);
  
  const riskBadge = (
      <div className="group relative ml-auto flex items-center cursor-help">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${riskConfig.bg} ${riskConfig.text} border-current opacity-90`}>
              {summary.riskLevel}
          </span>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center leading-snug">
              {summary.riskReason}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 rotate-45"></div>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between shrink-0">
            <div className={`font-bold text-lg text-slate-800 tracking-tight overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                FinSim
            </div>
            <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-slate-600 p-1">
                {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-hidden hover:overflow-y-auto custom-scrollbar">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={collapsed} />
            <SidebarItem icon={Wallet} label="Expenses" active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} collapsed={collapsed} />
            <SidebarItem icon={Home} label="Mortgage" active={activeTab === 'mortgage'} onClick={() => setActiveTab('mortgage')} collapsed={collapsed} />
            <SidebarItem icon={PieChart} label="Simulation" active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} collapsed={collapsed} />
        </div>
        
        {/* Scenario Selector */}
        <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50">
             <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
               <div className="mb-4">
                 <p className="text-xs font-semibold text-slate-500 mb-2">SIMULATION SCENARIO</p>
                 <select 
                   className="w-full text-sm p-1.5 rounded border border-slate-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-100"
                   value={scenario}
                   onChange={(e) => setScenario(e.target.value as ScenarioType)}
                 >
                    <option value={ScenarioType.NORMAL}>Normal (Steady Job)</option>
                    <option value={ScenarioType.UNEMPLOYED}>Job Loss (Unemployed)</option>
                    <option value={ScenarioType.WORST_CASE}>Worst Case (Recession)</option>
                 </select>
               </div>
               
               {/* Scenario Specific Dates */}
               {scenario !== ScenarioType.NORMAL && (
                 <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                     <div>
                        <div className="flex items-center gap-1 mb-1">
                            <CalendarClock size={12} className="text-slate-400" />
                            <label className="text-xs font-bold text-slate-600">Expected Job Loss</label>
                        </div>
                        <input 
                            type="date" 
                            className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                            value={riskSettings.jobLossDate}
                            onChange={(e) => setRiskSettings({...riskSettings, jobLossDate: e.target.value})}
                        />
                     </div>
                     <div>
                        <div className="flex items-center gap-1 mb-1">
                            <Siren size={12} className="text-slate-400" />
                            <label className="text-xs font-bold text-slate-600">Notification Date</label>
                        </div>
                        <input 
                            type="date" 
                            className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                            value={riskSettings.notificationDate}
                            onChange={(e) => setRiskSettings({...riskSettings, notificationDate: e.target.value})}
                        />
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Simulation enters "Survival Mode" (Cost Cutting) from this date.
                        </p>
                     </div>
                 </div>
               )}
             </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-10">
            <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
            <div className="flex items-center gap-4">
               <button 
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
               >
                 <Download size={14} />
                 {isExporting ? 'Generating...' : 'Snapshot PDF'}
               </button>

               <div className="relative group">
                   <div 
                     className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors cursor-help ${riskConfig.bg} ${riskConfig.text}`}
                   >
                      <riskConfig.icon size={14} />
                      {summary.riskLevel} Risk
                   </div>
                   
                   {/* Custom Tooltip */}
                   <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="flex items-center gap-2 font-semibold mb-1 border-b border-slate-600 pb-1">
                            <Info size={12} className="text-blue-400" />
                            Risk Assessment
                        </div>
                        <div className="text-slate-300 leading-relaxed">{summary.riskReason}</div>
                        {/* Arrow */}
                        <div className="absolute -top-1 right-6 w-2 h-2 bg-slate-800 rotate-45"></div>
                   </div>
               </div>
            </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div id="report-content" className="max-w-6xl mx-auto space-y-6 pb-10">
            
            {/* Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {scenario === ScenarioType.NORMAL ? (
                    <SummaryCard 
                        label="Runway (Inc. Mortgage)" 
                        value={`${summary.liquidityRunwayMonths.toFixed(1)} Mo`} 
                        subtext={`Min: ${summary.lowestLiquidityMonths.toFixed(1)} Mo`}
                        color={riskConfig.color}
                        icon={riskConfig.icon}
                        className={riskConfig.border}
                        badge={riskBadge}
                    />
                ) : (
                     <SummaryCard 
                        label="Job Search Runway" 
                        value={summary.maxJobSearchMonths !== null ? `${summary.maxJobSearchMonths} Mo` : 'Safe'} 
                        subtext={summary.bankruptcyDate ? `Insolvent: ${summary.bankruptcyDate}` : "Runway exceeds 20y"}
                        color={riskConfig.color}
                        icon={CalendarClock}
                        className={riskConfig.border}
                        badge={riskBadge}
                    />
                )}

                <SummaryCard 
                  label="Buffer Full" 
                  value={summary.monthsToFullBuffer ? `Month ${summary.monthsToFullBuffer}` : 'Never'} 
                  subtext="3x Expenses + Mortgage"
                  color={summary.monthsToFullBuffer ? 'green' : 'amber'}
                  icon={summary.monthsToFullBuffer ? CheckCircle : AlertTriangle}
                />
                <SummaryCard 
                  label="Mortgage Free" 
                  value={summary.mortgagePayoffDate ? new Date(summary.mortgagePayoffDate).getFullYear().toString() : 'Active'} 
                  subtext="Payoff Year"
                  color="blue"
                  icon={Home}
                />
                <SummaryCard 
                  label="Purchasing Power" 
                  value={`-${summary.purchasingPowerLoss.toFixed(1)}%`} 
                  subtext="Lost over 20 Years"
                  color="red"
                  icon={TrendingDown}
                />
            </div>

            {activeTab === 'dashboard' && (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Funds Accumulation">
                            <CashflowChart data={logs} />
                        </Card>
                        <MonthlyCashflowChart />
                        <Card title="Mortgage Burndown">
                            <MortgageChart data={logs} />
                        </Card>
                        <InterestSavedChart />
                        <DepositoGrowthChart />
                    </div>
                    <div className="space-y-6">
                        <Card title="Macroeconomics" className="border-l-4 border-l-rose-400">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-rose-100 rounded text-rose-600">
                                                <TrendingDown size={14} />
                                            </div>
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Global Inflation</label>
                                        </div>
                                        <span className="text-lg font-bold text-rose-600">{macro.inflationRate}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="15" 
                                        step="0.5"
                                        className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        value={macro.inflationRate}
                                        onChange={(e) => setMacro({...macro, inflationRate: parseFloat(e.target.value)})}
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                                        <span>0% (Ideal)</span>
                                        <span>5.9% (Avg)</span>
                                        <span>15% (Crisis)</span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Purchasing Power Impact</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-600">Value of 100M in 20y</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {formatMoney(100000000 * Math.pow(1 - macro.inflationRate/100, 20))}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div 
                                            className="bg-slate-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(0, 100 - summary.purchasingPowerLoss)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="Quick Edit Expenses">
                            <ExpensesTable />
                        </Card>
                        
                        <Card title="Income Settings">
                           <div className="space-y-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Base Monthly Salary</label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
                                    <input 
                                        type="number" 
                                        className="w-full border border-slate-200 rounded pl-8 p-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                                        value={income.baseSalary}
                                        onChange={(e) => setIncome({...income, baseSalary: parseInt(e.target.value)})} 
                                    />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Annual Inc (%)</label>
                                     <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                                       value={income.annualIncreasePercent}
                                       onChange={(e) => setIncome({...income, annualIncreasePercent: parseFloat(e.target.value)})} 
                                     />
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">BPJS Balance</label>
                                     <input 
                                       type="number" 
                                       className="w-full border border-slate-200 rounded p-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                                       value={income.bpjsInitialBalance}
                                       onChange={(e) => setIncome({...income, bpjsInitialBalance: parseInt(e.target.value)})} 
                                     />
                                  </div>
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
                               <div className="flex items-center gap-2 pt-2 pb-2">
                                   <input 
                                       type="checkbox" 
                                       checked={mortgage.useDeposito}
                                       onChange={(e) => setMortgage({...mortgage, useDeposito: e.target.checked})}
                                       className="w-4 h-4 text-blue-600 rounded"
                                   />
                                   <label className="text-sm text-slate-700">Park Extra Payment in Deposito (6%)</label>
                               </div>

                               <div className="pt-2 border-t border-slate-100">
                                    <MortgageRateScheduler />
                               </div>
                           </div>
                       </Card>
                       <div className="lg:col-span-2 space-y-6">
                           <DepositoImpactAnalysis />
                           <InterestSavedChart />
                       </div>
                   </div>
                   
                   <MortgageAmortizationChart />
                   <YearlySummaryTable />
                </div>
            )}
            
            {activeTab === 'simulation' && (
                <Card title="Monthly Ledger">
                    <div className="flex justify-end mb-4">
                         <button 
                            onClick={handleExportLedgerPDF}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                            <FileText size={14} />
                            Export Ledger (PDF)
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-3 sticky left-0 bg-slate-50 border-b border-slate-200">Date</th>
                                    <th className="p-3 border-b border-slate-200">Event</th>
                                    <th className="p-3 text-right border-b border-slate-200">Total Income</th>
                                    <th className="p-3 text-right border-b border-slate-200">Total Exp</th>
                                    <th className="p-3 text-right border-b border-slate-200">Reg Pmt</th>
                                    <th className="p-3 text-right border-b border-slate-200 text-blue-600">Extra Pmt</th>
                                    <th className="p-3 text-right border-b border-slate-200 min-w-[120px]">Principal (Pre &rarr; End)</th>
                                    <th className="p-3 text-right border-b border-slate-200 min-w-[120px]">Installment (Old &rarr; New)</th>
                                    <th className="p-3 text-right border-b border-slate-200">Net Flow</th>
                                    <th className="p-3 text-right bg-emerald-50 text-emerald-800 border-b border-emerald-100">Buffer</th>
                                    <th className="p-3 text-right bg-green-50 text-green-800 border-b border-green-100">Emergency</th>
                                    <th className="p-3 text-right bg-blue-50 text-blue-800 border-b border-blue-100">Extra Bucket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                                {logs.map((log) => {
                                    const extraPaid = log.extraPaymentMade > 0;
                                    const instChanged = Math.abs(log.installmentCurrent - log.installmentNext) > 100;
                                    
                                    return (
                                    <tr key={log.monthIndex} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 sticky left-0 bg-white border-r border-slate-100 font-medium text-slate-500">{log.dateStr}</td>
                                        <td className="p-3">
                                            {log.events.map(e => (
                                                <span key={e} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] mr-1 mb-1 border border-slate-200">{e}</span>
                                            ))}
                                        </td>
                                        <td className="p-3 text-right text-slate-600">{formatMoney(log.totalIncome)}</td>
                                        <td className="p-3 text-right text-slate-400">{formatMoney(log.totalExpenses)}</td>
                                        <td className="p-3 text-right text-slate-600">{formatMoney(log.mortgagePaid)}</td>
                                        <td className="p-3 text-right text-blue-600 font-bold">
                                            {extraPaid ? formatMoney(log.extraPaymentMade) : '-'}
                                        </td>
                                        <td className="p-3 text-right">
                                            {extraPaid ? (
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[10px] text-slate-400">{formatMoney(log.principalAfterRegular)}</span>
                                                    <span className="text-xs text-slate-800 font-bold">&darr; {formatMoney(log.mortgageBalance)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">{formatMoney(log.mortgageBalance)}</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {instChanged ? (
                                                 <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[10px] text-slate-400 line-through decoration-slate-300">{formatMoney(log.installmentCurrent)}</span>
                                                    <span className="text-xs text-emerald-600 font-bold">{formatMoney(log.installmentNext)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">{formatMoney(log.installmentCurrent)}</span>
                                            )}
                                        </td>
                                        <td className={`p-3 text-right font-bold ${log.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatMoney(log.netFlow)}
                                        </td>
                                        <td className="p-3 text-right bg-emerald-50/50 text-slate-600">{formatMoney(log.bufferBalance)}</td>
                                        <td className="p-3 text-right bg-green-50/50 text-slate-600">{formatMoney(log.emergencyBalance)}</td>
                                        <td className="p-3 text-right bg-blue-50/50 text-slate-600">{formatMoney(log.extraPaymentBucket)}</td>
                                    </tr>
                                )})}
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