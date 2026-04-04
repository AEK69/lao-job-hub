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
  payment_method: string;
  reference_note: string | null;
}

interface ExcelExportButtonProps {
  paymentRecords: PaymentRecord[];
  filename?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const ExcelExportButton = ({
  paymentRecords,
  filename,
  variant = 'outline',
  size = 'default',
}: ExcelExportButtonProps) => {
  const { language } = useAppStore();
  const [loading, setLoading] = useState(false);

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const handleExport = async () => {
    try {
      setLoading(true);

      // Prepare data for spreadsheet
      const data = paymentRecords.map((payment, idx) => ({
        [t('ລຳດັບ', 'Number')]: idx + 1,
        [t('ວັນທີ', 'Date')]: new Date(payment.created_at)
          .toLocaleDateString('lo-LA')
          .split('/')
          .reverse()
          .join('/'),
        [t('ເລກທີ່ງານ', 'Job #')]: payment.jobs?.job_number || '—',
        [t('ລູກຄ້າ', 'Customer')]: payment.jobs?.customer_name || '—',
        [t('ເບີໂທ', 'Phone')]: payment.jobs?.customer_phone || '—',
        [t('ປະເພດງານ', 'Job Type')]: payment.jobs?.job_type || '—',
        [t('ຍອດທັງໝົດ', 'Total')]: payment.jobs?.total_price || 0,
        [t('ຈ່າຍແລ້ວ', 'Paid')]: payment.jobs?.amount_paid || 0,
        [t('ຍັງຄ້າງ', 'Remaining')]: (payment.jobs?.total_price || 0) - (payment.jobs?.amount_paid || 0),
        [t('ວິທີຈ່າຍ', 'Method')]: getPaymentMethodLabel(payment.payment_method, language),
        [t('ສະຖານະ', 'Status')]: getPaymentStatus(payment.jobs?.amount_paid || 0, payment.jobs?.total_price || 0, language),
      }));

      // Add summary row
      const totalPaid = paymentRecords.reduce((sum, p) => sum + p.amount, 0);
      const totalRemaining = paymentRecords.reduce(
        (sum, p) =>
          sum +
          ((p.jobs?.total_price || 0) - (p.jobs?.amount_paid || 0)),
        0
      );

      data.push({
        [t('ລຳດັບ', 'Number')]: '',
        [t('ວັນທີ', 'Date')]: t('ລວມທັງໝົດ', 'TOTAL'),
        [t('ເລກທີ່ງານ', 'Job #')]: '',
        [t('ລູກຄ້າ', 'Customer')]: '',
        [t('ເບີໂທ', 'Phone')]: '',
        [t('ປະເພດງານ', 'Job Type')]: '',
        [t('ຍອດທັງໝົດ', 'Total')]: paymentRecords.reduce((sum, p) => sum + (p.jobs?.total_price || 0), 0),
        [t('ຈ່າຍແລ້ວ', 'Paid')]: totalPaid,
        [t('ຍັງຄ້າງ', 'Remaining')]: totalRemaining,
        [t('ວິທີຈ່າຍ', 'Method')]: '',
        [t('ສະຖານະ', 'Status')]: '',
      } as any);

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('ລາຍການຊຳລະ', 'Payments'));

      // Set column widths
      const colWidths = [8, 15, 12, 20, 15, 15, 15, 15, 15, 15, 15];
      ws['!cols'] = colWidths.map((w) => ({ wch: w }));

      // Format header row (bold)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;
        ws[address].s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFE8E8E8' } } };
      }

      // Generate filename
      const now = new Date();
      const exportFilename =
        filename || `workday-payments-${now.toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(wb, exportFilename);
      toast.success(t('ສົ່งออກ Excel ສຳເລັດ', 'Excel export successful'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('ເກີດຄວາມຜິດພາດໃນການສົ່ງອອກ', 'Error exporting file'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading || paymentRecords.length === 0}
      variant={variant}
      size={size}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      {loading ? t('ກຳລັງສົ່ງອອກ...', 'Exporting...') : t('Export Excel', 'Export Excel')}
    </Button>
  );
};

function getPaymentMethodLabel(method: string, language: string): string {
  switch (method) {
    case 'cash':
      return language === 'en' ? 'Cash' : 'ເງິນສົດ';
    case 'bcel':
      return 'BCEL One';
    case 'bank_transfer':
      return language === 'en' ? 'Bank Transfer' : 'ໂອນທະນາຄານ';
    default:
      return method;
  }
}

function getPaymentStatus(paid: number, total: number, language: string): string {
  if (paid >= total) {
    return language === 'en' ? 'Paid' : 'ຊຳລະຄົບ';
  } else if (paid > 0) {
    return language === 'en' ? 'Partial' : 'ຈ່າຍບາງສ່ວນ';
  } else {
    return language === 'en' ? 'Unpaid' : 'ຍັງບໍ່ຈ່າຍ';
  }
}
