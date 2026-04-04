import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { CreditCard, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentStats {
  monthlyRevenue: number;
  completedPayments: number;
  pendingBalance: number;
  overdueCount: number;
}

export const PaymentSummaryCards = () => {
  const { language } = useAppStore();
  const [stats, setStats] = useState<PaymentStats>({
    monthlyRevenue: 0,
    completedPayments: 0,
    pendingBalance: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get monthly revenue
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .gte('created_at', startOfMonth.toISOString());

        if (paymentsError) throw paymentsError;

        const monthlyRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        // Get completed payments count
        const { count: completedCount, error: completedError } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('payment_status', 'paid')
          .gte('updated_at', startOfMonth.toISOString());

        if (completedError) throw completedError;

        // Get pending balance
        const { data: pendingJobs, error: pendingError } = await supabase
          .from('jobs')
          .select('total_price, amount_paid')
          .neq('payment_status', 'paid')
          .neq('job_status', 'cancel');

        if (pendingError) throw pendingError;

        const pendingBalance = pendingJobs?.reduce(
          (sum, job) => sum + (job.total_price - job.amount_paid),
          0
        ) || 0;

        // Get overdue count
        const { count: overdueCount, error: overdueError } = await supabase
          .from('overdue_jobs')
          .select('*', { count: 'exact', head: true });

        if (overdueError) throw overdueError;

        setStats({
          monthlyRevenue,
          completedPayments: completedCount || 0,
          pendingBalance,
          overdueCount: overdueCount || 0,
        });
      } catch (error) {
        console.error('Error fetching payment stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: t('ລາຍຮັບເດືອນນີ້', 'Monthly Revenue'),
      icon: TrendingUp,
      value: formatCurrency(stats.monthlyRevenue, language),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: t('ຈ່າຍຄົບ', 'Completed'),
      icon: CheckCircle2,
      value: stats.completedPayments.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      unit: t('ງານ', 'jobs'),
    },
    {
      title: t('ຍັງຄ້າງທັງໝົດ', 'Pending Balance'),
      icon: CreditCard,
      value: formatCurrency(stats.pendingBalance, language),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      title: t('ຄ້າງເກີນກຳນົດ', 'Overdue'),
      icon: AlertCircle,
      value: stats.overdueCount.toString(),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      unit: t('ງານ', 'jobs'),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4 w-20" />
            <div className="h-8 bg-gray-200 rounded w-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className={`p-6 border-2 ${card.bgColor} ${card.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                {card.unit && (
                  <p className="text-xs text-gray-500 mt-1">{card.unit}</p>
                )}
              </div>
              <Icon className={`w-8 h-8 ${card.color} opacity-20`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};
