'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StatusCodeData {
  statusCode: number;
  _count: { statusCode: number };
}

interface StatusCodeChartProps {
  data: StatusCodeData[];
}

function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return '#10b981';
  if (code >= 300 && code < 400) return '#3b82f6';
  if (code >= 400 && code < 500) return '#f59e0b';
  if (code >= 500) return '#ef4444';
  return '#6b7280';
}

export function StatusCodeChart({ data }: StatusCodeChartProps) {
  const chartData = data.map((item) => ({
    name: String(item.statusCode),
    value: item._count.statusCode,
    color: getStatusColor(item.statusCode),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value, `HTTP ${name}`]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
          }}
        />
        <Legend
          formatter={(value) => `HTTP ${value}`}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
