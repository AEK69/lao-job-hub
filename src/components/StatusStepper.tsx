import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'pending', lo: 'ຮັບງານ', en: 'Pending' },
  { key: 'active', lo: 'ດຳເນີນ', en: 'Active' },
  { key: 'quality_check', lo: 'ກວດຄຸນ', en: 'QC' },
  { key: 'payment', lo: 'ຊຳລະ', en: 'Payment' },
  { key: 'done', lo: 'ປິດ', en: 'Done' },
];

const ORDER: Record<string, number> = { pending: 0, active: 1, quality_check: 2, payment: 3, done: 4, cancel: -1 };

export function StatusStepper({ status, language = 'lo' }: { status: string; language?: string }) {
  const currentIdx = ORDER[status] ?? -1;

  if (status === 'cancel') {
    return <div className="flex items-center gap-2 text-destructive font-semibold">❌ {language === 'en' ? 'Cancelled' : 'ຍົກເລີກແລ້ວ'}</div>;
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center min-w-[56px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done && 'bg-green-500 border-green-500 text-white',
                current && 'bg-primary border-primary text-primary-foreground',
                !done && !current && 'bg-muted border-muted-foreground/30 text-muted-foreground',
              )}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-[10px] mt-1 text-center leading-tight', current && 'font-semibold text-primary', done && 'text-green-600')}>
                {language === 'en' ? step.en : step.lo}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-0.5 w-6 mx-0.5', i < currentIdx ? 'bg-green-500' : 'bg-muted-foreground/20')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const JOB_STATUS_ORDER = ORDER;
export const ALLOWED_TRANSITIONS: Record<string, string> = {
  pending: 'active',
  active: 'quality_check',
  quality_check: 'payment',
  payment: 'done',
};
