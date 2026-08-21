import Sidebar from '../components/Sidebar';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getStats() {
  const orgId = process.env.ORGANIZATION_ID;

  const { count: totalCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const { count: totalShortlist } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: newThisWeek } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', sevenDaysAgo.toISOString());

  const { data: recent } = await supabase
    .from('candidates')
    .select('id, full_name, current_title, location, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalCandidates: totalCandidates || 0,
    totalShortlist: totalShortlist || 0,
    newThisWeek: newThisWeek || 0,
    recent: recent || [],
  };
}

export default async function DasborPage() {
  const stats = await getStats();

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda / Dasbor</div>
        </div>
        <div className="hero">
          <h1>Dasbor</h1>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 32,
            }}
          >
            <StatCard label="Total Kandidat" value={stats.totalCandidates} />
            <StatCard label="Di Daftar Pilihan" value={stats.totalShortlist} />
            <StatCard label="Baru 7 Hari Terakhir" value={stats.newThisWeek} />
          </div>

          <div className="suggestions-label">
            <span className="spark">✦</span> Kandidat terbaru
          </div>

          {stats.recent.length === 0 && (
            <p className="empty-text">
              Belum ada kandidat. Jalankan pipeline Gmail atau lakukan pencarian AI untuk mulai.
            </p>
          )}

          <div className="results">
            {stats.recent.map((c) => (
              <div className="result-card" key={c.id}>
                <div className="name">{c.full_name || 'Tanpa nama'}</div>
                <div className="meta">
                  {c.current_title || '-'} · {c.location || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 16px',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
