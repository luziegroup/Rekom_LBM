import { createClient } from '@supabase/supabase-js';

// Pakai service role key karena ini dipanggil dari server (API route),
// bukan dari browser. Jangan pernah expose service role key ke frontend.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
