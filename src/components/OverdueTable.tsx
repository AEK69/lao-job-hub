import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { daysOverdue, formatCurrency } from '@/lib/utils';

interface OverdueJob {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  total_price: number;
  amount_paid: number;
  remaining_balance: number;
  days_overdue: number;
  staff_name: string | null;
  scheduled_date: string;
}

interface OverdueTableProps {
  onPaymentClick?: (jobId: string, customerName: string) => void;
}

export const OverdueTable = ({ onPaymentClick }: OverdueTableProps) => {
  const { language } = useAppStore();
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchOverdue = async () => {
      try {
        setLoading(true);
        const { data, error: queryError } = await supabase
          .from('overdue_jobs')
          .select('*')
          .order('days_overdue', { ascending: false });

        if (queryError) throw queryError;
        setOverdueJobs((data as OverdueJob[]) || []);
      } catch (err: any) {
        console.error('Error fetching overdue jobs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdue();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('overdue_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        () => {
          fetchOverdue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSeverityColor = (days: number) => {
    if (days <= 3) return 'bg-yellow-50';
    if (days <= 7) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const getSeverityBandge = (days: number) => {
    if (days <= 3) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    if (days <= 7) return { bg: 'bg-orange-100', text: 'text-orange-800' };
    return { bg: 'bg-red-100', text: 'text-red-800' };
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <div className="text-center py-8">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</div>;
  }

  if (overdueJobs.length === 0) {
    return (
      <Card className="p-8 text-center border-2 border-dashed border-green-200">
        <p className="text-green-700 font-medium">
          {t('ບໍ່ມີງານທີ່ເກີນກຳນົດ', 'No overdue jobs')}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                {t('ເລກທີ', 'Job #')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                {t('ລູກຄ້າ', 'Customer')}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                {t('ຍອດຄ້າງ', 'Balance')}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                {t('ເກີນມາ', 'Overdue')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                {t('ພະນັກງານ', 'Staff')}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                {t('ຈັດການ', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {overdueJobs.map((job) => {
              const severity = getSeverityBandge(job.days_overdue);
              return (
                <tr
                  key={job.id}
                  className={`border-b hover:bg-gray-50 transition ${getSeverityColor(job.days_overdue)}`}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      {job.job_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{job.customer_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">
                    {formatCurrency(job.remaining_balance, language)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`${severity.bg} ${severity.text} border-0`}>
                      {t(`${job.days_overdue} ວັນ`, `${job.days_overdue}d`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {job.staff_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => onPaymentClick?.(job.id, job.customer_name)}
                    >
                      {t('ຮັບຊຳລະ', 'Payment')}
                    </Button>
                    <a href={`tel:${job.customer_phone}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        title={t('ໂທຫາລູກຄ້າ', 'Call customer')}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          {
            label: t('1-3 ວັນ', '1-3 Days'),
            color: 'bg-yellow-50 border-yellow-200',
            badge: 'bg-yellow-100 text-yellow-800',
          },
          {
            label: t('4-7 ວັນ', '4-7 Days'),
            color: 'bg-orange-50 border-orange-200',
            badge: 'bg-orange-100 text-orange-800',
          },
          {
            label: t('8+ ວັນ', '8+ Days'),
            color: 'bg-red-50 border-red-200',
            badge: 'bg-red-100 text-red-800',
          },
        ].map((item, idx) => {
          const count = overdueJobs.filter((job) => {
            const days = job.days_overdue;
            return idx === 0
              ? days <= 3
              : idx === 1
                ? days <= 7
                : days > 7;
          }).length;

          return (
            <Card key={idx} className={`p-4 border-2 ${item.color}`}>
              <p className="text-sm text-gray-600 mb-2">{item.label}</p>
              <div className={`${item.badge} px-3 py-1 rounded text-lg font-bold inline-block`}>
                {count}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
