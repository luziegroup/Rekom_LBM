'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dasbor', label: 'Dasbor' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/daftar-pilihan', label: 'Daftar Pilihan' },
  { href: '/kirim-email', label: 'Kirim Email' },
  { href: '/permintaan-whatsapp', label: 'Permintaan WhatsApp' },
  { href: '/', label: 'Agen Talenta' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark"></div>
        <div className="logo-text">Talenta</div>
      </div>

      <div className="workspace-switcher">
        <div className="name">Workspace Rekrutmen Anda ▾</div>
        <div className="sub">Workspace default Anda</div>
      </div>

      <nav className="main-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-item"
            style={
              pathname === item.href
                ? { background: '#eff4ff', color: '#2563eb', fontWeight: 600 }
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Link href="/" className="new-search-btn">
        + Pencarian AI Baru
      </Link>
    </aside>
  );
}
