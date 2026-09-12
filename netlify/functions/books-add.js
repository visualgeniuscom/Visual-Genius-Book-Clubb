const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { adminPassword, book } = JSON.parse(event.body);
    if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect admin password' }) };
    }
    if (!book || !book.title || !book.author) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('books').insert([book]);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('books-add error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't save that just now — please try again." }) };
  }
};
