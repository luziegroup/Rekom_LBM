import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ORG_ID = process.env.ORGANIZATION_ID;

// GET: daftar shortlist, lengkap dengan data kandidatnya
export async function GET() {
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(*)')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar pilihan' }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}

// POST: tambahkan kandidat ke daftar pilihan (shortlist)
export async function POST(req: NextRequest) {
  const { candidate_id } = await req.json();

  if (!candidate_id) {
    return NextResponse.json({ error: 'candidate_id wajib diisi' }, { status: 400 });
  }

  // Cegah duplikat: kalau kandidat ini sudah ada di shortlist (stage belum final), jangan tambah lagi
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('organization_id', ORG_ID)
    .eq('candidate_id', candidate_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ result: existing, alreadyExists: true });
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      organization_id: ORG_ID,
      candidate_id,
      stage: 'new',
    })
    .select('*, candidates(*)')
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan ke daftar pilihan' }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}

// PATCH: ubah tahap (stage) shortlist, misal dari 'new' ke 'interviewing'
export async function PATCH(req: NextRequest) {
  const { id, stage } = await req.json();

  if (!id || !stage) {
    return NextResponse.json({ error: 'id dan stage wajib diisi' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ORG_ID)
    .select('*, candidates(*)')
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui tahap' }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}

// DELETE: hapus dari daftar pilihan
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
  }

  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)
    .eq('organization_id', ORG_ID);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal menghapus dari daftar pilihan' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
