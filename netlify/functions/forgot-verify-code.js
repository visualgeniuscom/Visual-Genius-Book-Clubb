const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { identifier, code } = JSON.parse(event.body);
    if (!identifier || !code) return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };

    const supabase = getSupabaseAdmin();
    const id = identifier.trim().toLowerCase();

    const { data, error } = await supabase
      .from('registrations')
      .select('id, username, reset_code, reset_code_expires_at')
      .or(`username.ilike.${id},personal_email.ilike.${id},guardian_email.ilike.${id}`)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.reset_code) return { statusCode: 200, body: JSON.stringify({ verified: false }) };

    const expired = !data.reset_code_expires_at || new Date(data.reset_code_expires_at) < new Date();
    if (expired || data.reset_code !== code.trim()) {
      return { statusCode: 200, body: JSON.stringify({ verified: false }) };
    }

    return { statusCode: 200, body: JSON.stringify({ verified: true, id: data.id, username: data.username }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't verify that just now — please try again." }) };
  }
};
