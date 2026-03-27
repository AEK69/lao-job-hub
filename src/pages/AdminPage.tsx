import { useAppStore } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Briefcase, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const AdminPage = () => {
  const { language, jobs, deleteJob } = useAppStore();

  const handleDelete = (id: string, title: string) => {
    deleteJob(id);
    toast.success(`${t('admin.delete', language)}: ${title}`);
  };

  const stats = [
    { icon: <Briefcase className="h-5 w-5" />, value: jobs.length, label: t('admin.total', language), color: 'text-primary' },
    { icon: <Users className="h-5 w-5" />, value: jobs.filter(j => j.postType === 'hiring').length, label: t('stats.employers', language), color: 'text-accent' },
    { icon: <TrendingUp className="h-5 w-5" />, value: jobs.filter(j => j.postType === 'seeking').length, label: t('stats.seekers', language), color: 'text-success' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">⚙️ {t('admin.title', language)}</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat, i) => (
            <Card key={i} className="p-4 text-center">
              <div className={`flex justify-center mb-1 ${stat.color}`}>{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Job list */}
        <Card className="divide-y">
          {jobs.map((job, i) => {
            const district = districts.find(d => d.id === job.district);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{job.title}</span>
                    <Badge variant={job.postType === 'hiring' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {t(job.postType === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                    </Badge>
                    {job.isUrgent && <Badge variant="destructive" className="text-xs shrink-0">🔥</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.posterName} • {district?.[language] || district?.lo} • {job.phone}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(job.id, job.title)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            );
          })}
          {jobs.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {language === 'en' ? 'No jobs yet' : language === 'th' ? 'ยังไม่มีงาน' : 'ຍັງບໍ່ມີວຽກ'}
            </div>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
