import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: number; // percentage change
  colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
  className?: string;
}

const colorSchemes = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-700' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', value: 'text-emerald-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', value: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', value: 'text-purple-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700' },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorScheme = 'blue',
  className,
}: StatCardProps) {
  const colors = colorSchemes[colorScheme];

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-6 shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={cn('mt-2 text-3xl font-bold', colors.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp size={14} className="text-emerald-600" />
              ) : trend < 0 ? (
                <TrendingDown size={14} className="text-red-500" />
              ) : (
                <Minus size={14} className="text-gray-400" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400',
                )}
              >
                {trend > 0 ? '+' : ''}{trend}% vs last period
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl shrink-0', colors.bg)}>
            <span className={cn('block', colors.icon)}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
