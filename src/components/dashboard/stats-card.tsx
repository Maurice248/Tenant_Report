import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { outreachCardClass } from '@/components/outreach/page-body';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  className?: string;
  iconClassName?: string;
  variant?: 'dashboard' | 'outreach';
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
  variant = 'dashboard',
}: StatsCardProps) {
  const isOutreach = variant === 'outreach';

  return (
    <Card
      className={cn(
        isOutreach ? outreachCardClass : 'hover:shadow-md transition-shadow',
        className
      )}
    >
      <CardHeader
        className={cn(
          'flex flex-row items-start justify-between space-y-0',
          isOutreach ? 'p-5 pb-2' : 'pb-2'
        )}
      >
        <CardTitle
          className={cn(
            'font-medium leading-snug text-gray-600',
            isOutreach ? 'text-[13px]' : 'text-sm'
          )}
        >
          {title}
        </CardTitle>
        <div className={cn('rounded-lg bg-[#0077b6]/10 p-2', iconClassName)}>
          <Icon className="h-5 w-5 text-[#0077b6]" />
        </div>
      </CardHeader>
      <CardContent className={cn(isOutreach && 'px-5 pb-5 pt-0')}>
        <div className={cn('font-bold text-gray-900', isOutreach ? 'text-[32px]' : 'text-3xl')}>
          {value}
        </div>
        {subtitle && (
          <p className={cn('mt-1 text-gray-500', isOutreach ? 'text-[13px]' : 'text-xs')}>
            {subtitle}
          </p>
        )}
        {trend && (
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              trend.positive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
