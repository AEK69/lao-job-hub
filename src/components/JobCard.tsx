import { useAppStore, Job } from '@/lib/store';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { timeAgo } from '@/lib/constants';

export function JobCard({ job, index = 0 }: { job: Job; index?: number }) {
  const { language } = useAppStore();
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const priorityColor = job.priority === 'critical' ? 'border-l-red-500' : job.priority === 'urgent' ? 'border-l-orange-500' : 'border-l-primary/50';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className={`p-4 hover:shadow-lg transition-shadow border-l-4 ${priorityColor}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {job.priority !== 'normal' && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {job.priority === 'critical' ? l('ວິກິດ', 'วิกฤต', 'Critical') : l('ດ່ວນ', 'เร่งด่วน', 'Urgent')}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{job.job_type}</Badge>
              <Badge variant={job.job_status === 'done' ? 'default' : 'secondary'} className="text-xs">{job.job_status}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(job.created_at, language as 'en' | 'th' | 'lo')}
              </span>
            </div>
            <h3 className="font-semibold text-lg truncate">{job.job_number}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{job.customer_name} • {job.customer_phone}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-primary font-semibold">💰 {(job.total_price || 0).toLocaleString()}₭</span>
              <Badge variant={job.payment_status === 'paid' ? 'default' : 'outline'} className="text-xs">{job.payment_status}</Badge>
            </div>
          </div>
          <Link to={`/jobs/${job.id}`}>
            <Button size="sm">{l('ເບິ່ງ', 'ดู', 'View')}</Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
