import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;
if (supabaseUrl && supabaseAnonKey && typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('[AI Studio] Supabase client init failed, using mock client:', err);
  }
}

// In-memory / API fallback client used when Supabase credentials are not provided
const fallbackClient = {
  from(table) {
    if (table === 'books') {
      return {
        select(cols = '*') {
          return {
            async order(field = 'title', { ascending = true } = {}) {
              try {
                const res = await fetch('/api/books');
                if (!res.ok) throw new Error('Failed to fetch books from server');
                const data = await res.json();
                return { data, error: null };
              } catch (err) {
                console.warn('[AI Studio] Could not load books from API:', err);
                return { data: [], error: err };
              }
            },
          };
        },
      };
    }
    return {
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
    };
  },
  storage: {
    from(bucket) {
      return {
        async uploadToSignedUrl(path, token, file) {
          return { data: { path }, error: null };
        },
        async createSignedUrl(path, seconds) {
          return { data: { signedUrl: '#' }, error: null };
        },
      };
    },
  },
};

export const supabase = client || fallbackClient;

