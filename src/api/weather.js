/**
 * Open-Meteo Weather API (no backend, no API key required)
 * Forecast: today / next hours
 * Archive: historical same-day hours
 */

const HOURLY = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,windspeed_10m,windgusts_10m'

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive'

/**
 * @param {{ lat: number, lon: number, elevation?: number }} params
 * @returns {Promise<ForecastResponse>}
 */
export async function fetchForecast({ lat, lon, elevation }) {
  const url = new URL(FORECAST_BASE)
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly', HOURLY)
  url.searchParams.set('timezone', 'auto')
  if (elevation != null && !isNaN(elevation)) {
    url.searchParams.set('elevation', Math.round(elevation))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Forecast API error: ${res.status}`)
  return res.json()
}

/**
 * Fetch same-day hourly data for the past N years (same month/day)
 * @param {{ lat: number, lon: number, elevation?: number, date: string, yearsBack?: number }} params
 *   date format YYYY-MM-DD; yearsBack defaults to 5
 * @returns {Promise<{ list: ArchiveResponse[], requested: number }>}
 *   list: successfully returned data; requested: requested years (for empty-data hints)
 */
export async function fetchArchiveSameDay({ lat, lon, elevation, date, yearsBack = 5 }) {
  const [y] = date.split('-').map(Number)
  const monthDay = date.slice(5) // MM-DD
  const requests = []
  for (let i = 1; i <= yearsBack; i++) {
    const pastDate = `${y - i}-${monthDay}`
    const url = new URL(ARCHIVE_BASE)
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('start_date', pastDate)
    url.searchParams.set('end_date', pastDate)
    url.searchParams.set('hourly', HOURLY)
    url.searchParams.set('timezone', 'auto')
    if (elevation != null && !isNaN(elevation)) {
      url.searchParams.set('elevation', Math.round(elevation))
    }
    requests.push(fetch(url.toString()).then(r => r.ok ? r.json() : null))
  }
  const results = await Promise.all(requests)
  const list = results.filter(Boolean)
  return { list, requested: yearsBack }
}
