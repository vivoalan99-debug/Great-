import React from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell 
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatMoney } from '../services/mathUtils';
import { Card } from './ui/Card';

export const InterestSavedChart = () => {
  const { simulationResult } = useStore();
  
  if (!simulationResult) return null;
  
  const { yearLogs } = simulationResult;
  
  // Calculate Cumulative Data for visualization
  let runningTotal = 0;
  const chartData = yearLogs.map(log => {
      runningTotal += log.interestSaved;
      return {
          ...log,
          displayYear: 2026 + log.year,
          cumulativeSaved: runningTotal
      };
  });

  const totalSaved = runningTotal;

  return (
    <Card title="Mortgage Interest Saved Analysis" className="flex flex-col h-[400px]">
      <div className="flex justify-between items-end mb-4">
          <div>
              <p className="text-sm text-slate-500">Cumulative Interest Saved</p>
              <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalSaved)}</p>
          </div>
          {chartData.length === 0 && (
             <p className="text-xs text-slate-400 italic">No extra payments triggered yet.</p>
          )}
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="displayYear" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
            />
            <YAxis 
                yAxisId="left" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Annual (IDR)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }} 
            />
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} 
                tickLine={false} 
                axisLine={false} 
            />
            <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [
                    formatMoney(value), 
                    name === 'cumulativeSaved' ? 'Cumulative Saved' : 'Saved This Year'
                ]}
                labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
            />
            <Legend iconType="circle" fontSize={10} />
            
            <Bar 
                yAxisId="left"
                dataKey="interestSaved" 
                name="Annual Interest Saved" 
                fill="#34d399" 
                radius={[4, 4, 0, 0]}
                barSize={30}
            >
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fillOpacity={0.8} />
                 ))}
            </Bar>
            <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cumulativeSaved" 
                name="Cumulative Saved" 
                stroke="#059669" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};