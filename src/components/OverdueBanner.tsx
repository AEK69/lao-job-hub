import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OverdueBannerProps {
  onNavigateToPayments?: () => void;
}

export const OverdueBanner = ({ onNavigateToPayments }: OverdueBannerProps) => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    const fetchOverdueData = async () => {
      try {
        const { data, error } = await supabase.rpc('get_dashboard_notifications');
        if (error) throw error;

        const overdueData = data.find((d: any) => d.notification_type === 'overdue');
        if (overdueData) {
          setOverdueCount(overdueData.count);
          setOverdueTotal(overdueData.total_amount);
        }
      } catch (error) {
        console.error('Error fetching overdue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchOverdueData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || overdueCount === 0) return null;

  const handleNavigate = () => {
    onNavigateToPayments?.();
    navigate('/payments?filter=overdue');
  };

  return (
    <Alert className="bg-red-50 border-red-200 mb-6">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <div className="flex items-center justify-between w-full">
        <AlertDescription className="text-red-800 flex-1 ml-3">
          <span className="font-semibold">
            {t(
              `ມີ ${overdueCount} ງານທີ່ເກີນກຳນົດຊຳລະ — ລວມຍອດຄ້າງ ${overdueTotal.toLocaleString('en-US')} ກີບ`,
              `${overdueCount} overdue payments — Total pending ${overdueTotal.toLocaleString('en-US')} kip`
            )}
          </span>
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNavigate}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          {t('ເບິ່ງລາຍການ', 'View List')}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Alert>
  );
};
