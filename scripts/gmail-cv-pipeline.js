/**
 * PIPELINE: Ambil lamaran dari Gmail -> Ekstrak CV pakai Claude -> Simpan ke Supabase
 *
 * SETUP:
 *   npm install googleapis @anthropic-ai/sdk @supabase/supabase-js pdf-parse mammoth dotenv
 *
 * ENV VARIABLES (.env):
 *   GOOGLE_CLIENT_ID=
 *   GOOGLE_CLIENT_SECRET=
 *   GOOGLE_REFRESH_TOKEN=        // didapat sekali lewat OAuth consent flow
 *   ANTHROPIC_API_KEY=
 *   SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=   // pakai service role untuk backend job, bukan anon key
 *   ORGANIZATION_ID=             // uuid organisasi Anda di tabel organizations
 *   GMAIL_LABEL=Lamaran          // label/folder Gmail yang berisi email lamaran
 */

require('dotenv').config();
const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = process.env.ORGANIZATION_ID;

// ------------------------------------------------------------
// 1. Setup koneksi Gmail via OAuth2
// ------------------------------------------------------------
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// ------------------------------------------------------------
// 2. Ambil daftar email dengan attachment dari label tertentu
// ------------------------------------------------------------
async function fetchApplicationEmails(gmail) {
  const query = `label:${process.env.GMAIL_LABEL} has:attachment`;
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50, // sesuaikan / tambah pagination untuk volume besar
  });
  return res.data.messages || [];
}

// ------------------------------------------------------------
// 3. Ekstrak attachment (PDF/DOCX) jadi teks mentah
// ------------------------------------------------------------
async function extractAttachmentText(gmail, messageId, attachmentId, mimeType) {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  const buffer = Buffer.from(attachment.data.data, 'base64');

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return { text: parsed.text, buffer };
  }
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, buffer };
  }
  return { text: null, buffer: null };
}

// ------------------------------------------------------------
// 4. Kirim teks CV ke Claude, minta output JSON terstruktur
// ------------------------------------------------------------
async function parseCandidateWithGemini(cvText, retries = 3) {
  const prompt = `Berikut adalah isi CV/resume seorang kandidat. Ekstrak informasi berikut
dan kembalikan HANYA dalam format JSON valid, tanpa teks lain, tanpa markdown code fence.

Struktur JSON yang diinginkan:
{
  "full_name": string atau null,
  "email": string atau null,
  "phone": string atau null,
  "location": string atau null,
  "current_title": string atau null,
  "years_experience": number atau null,
  "skills": array of string,
  "education": [{ "institution": string, "degree": string, "year": string }],
  "work_history": [{ "company": string, "title": string, "start": string, "end": string, "description": string }],
  "summary": string (ringkasan 2-3 kalimat tentang kandidat ini)
}

Isi CV:
"""
${cvText.slice(0, 15000)}
"""`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });
      const raw = result.text || '{}';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      const isOverloaded = err?.status === 503 || /overload|unavailable/i.test(err?.message || '');
      if (isOverloaded && attempt < retries) {
        const waitMs = attempt * 5000;
        console.log(`  Server Gemini sibuk, coba lagi dalam ${waitMs / 1000} detik... (percobaan ${attempt}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      console.error('Gagal parse dengan Gemini:', err.message || err);
      return null;
    }
  }
}

// ------------------------------------------------------------
// 5. Simpan hasil ekstraksi ke Supabase
// ------------------------------------------------------------
async function saveCandidate(parsed, messageId, fileName) {
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      organization_id: ORG_ID,
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      current_title: parsed.current_title,
      years_experience: parsed.years_experience,
      skills: parsed.skills || [],
      education: parsed.education || [],
      work_history: parsed.work_history || [],
      summary: parsed.summary,
      raw_extracted: parsed,
      source: 'email',
    })
    .select()
    .single();

  if (error) {
    console.error('Gagal simpan kandidat:', error);
    return null;
  }

  // Catat referensi dokumen asal (untuk audit trail / trace ke email asli)
  await supabase.from('candidate_documents').insert({
    candidate_id: data.id,
    organization_id: ORG_ID,
    file_name: fileName,
    storage_path: `pending-upload/${data.id}/${fileName}`, // upload file asli ke Storage terpisah kalau perlu
    source_email_id: messageId,
  });

  return data;
}

// ------------------------------------------------------------
// MAIN: Jalankan seluruh pipeline
// ------------------------------------------------------------
async function run() {
  const gmail = getGmailClient();
  const messages = await fetchApplicationEmails(gmail);
  console.log(`Ditemukan ${messages.length} email lamaran.`);

  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const parts = full.data.payload.parts || [];
    const attachmentParts = parts.filter((p) => p.filename && p.body?.attachmentId);

    for (const part of attachmentParts) {
      console.log(`Memproses attachment: ${part.filename}`);
      const { text } = await extractAttachmentText(
        gmail,
        msg.id,
        part.body.attachmentId,
        part.mimeType
      );
      if (!text) {
        console.log(`  Lewati (format tidak didukung): ${part.mimeType}`);
        continue;
      }

      const parsed = await parseCandidateWithGemini(text);
      if (!parsed) continue;

      const saved = await saveCandidate(parsed, msg.id, part.filename);
      console.log(`  Tersimpan: ${saved?.full_name || '(tanpa nama)'}`);
    }
  }

  console.log('Selesai.');
}

run().catch(console.error);