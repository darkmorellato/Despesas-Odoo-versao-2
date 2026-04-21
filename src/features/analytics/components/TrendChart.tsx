import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense } from '@/shared/types';

interface TrendChartProps {
  expenses: Expense[];
}

export const TrendChart = ({ expenses }: TrendChartProps) => {
  const data = expenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleString('pt-BR', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.total += expense.amount;
    } else {
      acc.push({
        month,
        total: expense.amount
      });
    }
    return acc;
  }, [] as Array<{ month: string; total: number }>);

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Tendência Mensal</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis dataKey="month" className="text-sm dark:text-gray-300" />
          <YAxis className="text-sm dark:text-gray-300" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgb(31 41 55)', 
              border: '1px solid rgb(75 85 99)',
              borderRadius: '0.5rem'
            }}
            itemStyle={{ color: 'white' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Total (R$)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
