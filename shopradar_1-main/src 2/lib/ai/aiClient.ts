export async function callAIEndpoint(endpoint: string, payload: object) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const data = await response.json();
        console.error('API Route Error:', { error: data.error, details: data.details });
        throw new Error(data.error || `Request failed: ${response.status}`);
      }
      throw new Error(`Request failed: ${response.status}`);
    }

    if (!isJson) {
      throw new Error('Unexpected response format from API');
    }

    const data = await response.json();

    if (data.error) {
      console.error('API Route Error:', { error: data.error, details: data.details });
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
