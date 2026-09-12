const { getSupabaseAdmin } = require('./_supabaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { identifier } = JSON.parse(event.body);
    if (!identifier) return { statusCode: 400, body: JSON.stringify({ error: 'Missing identifier' }) };

    const supabase = getSupabaseAdmin();
    const id = identifier.trim().toLowerCase();

    const { data, error } = await supabase
      .from('registrations')
      .select('id, first_name, security_question')
      .or(`username.ilike.${id},personal_email.ilike.${id},guardian_email.ilike.${id}`)
      .maybeSingle();
    if (error) throw error;

    if (!data) return { statusCode: 200, body: JSON.stringify({ found: false }) };

    return {
      statusCode: 200,
      body: JSON.stringify({ found: true, id: data.id, firstName: data.first_name, securityQuestion: data.security_question }),
    };
  } catch (err) {
    console.error('login-lookup error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't look that up just now — please try again." }) };
  }
};
