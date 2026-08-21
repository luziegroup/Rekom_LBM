'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Candidate {
  id: string;
  full_name: string;
  phone: string;
  current_title: string;
}

// Bersihkan nomor telepon jadi format internasional tanpa simbol,
// dan ubah awalan 0 jadi 62 (asumsi default Indonesia).
function normalizePhone(phone: string) {
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return digits;
}

export default function PermintaanWhatsAppPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/candidates')
      .then((res) => res.json())
      .then((data) => setCandidates((data.results || []).filter((c: Candidate) => c.phone)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = candidates.find((c) => c.id === selectedId);

  function openWhatsApp() {
    if (!selected?.phone) return;
    const phone = normalizePhone(selected.phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">Workspace-rekrutmen-anda / Permintaan WhatsApp</div>
        </div>
        <div className="hero">
          <h1>Hubungi Kandidat via WhatsApp</h1>

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
                  <option value="">— pilih kandidat dengan nomor telepon —</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.current_title ? `(${c.current_title})` : ''} — {c.phone}
                    </option>
                  ))}
                </select>
                {candidates.length === 0 && (
                  <div className="meta" style={{ marginTop: 6 }}>
                    Tidak ada kandidat dengan nomor telepon tersimpan.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Pesan
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Halo, kami dari tim rekrutmen tertarik dengan profil Anda..."
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
                onClick={openWhatsApp}
              >
                Buka di WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
