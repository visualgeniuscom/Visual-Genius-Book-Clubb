const { getSupabaseAdmin } = require('./_supabaseAdmin');
const { makeSalt, hashAnswer } = require('./_hash');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const body = JSON.parse(event.body);
    const {
      firstName, age, ageBand, guardianEmail, personalEmail,
      username, securityQuestion, securityAnswer,
      formats, length, hobbies, topics, personality, mood, admired, skip,
    } = body;

    if (!firstName || !age || !ageBand || !guardianEmail || !username || !securityQuestion || !securityAnswer) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await supabase
      .from('registrations')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      return { statusCode: 409, body: JSON.stringify({ error: 'That username is already taken — try another' }) };
    }

    const salt = makeSalt();
    const hash = hashAnswer(securityAnswer, salt);

    const { error: insertError } = await supabase.from('registrations').insert([{
      first_name: firstName,
      age,
      age_band: ageBand,
      guardian_email: guardianEmail,
      personal_email: personalEmail || null,
      username,
      security_question: securityQuestion,
      security_answer_hash: hash,
      security_answer_salt: salt,
      formats,
      length,
      hobbies: hobbies || [],
      topics,
      personality,
      mood,
      admired: admired || null,
      skip_list: skip || null,
    }]);
    if (insertError) throw insertError;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('register error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't save that just now — please try again." }) };
  }
};
