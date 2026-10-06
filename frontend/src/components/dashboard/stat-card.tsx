import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, iconBg }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {change && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                changeType === 'positive' && 'text-emerald-400',
                changeType === 'negative' && 'text-red-400',
                changeType === 'neutral' && 'text-slate-400',
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', iconBg)}>{icon}</div>
      </div>
    </div>
  );
}
