import React, { useState } from 'react';
import { 
  LayoutDashboard, Wallet, Home, PieChart, Menu, X, Download, Save, Info, ShieldAlert, AlertTriangle, ShieldCheck, CalendarClock, Siren 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useStore } from '../../store/useStore';
import { ScenarioType } from '../../features/simulation/domain/types';

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

interface MainLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeTab, onTabChange }) => {
    const { 
        simulationResult, scenario, setScenario, 
        riskSettings, setRiskSettings, isLoading 
    } = useStore();
    const [collapsed, setCollapsed] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    if (!simulationResult) return null;
    const { summary } = simulationResult;

    const handleExportPDF = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;
    
        setIsExporting(true);
    
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#f8fafc' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
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
            pdf.save(`FinSim-Report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setIsExporting(false);
        }
    };

    const getRiskConfig = (level: string) => {
        switch(level) {
            case 'HIGH': return { bg: 'bg-rose-50', text: 'text-rose-700', icon: ShieldAlert };
            case 'MEDIUM': return { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle };
            default: return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: ShieldCheck };
        }
    };
    const riskConfig = getRiskConfig(summary.riskLevel);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
                <div className="h-16 flex items-center px-4 border-b border-slate-100 justify-between shrink-0">
                    <div className={`font-bold text-lg text-slate-800 tracking-tight overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        FinSim
                    </div>
                    <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-slate-600 p-1">
                        {collapsed ? <Menu size={20} /> : <X size={20} />}
                    </button>
                </div>
                
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} collapsed={collapsed} />
                    <SidebarItem icon={Wallet} label="Expenses" active={activeTab === 'expenses'} onClick={() => onTabChange('expenses')} collapsed={collapsed} />
                    <SidebarItem icon={Home} label="Mortgage" active={activeTab === 'mortgage'} onClick={() => onTabChange('mortgage')} collapsed={collapsed} />
                    <SidebarItem icon={PieChart} label="Simulation" active={activeTab === 'simulation'} onClick={() => onTabChange('simulation')} collapsed={collapsed} />
                </nav>

                <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50">
                    <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-500 mb-2">SCENARIO</p>
                            <select 
                                className="w-full text-sm p-1.5 rounded border border-slate-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-100"
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value as ScenarioType)}
                            >
                                <option value={ScenarioType.NORMAL}>Normal (Steady Job)</option>
                                <option value={ScenarioType.UNEMPLOYED}>Job Loss</option>
                                <option value={ScenarioType.WORST_CASE}>Recession</option>
                            </select>
                        </div>
                        {scenario !== ScenarioType.NORMAL && (
                            <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in">
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <CalendarClock size={12} className="text-slate-400" />
                                        <label className="text-xs font-bold text-slate-600">Job Loss Date</label>
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
                                        <label className="text-xs font-bold text-slate-600">Notice Date</label>
                                    </div>
                                    <input 
                                        type="date" 
                                        className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                                        value={riskSettings.notificationDate}
                                        onChange={(e) => setRiskSettings({...riskSettings, notificationDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-10 w-full">
                    <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
                    <div className="flex items-center gap-4">
                        {isLoading && (
                            <div className="flex items-center gap-2 text-blue-500 text-xs font-semibold animate-pulse mr-4">
                                <Save size={14} /> Saving...
                            </div>
                        )}
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                        >
                            <Download size={14} />
                            {isExporting ? 'Generating...' : 'Snapshot PDF'}
                        </button>

                        <div className="relative group">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors cursor-help ${riskConfig.bg} ${riskConfig.text}`}>
                                <riskConfig.icon size={14} />
                                {summary.riskLevel} Risk
                            </div>
                            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="flex items-center gap-2 font-semibold mb-1 border-b border-slate-600 pb-1">
                                    <Info size={12} className="text-blue-400" />
                                    Risk Analysis
                                </div>
                                <div className="text-slate-300 leading-relaxed">{summary.riskReason}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar w-full">
                    <div id="report-content" className="max-w-6xl mx-auto space-y-6 pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};