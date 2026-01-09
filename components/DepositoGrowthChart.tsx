import React from 'react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatMoney } from '../services/mathUtils';
import { Card } from './ui/Card';

export const DepositoGrowthChart = () => {
  const { simulationResult, mortgage, setMortgage } = useStore();
  
  if (!simulationResult) return null;
  
  const { logs } = simulationResult;
  // Use all logs to preserve the sawtooth detail of extra payments
  const chartData = logs; 
  
  const totalInterestEarned = logs[logs.length - 1]?.cumulativeDepositoInterest || 0;

  // Calculate ticks for the start of each year (MonthIndex 0, 12, 24...)
  const yearTicks = logs
    .filter(log => log.monthIndex % 12 === 0)
    .map(log => log.dateStr);

  return (
    <Card title="Extra Payment & Interest Analysis" className="flex flex-col h-[450px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        
        {/* Toggle Switch */}
        <div className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100 transition-colors hover:bg-slate-100">
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={mortgage.useDeposito}
                  onChange={(e) => setMortgage({...mortgage, useDeposito: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <div className="ml-3 flex flex-col">
                    <span className="text-sm font-medium text-slate-700">High Yield Savings (Deposito)</span>
                    <span className="text-xs text-slate-400">Yield 6% p.a. on idle funds</span>
                </div>
            </label>
        </div>

        {/* Summary Stat */}
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Interest Earned</p>
                <p className={`text-xl font-bold ${totalInterestEarned > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                    {formatMoney(totalInterestEarned)}
                </p>
            </div>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBucket" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* Enable vertical grid lines to visualize year boundaries */}
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
            <XAxis 
                dataKey="dateStr" 
                fontSize={10} 
                tickLine={true} 
                axisLine={false} 
                ticks={yearTicks}
                tickFormatter={(val) => val.split(' ')[1]}
            />
            <YAxis 
                yAxisId="left" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Bucket Balance (IDR)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }} 
            />
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                fontSize={10} 
                tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} 
                tickLine={false} 
                axisLine={false} 
                hide={!mortgage.useDeposito}
                domain={['auto', 'auto']}
            />
            <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number, name: string) => [
                    formatMoney(value), 
                    name === 'cumulativeDepositoInterest' ? 'Total Interest Earned' : 'Extra Payment Bucket'
                ]}
                labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}
            />
            <Legend iconType="circle" fontSize={10} wrapperStyle={{ paddingTop: '10px' }}/>
            
            <Area 
                yAxisId="left"
                type="linear" 
                dataKey="extraPaymentBucket" 
                name="Extra Payment Bucket" 
                stroke="#3b82f6" 
                fill="url(#colorBucket)" 
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={1000}
                animationEasing="ease-in-out"
            />
            {mortgage.useDeposito && (
                <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumulativeDepositoInterest" 
                    name="Cumulative Interest" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    dot={false}
                    strokeDasharray="4 4"
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};