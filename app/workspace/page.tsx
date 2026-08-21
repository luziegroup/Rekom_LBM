'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Candidate {
  id: string;
  full_name: string;
  current_title: string;
  location: string;
  years_experience: number;
  skills: string[];
  email: string;
  phone: string;
}

export default function WorkspacePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function load(query: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      const data = await res.json();
      setCandidates(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
  }, []);

  async function addToShortlist(candidateId: string) {
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      setAddedIds((prev) => new Set(prev).add(candidateId));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda / Workspace</div>
        </div>
        <div className="hero">
          <h1>Semua Kandidat</h1>

          <div className="search-box" style={{ marginBottom: 24 }}>
            <div className="search-input-row" style={{ paddingBottom: 0 }}>
              <input
                type="text"
                placeholder="Cari nama, jabatan, atau lokasi..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(q)}
              />
              <button className="send-btn" onClick={() => load(q)}>
                →
              </button>
            </div>
          </div>

          {loading && <p className="loading-text">Memuat kandidat…</p>}

          {!loading && candidates.length === 0 && (
            <p className="empty-text">Belum ada kandidat tersimpan.</p>
          )}

          <div className="results">
            {candidates.map((c) => (
              <div className="result-card" key={c.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="name">{c.full_name || 'Tanpa nama'}</div>
                    <div className="meta">
                      {c.current_title || '-'} · {c.location || '-'} ·{' '}
                      {c.years_experience ?? '-'} tahun pengalaman
                    </div>
                    {c.skills && c.skills.length > 0 && (
                      <div className="meta" style={{ marginTop: 4 }}>
                        Skill: {c.skills.join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    className="filter-chip"
                    style={{ whiteSpace: 'nowrap' }}
                    disabled={addedIds.has(c.id)}
                    onClick={() => addToShortlist(c.id)}
                  >
                    {addedIds.has(c.id) ? '✓ Ditambahkan' : '+ Daftar Pilihan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
