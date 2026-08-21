import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Bentuk filter yang diminta dari Claude
interface SearchFilters {
  job_title_keywords: string[];
  location: string | null;
  min_years_experience: number | null;
  skills: string[];
}

async function extractFilters(query: string): Promise<SearchFilters> {
  const prompt = `Ubah permintaan pencarian kandidat berikut menjadi filter pencarian terstruktur.
Kembalikan HANYA JSON valid, tanpa teks lain, tanpa markdown code fence.

Struktur JSON:
{
  "job_title_keywords": array of string (kata kunci jabatan, misal ["backend engineer", "software engineer"]),
  "location": string atau null (kota/wilayah yang disebut),
  "min_years_experience": number atau null (minimal tahun pengalaman kalau disebutkan),
  "skills": array of string (skill teknis yang disebutkan, misal ["golang", "kubernetes"])
}

Permintaan pencarian: "${query}"`;

  const result = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: prompt,
  });
  const raw = result.text || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Kalau parsing gagal, fallback ke filter kosong supaya tetap
    // menampilkan hasil pencarian teks biasa, bukan error ke user.
    return { job_title_keywords: [], location: null, min_years_experience: null, skills: [] };
  }
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Query pencarian wajib diisi' }, { status: 400 });
  }

  const filters = await extractFilters(query);

  // Bangun query Supabase secara bertahap berdasarkan filter yang ada.
  let dbQuery = supabase
    .from('candidates')
    .select('*')
    .eq('organization_id', process.env.ORGANIZATION_ID);

  if (filters.location) {
    dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
  }

  if (filters.min_years_experience) {
    dbQuery = dbQuery.gte('years_experience', filters.min_years_experience);
  }

  if (filters.skills && filters.skills.length > 0) {
    // overlaps: kandidat yang punya minimal satu skill yang cocok
    dbQuery = dbQuery.overlaps('skills', filters.skills);
  }

  if (filters.job_title_keywords && filters.job_title_keywords.length > 0) {
    // cari salah satu keyword jabatan di current_title
    const orConditions = filters.job_title_keywords
      .map((kw) => `current_title.ilike.%${kw}%`)
      .join(',');
    dbQuery = dbQuery.or(orConditions);
  }

  const { data, error } = await dbQuery.limit(30);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kandidat' }, { status: 500 });
  }

  return NextResponse.json({ filters, results: data });
}
