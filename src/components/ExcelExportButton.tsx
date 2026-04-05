import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

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
  };
  amount: number;
  method: string;
  reference_note: string | null;
}

interface ExcelExportButtonProps {
  paymentRecords: PaymentRecord[];
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const ExcelExportButton = ({ paymentRecords, filename, variant = 'outline', size = 'default' }: ExcelExportButtonProps) => {
  const { language } = useAppStore();
  const [loading, setLoading] = useState(false);
  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const handleExport = async () => {
    try {
      setLoading(true);
      const data = paymentRecords.map((payment, idx) => ({
        [t('ລຳດັບ', '#')]: idx + 1,
        [t('ເລກທີ່ງານ', 'Job #')]: payment.jobs?.job_number || '—',
        [t('ລູກຄ້າ', 'Customer')]: payment.jobs?.customer_name || '—',
        [t('ຈຳນວນ', 'Amount')]: payment.amount,
        [t('ວິທີ', 'Method')]: payment.method,
        [t('ວັນທີ', 'Date')]: new Date(payment.created_at).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('ລາຍການຊຳລະ', 'Payments'));
      const exportFilename = filename || `workday-payments-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, exportFilename);
      toast.success(t('ສົ່ງອອກ Excel ສຳເລັດ', 'Excel export successful'));
    } catch (error) {
      toast.error(t('ເກີດຄວາມຜິດພາດ', 'Export error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading || paymentRecords.length === 0} variant={variant} size={size} className="gap-2">
      <Download className="w-4 h-4" />
      {loading ? t('ກຳລັງສົ່ງອອກ...', 'Exporting...') : 'Export Excel'}
    </Button>
  );
};
