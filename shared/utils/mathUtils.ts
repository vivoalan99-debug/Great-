export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercent = (val: number): string => {
  return `${val.toFixed(2)}%`;
};

export const calculatePMT = (principal: number, annualRate: number, monthsRemaining: number): number => {
  if (monthsRemaining <= 0) return 0;
  if (principal <= 0) return 0;
  
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / monthsRemaining;

  const pow = Math.pow(1 + r, monthsRemaining);
  return (principal * r * pow) / (pow - 1);
};