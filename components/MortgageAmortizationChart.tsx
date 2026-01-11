import React from 'react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatMoney } from '../shared/utils/mathUtils';
import { Card } from './ui/Card';

export const MortgageAmortizationChart = () => {
  const { simulationResult } = useStore();
  
  if (!simulationResult) return null;
  
  const { logs } = simulationResult;
  // Filter logs to only show while mortgage is active to avoid long flat tail
  const activeLogs = logs.filter(l => l.mortgageBalance > 0 || l.mortgagePaid > 0);

  // Calculate year ticks for cleaner X-axis
  const yearTicks = activeLogs
    .filter(log => log.monthIndex % 12 === 0)
    .map(log => log.dateStr);

  return (
    <Card title="Monthly Amortization Breakdown" className="flex flex-col h-[450px]">
      <div className="mb-4">
        <p className="text-sm text-slate-500">
          Visualizing the shift from interest-heavy to principal-heavy payments over the loan tenure.
        </p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={activeLogs} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
                dataKey="dateStr" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                ticks={yearTicks}
                tickFormatter={(val) => val.split(' ')[1]} // Show Year only
            />
            
            {/* Left Axis: Monthly Payment Amounts */}
            <YAxis 
                yAxisId="left" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Monthly Payment', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }} 
            />
            
            {/* Right Axis: Remaining Balance */}
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Remaining Balance', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 10 } }} 
            />
            
            <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [
                    formatMoney(value), 
                    name === 'mortgageBalance' ? 'Remaining Balance' : 
                    name === 'mortgageInterest' ? 'Interest Paid' : 'Principal Paid'
                ]}
                labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
            />
            <Legend iconType="circle" fontSize={10} />
            
            {/* Stacked Areas for Payment Composition */}
            <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="mortgageInterest" 
                name="Interest Paid" 
                stackId="1" 
                stroke="#f43f5e" 
                fill="url(#colorInterest)" 
            />
            <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="mortgagePrincipalPaid" 
                name="Principal Paid" 
                stackId="1" 
                stroke="#8b5cf6" 
                fill="url(#colorPrincipal)" 
            />
            
            {/* Line for Remaining Balance */}
            <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="mortgageBalance" 
                name="Remaining Balance" 
                stroke="#1e293b" 
                strokeWidth={3} 
                dot={false} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};