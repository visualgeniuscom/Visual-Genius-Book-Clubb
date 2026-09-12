const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { adminPassword, fileName } = JSON.parse(event.body);
    if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect admin password' }) };
    }
    if (!fileName) return { statusCode: 400, body: JSON.stringify({ error: 'Missing file name' }) };

    const supabase = getSupabaseAdmin();
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage.from('book-files').createSignedUploadUrl(path);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ path: data.path, token: data.token }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't prepare that upload just now." }) };
  }
};
