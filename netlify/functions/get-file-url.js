const { getSupabaseAdmin } = require('./_supabaseAdmin');

const SIGNED_URL_SECONDS = 120;

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { token, bookId, fileType } = JSON.parse(event.body);
    if (!token || !bookId || !['ebook', 'audiobook'].includes(fileType)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid fields' }) };
    }

    const supabase = getSupabaseAdmin();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('expires_at')
      .eq('token', token)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || new Date(session.expires_at) < new Date()) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Please log in again.' }) };
    }

    const pathColumn = fileType === 'ebook' ? 'ebook_file_path' : 'audiobook_file_path';
    const { data: book, error: bookError } = await supabase.from('books').select(pathColumn).eq('id', bookId).maybeSingle();
    if (bookError) throw bookError;
    const path = book?.[pathColumn];
    if (!path) return { statusCode: 404, body: JSON.stringify({ error: 'No file on this book.' }) };

    const { data: signed, error: signError } = await supabase.storage.from('book-files').createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signError) throw signError;

    return { statusCode: 200, body: JSON.stringify({ url: signed.signedUrl }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't open that file just now — please try again." }) };
  }
};
