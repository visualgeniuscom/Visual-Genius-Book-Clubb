const { getSupabaseAdmin } = require('./_supabaseAdmin');

function maskEmail(email) {
  if (!email) return 'the email on file';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { identifier } = JSON.parse(event.body);
    if (!identifier) return { statusCode: 400, body: JSON.stringify({ error: 'Missing identifier' }) };

    const supabase = getSupabaseAdmin();
    const id = identifier.trim().toLowerCase();

    const { data, error } = await supabase
      .from('registrations')
      .select('id, guardian_email')
      .or(`username.ilike.${id},personal_email.ilike.${id},guardian_email.ilike.${id}`)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { statusCode: 200, body: JSON.stringify({ found: false }) };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('registrations')
      .update({ reset_code: code, reset_code_expires_at: expiresAt })
      .eq('id', data.id);
    if (updateError) throw updateError;

    // If a real email provider is configured, send the code for real and
    // don't return it. Until then, fall back to returning it directly so
    // the flow still works end to end during testing.
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Book Club <onboarding@resend.dev>',
          to: data.guardian_email,
          subject: 'Your book club login reset code',
          text: `Your reset code is ${code}. It expires in 10 minutes.`,
        }),
      });
      return { statusCode: 200, body: JSON.stringify({ found: true, emailed: true, maskedEmail: maskEmail(data.guardian_email) }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ found: true, emailed: false, maskedEmail: maskEmail(data.guardian_email), devCode: code }),
    };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Couldn't process that just now — please try again." }) };
  }
};
