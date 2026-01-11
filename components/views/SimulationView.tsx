import React from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../ui/Card';
import { FileText } from 'lucide-react';
import { formatMoney } from '../../shared/utils/mathUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SimulationView = () => {
    const { simulationResult } = useStore();
    if (!simulationResult) return null;
    const { logs } = simulationResult;

    const handleExportLedgerPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(16);
        doc.text("FinSim - Monthly Simulation Ledger", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 20);

        const tableData = logs.map(log => {
           const extraPaid = log.extraPaymentMade > 0;
           return [
             log.dateStr,
             log.events.length > 0 ? log.events.join(", ") : "-",
             formatMoney(log.totalIncome),
             formatMoney(log.totalExpenses),
             formatMoney(log.mortgagePaid),
             extraPaid ? formatMoney(log.extraPaymentMade) : "-",
             `${(log.mortgageBalance/1000000).toFixed(1)}M`,
             formatMoney(log.netFlow),
             formatMoney(log.bufferBalance),
             formatMoney(log.emergencyBalance),
             formatMoney(log.extraPaymentBucket)
           ];
        });

        autoTable(doc, {
          startY: 25,
          head: [["Date", "Events", "Income", "Expenses", "Reg Pmt", "Extra Pmt", "Principal", "Net Flow", "Buffer", "Emergency", "Extra Bucket"]],
          body: tableData,
          styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`FinSim-Ledger.pdf`);
    };

    return (
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
                            <th className="p-3 text-right border-b border-slate-200">Income</th>
                            <th className="p-3 text-right border-b border-slate-200">Exp</th>
                            <th className="p-3 text-right border-b border-slate-200">Mortgage</th>
                            <th className="p-3 text-right border-b border-slate-200 text-blue-600">Extra</th>
                            <th className="p-3 text-right border-b border-slate-200">Principal</th>
                            <th className="p-3 text-right border-b border-slate-200">Net Flow</th>
                            <th className="p-3 text-right bg-emerald-50 text-emerald-800 border-b border-emerald-100">Buffer</th>
                            <th className="p-3 text-right bg-green-50 text-green-800 border-b border-green-100">Emergency</th>
                            <th className="p-3 text-right bg-blue-50 text-blue-800 border-b border-blue-100">Extra Bucket</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                        {logs.map((log) => (
                            <tr key={log.monthIndex} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 sticky left-0 bg-white border-r border-slate-100 font-medium text-slate-500">{log.dateStr}</td>
                                <td className="p-3">{log.events.map(e => <span key={e} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 mr-1 mb-1 border border-slate-200">{e}</span>)}</td>
                                <td className="p-3 text-right text-slate-600">{formatMoney(log.totalIncome)}</td>
                                <td className="p-3 text-right text-slate-400">{formatMoney(log.totalExpenses)}</td>
                                <td className="p-3 text-right text-slate-600">{formatMoney(log.mortgagePaid)}</td>
                                <td className="p-3 text-right text-blue-600 font-bold">{log.extraPaymentMade > 0 ? formatMoney(log.extraPaymentMade) : '-'}</td>
                                <td className="p-3 text-right text-slate-500">{formatMoney(log.mortgageBalance)}</td>
                                <td className={`p-3 text-right font-bold ${log.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(log.netFlow)}</td>
                                <td className="p-3 text-right bg-emerald-50/50 text-slate-600">{formatMoney(log.bufferBalance)}</td>
                                <td className="p-3 text-right bg-green-50/50 text-slate-600">{formatMoney(log.emergencyBalance)}</td>
                                <td className="p-3 text-right bg-blue-50/50 text-slate-600">{formatMoney(log.extraPaymentBucket)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};