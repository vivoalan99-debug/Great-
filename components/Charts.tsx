import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { MonthLog } from '../features/simulation/domain/types';
import { formatMoney } from '../shared/utils/mathUtils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
             <span className="text-slate-500">{entry.name}:</span>
             <span className="font-mono font-medium">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CashflowChart = ({ data }: { data: MonthLog[] }) => {
  // Downsample for performance if needed
  const chartData = data.filter((_, i) => i % 3 === 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBuffer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMortgage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="dateStr" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis fontSize={10} tickFormatter={(val) => `${val/1000000}M`} tickLine={false} axisLine={false} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="bufferBalance" stackId="1" stroke="#10b981" fill="url(#colorBuffer)" name="Buffer" />
          <Area type="monotone" dataKey="emergencyBalance" stackId="1" stroke="#059669" fill="#059669" name="Emergency" />
          <Area type="monotone" dataKey="extraPaymentBucket" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Extra Bucket" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MortgageChart = ({ data }: { data: MonthLog[] }) => {
    const chartData = data.filter((_, i) => i % 6 === 0);
    return (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="dateStr" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickFormatter={(val) => `${val/1000000}M`} tickLine={false} axisLine={false} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" fontSize={10} />
              <Line type="monotone" dataKey="mortgageBalance" stroke="#1e293b" strokeWidth={2} dot={false} name="Principal" />
              <Line type="monotone" dataKey="mortgagePrincipalPaid" stroke="#8b5cf6" strokeWidth={1} dot={false} name="Paid to Principal" />
            </LineChart>
          </ResponsiveContainer>
        </div>
    );
};