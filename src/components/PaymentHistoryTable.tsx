import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
} from 'lucide-react';
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
  payment_method: string;
  reference_note: string | null;
}

interface PaymentHistoryTableProps {
  pageSize?: number;
  onRowClick?: (payment: PaymentRecord) => void;
  filterOverdue?: boolean;
}

export const PaymentHistoryTable = ({
  pageSize = 20,
  onRowClick,
  filterOverdue = false,
}: PaymentHistoryTableProps) => {
  const { language } = useAppStore();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('payments')
          .select(
            `
            *,
            jobs(
              job_number,
              customer_name,
              customer_phone,
              job_type,
              total_price,
              amount_paid,
              payment_status,
              scheduled_date
            )
          `
          )
          .order('created_at', { ascending: false });

        // If filtering overdue, only get payments for overdue jobs
        if (filterOverdue) {
          const { data: overdueJobIds } = await supabase
            .from('overdue_jobs')
            .select('id');

          if (overdueJobIds && overdueJobIds.length > 0) {
            const ids = overdueJobIds.map((j) => j.id);
            query = query.in('job_id', ids);
          }
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setPayments((data as PaymentRecord[]) || []);
      } catch (err: any) {
        console.error('Error fetching payments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filterOverdue]);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.jobs.job_number.toLowerCase().includes(term) ||
          p.jobs.customer_name.toLowerCase().includes(term) ||
          p.jobs.customer_phone.includes(term)
      );
    }

    // Payment method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter((p) => p.payment_method === methodFilter);
    }

    // Payment status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.jobs.payment_status === statusFilter);
    }

    setFilteredPayments(filtered);
    setCurrentPage(1);
  }, [payments, searchTerm, methodFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return t('ເງິນສົດ', 'Cash');
      case 'bcel':
        return 'BCEL One';
      case 'bank_transfer':
        return t('ໂອນທະນາຄານ', 'Bank Transfer');
      default:
        return method;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'deposited':
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return t('ຊຳລະຄົບ', 'Paid');
      case 'deposited':
        return t('ຄຳນຳ', 'Deposit');
      case 'partial':
        return t('ຈ່າຍບາງສ່ວນ', 'Partial');
      case 'unpaid':
        return t('ຍັງບໍ່ຈ່າຍ', 'Unpaid');
      default:
        return status;
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('ຊອກຫາເລກທີ, ລູກຄ້າ, ໂທ...', 'Search job, customer, phone...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Payment Method Filter */}
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ທັງໝົດ', 'All Methods')}</SelectItem>
            <SelectItem value="cash">{t('ເງິນສົດ', 'Cash')}</SelectItem>
            <SelectItem value="bcel">BCEL One</SelectItem>
            <SelectItem value="bank_transfer">
              {t('ໂອນທະນາຄານ', 'Bank Transfer')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Payment Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ທັງໝົດ', 'All Status')}</SelectItem>
            <SelectItem value="paid">{t('ຊຳລະຄົບ', 'Paid')}</SelectItem>
            <SelectItem value="partial">{t('ຈ່າຍບາງສ່ວນ', 'Partial')}</SelectItem>
            <SelectItem value="deposited">{t('ຄຳນຳ', 'Deposit')}</SelectItem>
            <SelectItem value="unpaid">{t('ຍັງບໍ່ຈ່າຍ', 'Unpaid')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Result count */}
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground">
            {t(
              `ສະແດງ ${startIndex + 1}-${Math.min(endIndex, filteredPayments.length)} ຈາກ ${filteredPayments.length}`,
              `Showing ${startIndex + 1}-${Math.min(endIndex, filteredPayments.length)} of ${filteredPayments.length}`
            )}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</div>
      ) : paginatedPayments.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed">
          <p className="text-muted-foreground">{t('ບໍ່ມີລາຍການ', 'No records found')}</p>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {t('ວັນທີ', 'Date')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {t('ເລກທີ່ງານ', 'Job #')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {t('ລູກຄ້າ', 'Customer')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    {t('ຈຳນວນ', 'Amount')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {t('ວິທີ', 'Method')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {t('ໝາຍເຫດ', 'Note')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    {t('ສະຖານະ', 'Status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => onRowClick?.(payment)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                      {formatDate(payment.created_at, language)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {payment.jobs.job_number}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{payment.jobs.customer_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {formatCurrency(payment.amount, language)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {payment.reference_note || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={getStatusColor(payment.jobs.payment_status)}>
                        {getStatusLabel(payment.jobs.payment_status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {t('ໜ້າ', 'Page')} {currentPage} {t('ຈາກ', 'of')} {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('ກຸ່ມກ່ອນ', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('ກຸ່ມຕໍ່ໄປ', 'Next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
