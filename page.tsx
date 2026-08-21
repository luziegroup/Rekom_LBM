'use client';

import { useState } from 'react';
import Sidebar from './components/Sidebar';

interface Candidate {
  id: string;
  full_name: string;
  current_title: string;
  location: string;
  years_experience: number;
  skills: string[];
  summary: string;
}

const CONTOH_SARAN = [
  'Sales Manager di Industri FMCG, Jakarta',
  'BD Representative di Fintech, Surabaya',
  'Account Executive di SaaS, Bandung',
  'Regional Sales Director di Manufaktur, Semarang',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function runSearch(searchText: string) {
    if (!searchText.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchText }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

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

      {/* MAIN */}
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda</div>
        </div>

        <div className="hero">
          <h1><span className="spark">✦</span> Siapa yang kita cari hari ini?</h1>

          <div className="search-box">
            <div className="search-input-row">
              <input
                type="text"
                placeholder="misal: Backend Engineer Senior dengan pengalaman Golang di Indonesia..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
              />
              <button className="send-btn" onClick={() => runSearch(query)} aria-label="Cari">
                →
              </button>
            </div>
          </div>

          {!results && !loading && (
            <>
              <div className="suggestions-label"><span className="spark">✦</span> Saran pencarian bertenaga AI</div>
              <div className="suggestion-grid">
                {CONTOH_SARAN.map((saran) => (
                  <div
                    key={saran}
                    className="suggestion-card"
                    onClick={() => { setQuery(saran); runSearch(saran); }}
                  >
                    {saran}
                  </div>
                ))}
              </div>
            </>
          )}

          {loading && <p className="loading-text">Mencari kandidat…</p>}

          {results && !loading && (
            <div className="results">
              {results.length === 0 && (
                <p className="empty-text">Belum ada kandidat yang cocok. Coba kata kunci lain.</p>
              )}
              {results.map((c) => (
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
                        {c.current_title || '-'} · {c.location || '-'} · {c.years_experience ?? '-'} tahun pengalaman
                      </div>
                      {c.summary && <div className="summary">{c.summary}</div>}
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
          )}
        </div>
      </div>
    </div>
  );
}
