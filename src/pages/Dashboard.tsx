import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import {
  Users, Building2, MapPin, Vote, TrendingUp, Activity,
  Target, ArrowUpRight, ArrowDownRight, Zap, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: delay * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

/* ── Sparkline mini chart ─────────────────────────────── */
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── Activity feed item ───────────────────────────────── */
const ActivityItem: React.FC<{
  icon: React.ElementType;
  text: string;
  time: string;
  status: 'success' | 'warning' | 'info';
  delay: number;
}> = ({ icon: Icon, text, time, status, delay }) => {
  const statusColors = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
  };
  return (
    <motion.div {...fadeUp(delay)} className="flex items-start gap-3 py-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${statusColors[status]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 animate-pulse-subtle ${
        status === 'success' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-info'
      }`} />
    </motion.div>
  );
};

/* ── Goal/Task progress ───────────────────────────────── */
const GoalItem: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-pill bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="h-full rounded-pill"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/* ── Skeleton ─────────────────────────────────────────── */
const GlassSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse-subtle rounded-xl bg-muted/30 ${className || ''}`} />
);

/* ══════════════ DASHBOARD ═══════════════════════════════ */
const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const { municipalities, getAllVoters } = useData();

  const allVoters = getAllVoters();
  const totalWards = municipalities.reduce((a, m) => a + m.wards.length, 0);
  const totalBooths = municipalities.reduce((a, m) => a + m.wards.reduce((b, w) => b + w.booths.length, 0), 0);

  const maleCount = allVoters.filter(v => v.gender === 'पुरुष').length;
  const femaleCount = allVoters.filter(v => v.gender === 'महिला').length;
  const genderData = [
    { name: language === 'ne' ? 'पुरुष' : 'Male', value: maleCount },
    { name: language === 'ne' ? 'महिला' : 'Female', value: femaleCount },
  ];

  // Age distribution
  const ageGroups = [
    { range: '18-25', min: 18, max: 25 },
    { range: '26-35', min: 26, max: 35 },
    { range: '36-45', min: 36, max: 45 },
    { range: '46-55', min: 46, max: 55 },
    { range: '56-65', min: 56, max: 65 },
    { range: '65+', min: 65, max: 200 },
  ];
  const ageData = ageGroups.map(g => ({
    name: g.range,
    count: allVoters.filter(v => v.age >= g.min && v.age < (g.range === '65+' ? 200 : g.max + 1)).length,
  }));

  // Surname top 8
  const surnameCounts: Record<string, number> = {};
  allVoters.forEach(v => { if (v.surname) surnameCounts[v.surname] = (surnameCounts[v.surname] || 0) + 1; });
  const surnameData = Object.entries(surnameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Trend data (simulated monthly growth)
  const trendData = [
    { month: 'Bais', voters: Math.floor(allVoters.length * 0.4) },
    { month: 'Jes', voters: Math.floor(allVoters.length * 0.55) },
    { month: 'Asa', voters: Math.floor(allVoters.length * 0.65) },
    { month: 'Shr', voters: Math.floor(allVoters.length * 0.72) },
    { month: 'Bhd', voters: Math.floor(allVoters.length * 0.8) },
    { month: 'Asw', voters: Math.floor(allVoters.length * 0.88) },
    { month: 'Kar', voters: Math.floor(allVoters.length * 0.93) },
    { month: 'Man', voters: Math.floor(allVoters.length * 0.97) },
    { month: 'Pou', voters: allVoters.length },
  ];

  // Stats
  const stats = [
    {
      icon: Building2,
      label: t('municipalities'),
      value: municipalities.length,
      change: '+2',
      trend: 'up' as const,
      sparkData: [1, 1, 2, 2, 3, 3, municipalities.length],
      color: 'hsl(var(--chart-1))',
    },
    {
      icon: MapPin,
      label: t('totalWards'),
      value: totalWards,
      change: '+5',
      trend: 'up' as const,
      sparkData: [2, 3, 4, 5, 6, 7, totalWards],
      color: 'hsl(var(--chart-2))',
    },
    {
      icon: Vote,
      label: t('totalBooths'),
      value: totalBooths,
      change: '+3',
      trend: 'up' as const,
      sparkData: [1, 2, 2, 3, 3, 4, totalBooths],
      color: 'hsl(var(--chart-3))',
    },
    {
      icon: Users,
      label: t('totalVoters'),
      value: allVoters.length,
      change: '+12%',
      trend: 'up' as const,
      sparkData: [10, 15, 20, 28, 35, 42, allVoters.length],
      color: 'hsl(var(--chart-4))',
    },
  ];

  // Activity feed
  const activities = [
    { icon: Users, text: language === 'ne' ? 'नयाँ मतदाता दर्ता भयो — वडा १' : 'New voter registered — Ward 1', time: language === 'ne' ? '२ मिनेट अघि' : '2 min ago', status: 'success' as const },
    { icon: Building2, text: language === 'ne' ? 'कीर्तिपुर नगरपालिका डाटा अपडेट' : 'Kirtipur Municipality data updated', time: language === 'ne' ? '१५ मिनेट अघि' : '15 min ago', status: 'info' as const },
    { icon: AlertCircle, text: language === 'ne' ? 'बुथ ३ मा डुप्लिकेट रेकर्ड भेटियो' : 'Duplicate records found in Booth 3', time: language === 'ne' ? '१ घण्टा अघि' : '1 hour ago', status: 'warning' as const },
    { icon: CheckCircle2, text: language === 'ne' ? 'जाति/जात म्यापिङ पूरा भयो' : 'Ethnicity mapping completed', time: language === 'ne' ? '३ घण्टा अघि' : '3 hours ago', status: 'success' as const },
    { icon: Zap, text: language === 'ne' ? 'नयाँ Excel डाटा आयात भयो' : 'New Excel data imported', time: language === 'ne' ? '५ घण्टा अघि' : '5 hours ago', status: 'info' as const },
  ];

  // Goals
  const goals = [
    { label: language === 'ne' ? 'मतदाता दर्ता लक्ष्य' : 'Voter Registration Target', value: allVoters.length, max: 500, color: 'hsl(var(--chart-1))' },
    { label: language === 'ne' ? 'जात म्यापिङ' : 'Caste Mapping', value: allVoters.filter(v => v.caste).length, max: allVoters.length || 1, color: 'hsl(var(--chart-2))' },
    { label: language === 'ne' ? 'मोबाइल सम्पर्क' : 'Mobile Contacts', value: allVoters.filter(v => v.mobileNumber).length, max: allVoters.length || 1, color: 'hsl(var(--chart-3))' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero Spotlight ─────────────────────────── */}
      <motion.div {...fadeUp(0)} className="glass-panel-elevated rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-center gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider font-english">
                {language === 'ne' ? 'मुख्य अन्तर्दृष्टि' : 'Key Insight'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {language === 'ne' ? `${allVoters.length} मतदाता दर्ता भयो` : `${allVoters.length} Voters Registered`}
            </h2>
            <p className="text-muted-foreground text-sm">
              {language === 'ne'
                ? `${municipalities.length} नगरपालिका, ${totalWards} वडा र ${totalBooths} बुथमा विभाजित`
                : `Across ${municipalities.length} municipalities, ${totalWards} wards and ${totalBooths} booths`}
            </p>
          </div>
          <div className="w-56">
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="voters" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#heroGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ─── Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            {...fadeUp(i + 1)}
            className="glass-panel rounded-xl p-5 group hover:shadow-glass-elevated hover:scale-[1.01] transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: stat.color }}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold mb-0.5">{stat.value.toLocaleString()}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <Sparkline data={stat.sparkData} color={stat.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Charts Row ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voter Growth Area Chart */}
        <motion.div {...fadeUp(6)} className="glass-panel rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {language === 'ne' ? 'मतदाता वृद्धि प्रवृत्ति' : 'Voter Growth Trend'}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  boxShadow: 'var(--glass-shadow)',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="voters" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gender Donut */}
        <motion.div {...fadeUp(7)} className="glass-panel rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" />
            {t('genderDistribution')}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {genderData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Second Row: Activity + Goals + Age ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <motion.div {...fadeUp(8)} className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              {language === 'ne' ? 'हालको गतिविधि' : 'Live Activity'}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-success">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-subtle" />
              Live
            </div>
          </div>
          <div className="space-y-1 divide-y divide-border/50">
            {activities.map((a, i) => (
              <ActivityItem key={i} {...a} delay={i + 9} />
            ))}
          </div>
        </motion.div>

        {/* Task / Goals */}
        <motion.div {...fadeUp(9)} className="glass-panel rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {language === 'ne' ? 'लक्ष्य प्रगति' : 'Goal Progress'}
          </h3>
          <div className="space-y-5">
            {goals.map(g => (
              <GoalItem key={g.label} {...g} />
            ))}
          </div>
          <div className="mt-6 glass-panel rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">
                {language === 'ne' ? 'डाटा गुणस्तर स्कोर' : 'Data Quality Score'}
              </p>
              <p className="text-lg font-bold text-primary">
                {allVoters.length > 0
                  ? `${Math.round((allVoters.filter(v => v.caste && v.ethnicity && v.mobileNumber).length / allVoters.length) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Age Distribution Bar */}
        <motion.div {...fadeUp(10)} className="glass-panel rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3Icon className="w-4 h-4 text-chart-3" />
            {t('ageDistribution')}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {ageData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ─── Compact Table: Municipalities ────────────── */}
      <motion.div {...fadeUp(11)} className="glass-panel rounded-xl overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-base font-semibold mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-municipality" />
            {t('municipalities')}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {language === 'ne' ? 'सबै नगरपालिकाहरूको सारांश' : 'Summary of all municipalities'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'ne' ? 'नगरपालिका' : 'Municipality'}
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'ne' ? 'वडा' : 'Wards'}
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'ne' ? 'बुथ' : 'Booths'}
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'ne' ? 'मतदाता' : 'Voters'}
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'ne' ? 'प्रवृत्ति' : 'Trend'}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {municipalities.map(mun => {
                const wardCount = mun.wards.length;
                const boothCount = mun.wards.reduce((a, w) => a + w.booths.length, 0);
                const voterCount = mun.wards.reduce((a, w) => a + w.booths.reduce((b, booth) => b + booth.voters.length, 0), 0);
                return (
                  <tr key={mun.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-municipality-light flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-municipality" />
                        </div>
                        <span className="font-medium">{language === 'ne' ? mun.nameNe : mun.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium bg-ward-light text-ward">
                        {wardCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium bg-booth-light text-booth">
                        {boothCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{voterCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Sparkline data={[5, 8, 12, 15, voterCount]} color="hsl(var(--chart-2))" />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
              {municipalities.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {language === 'ne' ? 'कुनै नगरपालिका छैन' : 'No municipalities yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ─── Surname Distribution ────────────────────── */}
      {surnameData.length > 0 && (
        <motion.div {...fadeUp(12)} className="glass-panel rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">{t('surnameFrequency')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={surnameData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {surnameData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
};

// Small icon component to avoid import conflict with recharts' BarChart
const BarChart3Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
  </svg>
);

export default Dashboard;
