const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { token } = JSON.parse(event.body);
    if (token) {
      const supabase = getSupabaseAdmin();
      await supabase.from('sessions').delete().eq('token', token);
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('logout error:', err);
    // Logging out should never visibly fail from the user's perspective.
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }
};
