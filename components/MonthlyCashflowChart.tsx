import React from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, ReferenceLine, Area 
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatMoney } from '../shared/utils/mathUtils';
import { Card } from './ui/Card';

export const MonthlyCashflowChart = () => {
  const { simulationResult } = useStore();
  
  if (!simulationResult) return null;
  
  const { logs } = simulationResult;
  // Downsample for readability (quarterly view approx)
  const chartData = logs.filter((_, i) => i % 3 === 0);

  const yearTicks = chartData
    .filter(log => log.monthIndex % 12 === 0)
    .map(log => log.dateStr);

  return (
    <Card title="Monthly Cashflow Dynamics" className="h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500 max-w-lg">
          Tracking the relationship between Income, Living Expenses, and Net Flow. 
          Note: Net Flow accounts for Mortgage payments which may not be reflected in 'Living Expenses'.
        </p>
      </div>

      <div className="flex-1 w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="dateStr" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                ticks={yearTicks}
                tickFormatter={(val) => val.split(' ')[1]}
            />
            <YAxis 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} 
                tickLine={false} 
                axisLine={false}
            />
            <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [formatMoney(value), name]}
                labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
            />
            <Legend iconType="circle" fontSize={10} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            
            <Bar dataKey="netFlow" name="Net Flow" barSize={20} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.netFlow >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                ))}
            </Bar>
            
            <Line 
                type="stepAfter" 
                dataKey="totalIncome" 
                name="Total Income" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
            />
            
            <Line 
                type="monotone" 
                dataKey="totalExpenses" 
                name="Living Expenses" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                dot={false} 
                strokeDasharray="5 5"
            />

             {/* Optional: Visualizing the mortgage gap implicitly */}
             <Line 
                type="monotone" 
                dataKey={(data) => data.totalExpenses + data.mortgagePaid} 
                name="Total Outflow (Inc. Mortgage)" 
                stroke="#64748b" 
                strokeWidth={1} 
                dot={false} 
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};