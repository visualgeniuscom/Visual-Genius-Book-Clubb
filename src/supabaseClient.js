import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This anon key is safe to expose in the browser bundle. Row-level security
// on the "books" table (see supabase/schema.sql) is what actually controls
// what it's allowed to read or write. It has no access to "registrations" —
// that table is only reachable through the Netlify functions.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
