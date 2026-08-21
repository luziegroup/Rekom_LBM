'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Application {
  id: string;
  stage: string;
  notes: string | null;
  candidates: {
    id: string;
    full_name: string;
    current_title: string;
    location: string;
  } | null;
}

const STAGES = [
  { value: 'new', label: 'Baru' },
  { value: 'screening', label: 'Screening' },
  { value: 'interviewing', label: 'Interview' },
  { value: 'offered', label: 'Ditawarkan' },
  { value: 'hired', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
];

export default function DaftarPilihanPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setItems(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStage(id: string, stage: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, stage } : it)));
    try {
      await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await fetch(`/api/applications?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda / Daftar Pilihan</div>
        </div>
        <div className="hero">
          <h1>Daftar Pilihan</h1>

          {loading && <p className="loading-text">Memuat daftar pilihan…</p>}

          {!loading && items.length === 0 && (
            <p className="empty-text">
              Belum ada kandidat di daftar pilihan. Tambahkan dari halaman Workspace atau hasil
              pencarian AI.
            </p>
          )}

          <div className="results">
            {items.map((it) => (
              <div className="result-card" key={it.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div className="name">{it.candidates?.full_name || 'Tanpa nama'}</div>
                    <div className="meta">
                      {it.candidates?.current_title || '-'} · {it.candidates?.location || '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={it.stage}
                      onChange={(e) => updateStage(it.id, e.target.value)}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '7px 10px',
                        fontSize: 13,
                        fontFamily: 'inherit',
                      }}
                    >
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="filter-chip"
                      onClick={() => removeItem(it.id)}
                      title="Hapus dari daftar pilihan"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
