import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Activity, Users, TrendingUp, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { timeAgo } from '@/lib/constants';

interface DashStats {
  totalJobs: number; activeJobs: number; doneJobs: number; monthRevenue: number;
  unpaidTotal: number; urgentJobs: number; availableStaff: number; overdueCount: number;
}

interface AuditLog { id: string; action: string; target_table: string | null; target_id: string | null; created_at: string; }
interface TodayJob { id: string; job_number: string; customer_name: string; job_type: string; scheduled_time: string | null; job_status: string; assigned_staff_id: string | null; }

const DashboardPage = () => {
  const { language } = useAppStore();
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<DashStats>({ totalJobs: 0, activeJobs: 0, doneJobs: 0, monthRevenue: 0, unpaidTotal: 0, urgentJobs: 0, availableStaff: 0, overdueCount: 0 });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [chartData, setChartData] = useState<{ day: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  const loadDashboard = async () => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    const [jobsRes, paymentsRes, staffRes, logsRes, todayRes] = await Promise.all([
      supabase.from('jobs').select('id, job_status, payment_status, total_price, amount_paid, priority, scheduled_date, created_at').gte('created_at', monthStart),
      supabase.from('payments').select('amount, created_at').gte('created_at', monthStart),
      supabase.from('staff').select('id, status'),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('jobs').select('id, job_number, customer_name, job_type, scheduled_time, job_status, assigned_staff_id').eq('scheduled_date', today).order('scheduled_time'),
    ]);

    const jobs = jobsRes.data || [];
    const payments = paymentsRes.data || [];
    const staffData = staffRes.data || [];

    const overdueCount = jobs.filter(j => j.scheduled_date && j.scheduled_date < today && !['done', 'cancel'].includes(j.job_status || '')).length;

    setStats({
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.job_status === 'active').length,
      doneJobs: jobs.filter(j => j.job_status === 'done').length,
      monthRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      unpaidTotal: jobs.filter(j => j.payment_status !== 'paid').reduce((sum, j) => sum + ((j.total_price || 0) - (j.amount_paid || 0)), 0),
      urgentJobs: jobs.filter(j => ['urgent', 'critical'].includes(j.priority || '') && j.job_status !== 'done').length,
      availableStaff: staffData.filter(s => s.status === 'available').length,
      overdueCount,
    });
    setRecentLogs((logsRes.data || []) as AuditLog[]);
    setTodayJobs((todayRes.data || []) as TodayJob[]);

    // Chart: last 7 days revenue
    const days: { day: string; revenue: number }[] = [];
    const dayNames = language === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['ອາ', 'ຈ', 'ອ', 'ພ', 'ພຫ', 'ສ', 'ສ'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayRevenue = payments.filter(p => p.created_at?.startsWith(ds)).reduce((s, p) => s + (p.amount || 0), 0);
      days.push({ day: dayNames[d.getDay()], revenue: dayRevenue });
    }
    setChartData(days);
    setLoading(false);
  };

  useEffect(() => {
    if (user && userRole === 'admin') loadDashboard();
  }, [user, userRole]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => loadDashboard())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => loadDashboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!user) return <Navigate to="/admin-login" />;
  if (userRole !== 'admin') return <Navigate to="/" />;

  const statCards = [
    { label: l('ງານເດືອນນີ້', 'Jobs This Month'), value: stats.totalJobs, icon: Briefcase, color: 'text-primary' },
    { label: l('ກຳລັງດຳເນີນ', 'Active'), value: stats.activeJobs, icon: Activity, color: 'text-blue-600' },
    { label: l('ສຳເລັດ', 'Done'), value: stats.doneJobs, icon: TrendingUp, color: 'text-green-600' },
    { label: l('ລາຍຮັບເດືອນນີ້', 'Revenue'), value: `${(stats.monthRevenue / 1000).toFixed(0)}k₭`, icon: CreditCard, color: 'text-emerald-600' },
  ];

  const statCards2 = [
    { label: l('ຄ້າງຈ່າຍ', 'Unpaid'), value: `${(stats.unpaidTotal / 1000).toFixed(0)}k₭`, color: 'text-red-600' },
    { label: l('ງານດ່ວນ', 'Urgent'), value: stats.urgentJobs, color: 'text-orange-600' },
    { label: l('ພະນັກງານວ່າງ', 'Available Staff'), value: stats.availableStaff, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-3 gap-4">
        {statCards2.map((s, i) => (
          <Card key={i} className="p-4">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Overdue Alert */}
      {stats.overdueCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /><span className="font-semibold text-destructive">{l(`ມີ ${stats.overdueCount} ງານເກີນກຳນົດ`, `${stats.overdueCount} overdue jobs`)}</span></div>
          <Link to="/jobs?status=overdue"><Button size="sm" variant="destructive">{l('ເບິ່ງ', 'View')}</Button></Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Jobs */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> {l('ງານມື້ນີ້', "Today's Jobs")}</CardTitle></CardHeader>
          <CardContent>
            {todayJobs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">{l('ບໍ່ມີງານມື້ນີ້', 'No jobs today')}</p> : (
              <div className="space-y-2">
                {todayJobs.map(j => (
                  <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded text-sm">
                    <div>
                      <span className="font-medium">{j.scheduled_time || '--:--'}</span>
                      <span className="ml-2">{j.customer_name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{j.job_type}</Badge>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{j.job_status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">{l('ລາຍຮັບ 7 ວັນ', 'Revenue (7 days)')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()}₭`} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> {l('ກິດຈະກຳລ່າສຸດ', 'Recent Activity')}</CardTitle></CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? <p className="text-sm text-muted-foreground">{l('ບໍ່ມີກິດຈະກຳ', 'No activity')}</p> : (
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-sm p-2 hover:bg-muted/30 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>{log.action}</span>
                    {log.target_id && <span className="text-xs text-muted-foreground">{log.target_table}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(log.created_at, language as any)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
