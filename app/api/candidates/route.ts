import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  let dbQuery = supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', process.env.ORGANIZATION_ID)
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) {
    dbQuery = dbQuery.or(
      `full_name.ilike.%${q}%,current_title.ilike.%${q}%,location.ilike.%${q}%`
    );
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kandidat' }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
