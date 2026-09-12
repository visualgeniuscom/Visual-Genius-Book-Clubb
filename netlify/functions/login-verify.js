const crypto = require('crypto');
const { getSupabaseAdmin } = require('./_supabaseAdmin');
const { hashAnswer } = require('./_hash');

const SESSION_DAYS = 7;

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { id, answer } = JSON.parse(event.body);
    if (!id || !answer) return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('registrations')
      .select('security_answer_hash, security_answer_salt, first_name, age_band, topics, mood, personality, hobbies, formats, length, skip_list')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { statusCode: 200, body: JSON.stringify({ success: false }) };

    const hash = hashAnswer(answer, data.security_answer_salt);
    if (hash !== data.security_answer_hash) {
      return { statusCode: 200, body: JSON.stringify({ success: false }) };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: sessionError } = await supabase.from('sessions').insert([{ registration_id: id, token, expires_at: expiresAt }]);
    if (sessionError) throw sessionError;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token,
        firstName: data.first_name,
        ageBand: data.age_band,
        topics: data.topics,
        mood: data.mood,
        personality: data.personality,
        hobbies: data.hobbies,
        formats: data.formats,
        length: data.length,
        skip: data.skip_list,
      }),
    };
  } catch (err) {
    console.error('login-verify error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't verify that just now — please try again." }) };
  }
};


