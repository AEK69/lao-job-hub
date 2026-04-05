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
  method: string;
  payment_type: string | null;
  reference_note: string | null;
  received_by: string | null;
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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [jobId]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return t('ເງິນສົດ', 'Cash');
      case 'bcel': return 'BCEL One';
      case 'transfer': return t('ໂອນທະນາຄານ', 'Transfer');
      default: return method;
    }
  };

  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
  if (loading) return <div className="text-center py-8 text-muted-foreground">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</div>;
  if (payments.length === 0) return <Card className="p-8 text-center border-2 border-dashed"><p className="text-muted-foreground">{t('ຍັງບໍ່ມີການຊຳລະ', 'No payments recorded yet')}</p></Card>;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t('ວັນທີ-ເວລາ', 'Date & Time')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('ຈຳນວນ', 'Amount')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('ວິທີ', 'Method')}</th>
              <th className="px-4 py-3 text-left font-medium">{t('ໝາຍເຫດ', 'Note')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-muted/30 transition">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(payment.created_at, language)}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">{payment.amount.toLocaleString()} ₭</td>
                <td className="px-4 py-3"><span className="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs font-medium">{getMethodLabel(payment.method)}</span></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{payment.reference_note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-muted/50 px-4 py-3 border-t flex justify-between items-center">
        <span className="text-sm font-medium">{t('ລວມທັງໝົດ', 'Total')}</span>
        <span className="text-lg font-bold text-primary">{totalPaid.toLocaleString()} ₭</span>
      </div>
    </Card>
  );
};
