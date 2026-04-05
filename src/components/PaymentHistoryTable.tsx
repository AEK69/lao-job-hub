import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PaymentRecord {
  id: string;
  created_at: string;
  jobs: {
    job_number: string;
    customer_name: string;
    customer_phone: string;
    job_type: string;
    total_price: number;
    amount_paid: number;
    payment_status: string;
  };
  amount: number;
  method: string;
  reference_note: string | null;
}

interface PaymentHistoryTableProps {
  pageSize?: number;
  onRowClick?: (payment: PaymentRecord) => void;
  filterOverdue?: boolean;
}

export const PaymentHistoryTable = ({ pageSize = 20, onRowClick, filterOverdue = false }: PaymentHistoryTableProps) => {
  const { language } = useAppStore();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('payments')
          .select(`*, jobs(job_number, customer_name, customer_phone, job_type, total_price, amount_paid, payment_status)`)
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        setPayments((data as unknown as PaymentRecord[]) || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [filterOverdue]);

  useEffect(() => {
    let filtered = [...payments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.jobs?.job_number?.toLowerCase().includes(term) || p.jobs?.customer_name?.toLowerCase().includes(term));
    }
    if (methodFilter !== 'all') filtered = filtered.filter(p => p.method === methodFilter);
    setFilteredPayments(filtered);
    setCurrentPage(1);
  }, [payments, searchTerm, methodFilter]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + pageSize);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return t('ເງິນສົດ', 'Cash');
      case 'bcel': return 'BCEL One';
      case 'transfer': return t('ໂອນ', 'Transfer');
      default: return method;
    }
  };

  if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('ຊອກຫາ...', 'Search...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ທັງໝົດ', 'All')}</SelectItem>
            <SelectItem value="cash">{t('ເງິນສົດ', 'Cash')}</SelectItem>
            <SelectItem value="bcel">BCEL</SelectItem>
            <SelectItem value="transfer">{t('ໂອນ', 'Transfer')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-muted-foreground">
          {t(`ສະແດງ ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredPayments.length)} ຈາກ ${filteredPayments.length}`,
             `Showing ${startIndex + 1}-${Math.min(startIndex + pageSize, filteredPayments.length)} of ${filteredPayments.length}`)}
        </div>
      </div>
      {loading ? <div className="text-center py-8">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</div> : paginatedPayments.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed"><p className="text-muted-foreground">{t('ບໍ່ມີລາຍການ', 'No records')}</p></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t('ວັນທີ', 'Date')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('ເລກທີ່ງານ', 'Job #')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('ລູກຄ້າ', 'Customer')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('ຈຳນວນ', 'Amount')}</th>
                <th className="px-4 py-3 text-left font-semibold">{t('ວິທີ', 'Method')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onRowClick?.(p)}>
                  <td className="px-4 py-3">{formatDate(p.created_at, language)}</td>
                  <td className="px-4 py-3 font-semibold">{p.jobs?.job_number}</td>
                  <td className="px-4 py-3">{p.jobs?.customer_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(p.amount, language)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{getMethodLabel(p.method)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('ໜ້າ', 'Page')} {currentPage}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};
