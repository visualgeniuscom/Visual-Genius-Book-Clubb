const { getSupabaseAdmin } = require('./_supabaseAdmin');
const { makeSalt, hashAnswer } = require('./_hash');

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { id, newQuestion, newAnswer } = JSON.parse(event.body);
    if (!id || !newQuestion || !newAnswer) return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };

    const supabase = getSupabaseAdmin();
    const salt = makeSalt();
    const hash = hashAnswer(newAnswer, salt);

    const { error } = await supabase
      .from('registrations')
      .update({
        security_question: newQuestion,
        security_answer_hash: hash,
        security_answer_salt: salt,
        reset_code: null,
        reset_code_expires_at: null,
      })
      .eq('id', id);
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't save that just now — please try again." }) };
  }
};
