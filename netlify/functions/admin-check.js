exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { password } = JSON.parse(event.body);
    const valid = !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
    return { statusCode: 200, body: JSON.stringify({ valid }) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};
