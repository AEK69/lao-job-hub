import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import ReceiptDocument from './ReceiptDocument';
import { Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ReceiptButtonProps {
  jobNumber: string;
  paymentId: string;
  customerName: string;
  customerPhone: string;
  jobType: string;
  scheduledDate: string;
  basePrice: number;
  materialCost: number;
  discount: number;
  totalPrice: number;
  thisPaymentAmount: number;
  totalPaid: number;
  paymentMethod: string;
  referenceNote?: string;
  receivedByName: string;
  createdAt: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const ReceiptButton = ({
  jobNumber,
  paymentId,
  customerName,
  customerPhone,
  jobType,
  scheduledDate,
  basePrice,
  materialCost,
  discount,
  totalPrice,
  thisPaymentAmount,
  totalPaid,
  paymentMethod,
  referenceNote,
  receivedByName,
  createdAt,
  variant = 'outline',
  size = 'sm',
}: ReceiptButtonProps) => {
  const { language } = useAppStore();
  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const fileName = `receipt-${jobNumber}-${new Date().toISOString().split('T')[0]}.pdf`;

  const receiptDoc = (
    <ReceiptDocument
      jobNumber={jobNumber}
      paymentId={paymentId}
      customerName={customerName}
      customerPhone={customerPhone}
      jobType={jobType}
      scheduledDate={scheduledDate}
      basePrice={basePrice}
      materialCost={materialCost}
      discount={discount}
      totalPrice={totalPrice}
      thisPaymentAmount={thisPaymentAmount}
      totalPaid={totalPaid}
      paymentMethod={paymentMethod}
      referenceNote={referenceNote}
      receivedByName={receivedByName}
      createdAt={createdAt}
    />
  );

  return (
    <PDFDownloadLink document={receiptDoc} fileName={fileName}>
      {({ loading }) => (
        <Button
          variant={variant}
          size={size}
          disabled={loading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {loading ? (
            <span className="text-xs">{t('ກຳລັງສ້າງ...', 'Creating...')}</span>
          ) : (
            t('ພິມໃບຮັບ PDF', 'Print Receipt')
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
