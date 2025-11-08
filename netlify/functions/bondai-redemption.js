const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 405,
        data: null,
        errors: [{ message: 'Method not allowed. Use POST.' }],
      }),
    };
  }

  const apiUrl = process.env.BONDAI_API_URL;
  const apiKey = process.env.BONDAI_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 500,
        data: null,
        errors: [{ message: 'Bondai API configuration missing on server.' }],
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 400,
        data: null,
        errors: [{ message: 'Invalid JSON payload.', details: error.message }],
      }),
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }

    const result = {
      ok: response.ok,
      status: response.status,
      data: response.ok ? parsed : null,
      errors: response.ok
        ? null
        : [
            {
              message: 'Bondai API request failed.',
              status: response.status,
              data: parsed,
            },
          ],
    };

    return {
      statusCode: response.status,
      headers: HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        status: 502,
        data: null,
        errors: [
          {
            message: 'Network error while calling Bondai API.',
            details: error.message,
          },
        ],
      }),
    };
  }
};


