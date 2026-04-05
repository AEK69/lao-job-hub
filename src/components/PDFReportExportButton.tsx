import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyReportDocument } from './MonthlyReportDocument';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface PDFReportExportButtonProps {
  month: string;
  year: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const PDFReportExportButton = ({
  month,
  year,
  variant = 'outline',
  size = 'default',
}: PDFReportExportButtonProps) => {
  const { language } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const handleGenerateReport = async () => {
    try {
      setLoading(true);

      // Get date range for the month
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      // Fetch all payments for the month
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(
          `
          *,
          jobs(job_number, customer_name, job_type)
        `
        )
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch jobs stats for the month
      const { data: jobsStats, error: jobsError } = await supabase
        .from('jobs')
        .select('job_status, payment_status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (jobsError) throw jobsError;

      // Calculate statistics
      const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const cashPayments = payments
        ?.filter((p) => p.method === 'cash')
        .reduce((sum, p) => sum + p.amount, 0) || 0;
      const bcelPayments = payments
        ?.filter((p) => p.method === 'bcel')
        .reduce((sum, p) => sum + p.amount, 0) || 0;
      const bankPayments = payments
        ?.filter((p) => p.method === 'transfer')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

      const completedJobs = jobsStats?.filter((j) => j.job_status === 'done').length || 0;
      const cancelledJobs = jobsStats?.filter((j) => j.job_status === 'cancel').length || 0;
      const pendingJobs = jobsStats?.filter(
        (j) => j.job_status !== 'done' && j.job_status !== 'cancel'
      ).length || 0;

      const data = {
        month,
        year,
        totalPayments: payments?.length || 0,
        totalRevenue,
        completedJobs,
        cancelledJobs,
        pendingJobs,
        cashPayments,
        bcelPayments,
        bankPayments,
        details: (payments || []).map((p: any) => ({
          date: new Date(p.created_at).toLocaleDateString('lo-LA'),
          jobNumber: p.jobs?.job_number || '—',
          customer: p.jobs?.customer_name || '—',
          amount: p.amount,
          method: getMethodLabel(p.method, language),
        })),
      };

      setReportData(data);
      toast.success(t('ບັນລາຍງານສິ້ນສຸດ — ກຳລັງດາວໂຫຼດ', 'Report ready - starting download'));
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error(t('ເກີດຄວາມຜິດພາດ', 'Error generating report'));
    } finally {
      setLoading(false);
    }
  };

  if (!reportData) {
    return (
      <Button
        onClick={handleGenerateReport}
        disabled={loading}
        variant={variant}
        size={size}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        {loading ? (
          <span>{t('ກຳລັງບັນລາຍງານ...', 'Generating...')}</span>
        ) : (
          t('ສ້າງລາຍງານ PDF', 'Generate PDF')
        )}
      </Button>
    );
  }

  const fileName = `workday-report-${year}-${month.padStart(2, '0')}.pdf`;

  return (
    <PDFDownloadLink
      document={<MonthlyReportDocument data={reportData} />}
      fileName={fileName}
    >
      {({ loading: pdfLoading }) => (
        <Button
          disabled={pdfLoading}
          variant={variant}
          size={size}
          className="gap-2"
          onClick={() => setReportData(null)} // Reset after download
        >
          <Download className="w-4 h-4" />
          {pdfLoading ? (
            <span>{t('ກຳລັງດາວໂຫຼດ...', 'Downloading...')}</span>
          ) : (
            t('ດາວໂຫຼດ PDF', 'Download PDF')
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
};

function getMethodLabel(method: string, language: string): string {
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
