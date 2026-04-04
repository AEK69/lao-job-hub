import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentFormProps {
  jobId: string;
  jobNumber: string;
  customerName: string;
  totalPrice: number;
  amountPaid: number;
  onPaymentSuccess?: () => void;
}

export const PaymentForm = ({
  jobId,
  jobNumber,
  customerName,
  totalPrice,
  amountPaid,
  onPaymentSuccess,
}: PaymentFormProps) => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  const remaining = totalPrice - amountPaid;
  const maxAmount = remaining;

  const paymentMethods = [
    { value: 'cash', label: t('ເງິນສົດ', 'Cash') },
    { value: 'bcel', label: t('BCEL One', 'BCEL One') },
    { value: 'bank_transfer', label: t('ໂອນທະນາຄານ', 'Bank Transfer') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('ຈຳນວນຕ້ອງໃຫຍ່ກວ່າ 0', 'Amount must be greater than 0'));
      return;
    }

    if (amountNum > maxAmount) {
      setError(
        t(
          `ຈຳນວນເກີນກວ່າຍອດທີ່ຄ້າງ (ສູງສຸດ: ${maxAmount.toLocaleString('en-US')} ກີບ)`,
          `Amount exceeds remaining balance (max: ${maxAmount.toLocaleString('en-US')} kip)`
        )
      );
      return;
    }

    if (!paymentMethod) {
      setError(t('ກະລຸນາເລືອກວິທີຈ່າຍ', 'Please select a payment method'));
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          job_id: jobId,
          amount: Math.round(amountNum),
          payment_method: paymentMethod,
          reference_note: referenceNote || null,
          received_by_id: user?.id,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success(
        t(
          `ຮັບຊຳລະ ${amountNum.toLocaleString('en-US')} ກີບ ສຳເລັດ`,
          `Received payment ${amountNum.toLocaleString('en-US')} kip successfully`
        )
      );

      // Reset form
      setAmount('');
      setPaymentMethod('cash');
      setReferenceNote('');

      // Callback
      onPaymentSuccess?.();
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(
        t('ເກີດຄວາມຜິດພາດໃນການບັນທຶກ', 'Error recording payment') +
          ': ' +
          err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const isPaid = amountPaid >= totalPrice;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Payment Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">{t('ຍອດທັງໝົດ', 'Total')}</p>
            <p className="text-lg font-bold">
              {totalPrice.toLocaleString('en-US')} {t('ກີບ', 'kip')}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground">{t('ຈ່າຍແລ້ວ', 'Paid')}</p>
            <p className="text-lg font-bold text-blue-700">
              {amountPaid.toLocaleString('en-US')} {t('ກີບ', 'kip')}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isPaid ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm text-muted-foreground">{t('ຍັງຄ້າງ', 'Remaining')}</p>
            <p className={`text-lg font-bold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
              {remaining.toLocaleString('en-US')} {t('ກີບ', 'kip')}
            </p>
          </div>
        </div>

        {/* Paid Banner */}
        {isPaid && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('ຊຳລະຄົບແລ້ວ — ສາມາດປິດງານໄດ້', 'Fully paid — job can be closed')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        {!isPaid && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="font-medium">
                {t('ຈຳນວນທີ່ຈ່າຍ', 'Payment Amount')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder={t('ກະລຸນາປ້ອນຈຳນວນ', 'Enter amount')}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                disabled={loading}
                max={maxAmount}
                step="1"
                min="1"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                {t('ສູງສຸດ', 'Max')}: {maxAmount.toLocaleString('en-US')} {t('ກີບ', 'kip')}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method" className="font-medium">
                {t('ວິທີຈ່າຍ', 'Payment Method')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
                <SelectTrigger id="method" className="h-10">
                  <SelectValue placeholder={t('ເລືອກວິທີ', 'Select method')} />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="font-medium">
                {t('ໝາຍເຫດ / ເລກອ້າງອີງ', 'Reference Note')}
              </Label>
              <Textarea
                id="note"
                placeholder={t('ໂອນລຳ, ເຊັກທີ, ແລະອື່ນ', 'Ref. number, cheque #, etc.')}
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                disabled={loading}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!amount || !paymentMethod || loading}
              className="w-full h-10 font-medium"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  {t('ກຳລັງບັນທຶກ...', 'Recording...')}
                </span>
              ) : (
                t('ບັນທຶກການຮັບຊຳລະ', 'Record Payment')
              )}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};
