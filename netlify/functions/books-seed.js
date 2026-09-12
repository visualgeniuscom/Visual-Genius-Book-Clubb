const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { adminPassword, books } = JSON.parse(event.body);
    if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect admin password' }) };
    }
    if (!Array.isArray(books) || books.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No books provided' }) };
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('books').insert(books);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('books-seed error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't add the sample books just now." }) };
  }
};
