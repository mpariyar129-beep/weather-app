// api/weather.js
// This runs on Vercel's server — API key is NEVER sent to the browser.
// Vercel injects OWM_API_KEY from your project's Environment Variables.

export default async function handler(req, res) {
  // Allow cross-origin requests from your own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = process.env.OWM_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { city, lat, lon } = req.query;

  if (!city && (!lat || !lon)) {
    return res.status(400).json({ error: 'Provide city or lat & lon query params.' });
  }

  try {
    const base = 'https://api.openweathermap.org/data/2.5/weather';
    const url = city
      ? `${base}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
      : `${base}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Weather fetch failed' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Server error. Try again.' });
  }
}
