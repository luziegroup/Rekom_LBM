'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  current_title: string;
}

export default function KirimEmailPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/candidates')
      .then((res) => res.json())
      .then((data) => setCandidates((data.results || []).filter((c: Candidate) => c.email)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = candidates.find((c) => c.id === selectedId);

  function openMailClient() {
    if (!selected?.email) return;
    const params = new URLSearchParams({ subject, body });
    window.location.href = `mailto:${selected.email}?${params.toString()}`;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda / Kirim Email</div>
        </div>
        <div className="hero">
          <h1>Kirim Email ke Kandidat</h1>

          {loading && <p className="loading-text">Memuat kandidat…</p>}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Pilih kandidat
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="">— pilih kandidat dengan email —</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.current_title ? `(${c.current_title})` : ''} — {c.email}
                    </option>
                  ))}
                </select>
                {candidates.length === 0 && (
                  <div className="meta" style={{ marginTop: 6 }}>
                    Tidak ada kandidat dengan alamat email tersimpan.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Subjek
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Peluang karir yang sesuai dengan profil Anda"
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Isi pesan
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Halo, kami tertarik dengan profil Anda untuk posisi..."
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                className="new-search-btn"
                style={{ alignSelf: 'flex-start' }}
                disabled={!selected}
                onClick={openMailClient}
              >
                Buka di Aplikasi Email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
