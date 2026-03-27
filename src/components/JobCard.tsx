import { useAppStore, Job } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { MapPin, Clock, Flame, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

function formatSalary(salary: string): string {
  return Number(salary).toLocaleString();
}

function timeAgo(date: string, lang: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) {
    const mins = Math.floor(diff / 60000);
    return lang === 'en' ? `${mins}m ago` : lang === 'th' ? `${mins} นาทีที่แล้ว` : `${mins} ນາທີກ່ອນ`;
  }
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : lang === 'th' ? `${hours} ชม.ที่แล้ว` : `${hours} ຊມ.ກ່ອນ`;
  const days = Math.floor(hours / 24);
  return lang === 'en' ? `${days}d ago` : lang === 'th' ? `${days} วันที่แล้ว` : `${days} ມື້ກ່ອນ`;
}

export function JobCard({ job, index = 0 }: { job: Job; index?: number }) {
  const { language } = useAppStore();
  const district = districts.find(d => d.id === job.district);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`p-4 hover:shadow-lg transition-shadow border-l-4 ${job.is_featured ? 'border-l-accent bg-accent/5' : 'border-l-primary/50 hover:border-l-primary'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {job.is_featured && (
                <Badge className="gap-1 text-xs bg-accent text-accent-foreground">
                  <Star className="h-3 w-3" />
                  {language === 'en' ? 'Featured' : language === 'th' ? 'แนะนำ' : 'ແນະນຳ'}
                </Badge>
              )}
              {job.is_urgent && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <Flame className="h-3 w-3" />
                  {t('job.urgent', language)}
                </Badge>
              )}
              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-xs">
                {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(job.created_at, language)}
              </span>
            </div>

            <h3 className="font-semibold text-lg truncate">{job.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{t('job.postedBy', language)}: {job.poster_name}</p>

            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-primary font-semibold">
                💰 {formatSalary(job.salary)} {t(job.salary_type === 'day' ? 'job.perDay' : 'job.perMonth', language)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {district?.[language] || district?.lo}
              </span>
            </div>
          </div>

          <Link to={`/jobs/${job.id}`}>
            <Button size="sm">{t('job.detail', language)}</Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
