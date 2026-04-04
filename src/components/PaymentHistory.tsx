import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  job_id: string;
  amount: number;
  payment_method: string;
  reference_note: string | null;
  received_by_id: string | null;
  created_at: string;
}

interface PaymentHistoryProps {
  jobId: string;
  onPaymentsLoaded?: (payments: Payment[]) => void;
}

export const PaymentHistory = ({ jobId, onPaymentsLoaded }: PaymentHistoryProps) => {
  const { language } = useAppStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setPayments(data || []);
        onPaymentsLoaded?.(data || []);
      } catch (err: any) {
        console.error('Error fetching payments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`payments:job_id=eq.${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setPayments((prev) => [payload.new as Payment, ...prev]);
          onPaymentsLoaded?.([payload.new as Payment, ...payments]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return t('ເງິນສົດ', 'Cash');
      case 'bcel':
        return t('BCEL One', 'BCEL One');
      case 'bank_transfer':
        return t('ໂອນທະນາຄານ', 'Bank Transfer');
      default:
        return method;
    }
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
    return <div className="text-center py-8 text-muted-foreground">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</div>;
  }

  if (payments.length === 0) {
    return (
      <Card className="p-8 text-center border-2 border-dashed">
        <p className="text-muted-foreground">{t('ຍັງບໍ່ມີການຊຳລະ', 'No payments recorded yet')}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                {t('ວັນທີ-ເວລາ', 'Date & Time')}
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                {t('ຈຳນວນ', 'Amount')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                {t('ວິທີ', 'Method')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                {t('ໝາຍເຫດ', 'Note')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">
                {t('ໃບຮັບ', 'Receipt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                  {formatDate(payment.created_at, language)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-700">
                  {payment.amount.toLocaleString('en-US')} {t('ກີບ', 'kip')}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {getPaymentMethodLabel(payment.payment_method)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {payment.reference_note || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title={t('ດາວໂຫຼດໃບຮັບ', 'Download receipt')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {t('ລວມທັງໝົດ', 'Total')}
        </span>
        <span className="text-lg font-bold text-green-700">
          {totalPaid.toLocaleString('en-US')} {t('ກີບ', 'kip')}
        </span>
      </div>
    </Card>
  );
};
