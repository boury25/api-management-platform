'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  timestamp: string;
  statusCode: number;
  responseTime: number;
}

interface RequestsChartProps {
  data: DataPoint[];
}

function aggregateByHour(data: DataPoint[]) {
  const buckets: Record<string, { time: string; requests: number; errors: number }> = {};

  data.forEach((point) => {
    const hour = format(new Date(point.timestamp), 'MM/dd HH:00');
    if (!buckets[hour]) {
      buckets[hour] = { time: hour, requests: 0, errors: 0 };
    }
    buckets[hour].requests++;
    if (point.statusCode >= 400) {
      buckets[hour].errors++;
    }
  });

  return Object.values(buckets).slice(-24); // Last 24 hours
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function RequestsChart({ data }: RequestsChartProps) {
  const chartData = aggregateByHour(data);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available for the selected period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="requests"
          name="Requests"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#colorRequests)"
        />
        <Area
          type="monotone"
          dataKey="errors"
          name="Errors"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#colorErrors)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
