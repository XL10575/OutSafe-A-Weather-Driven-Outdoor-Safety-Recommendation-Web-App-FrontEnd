/**
 * Open-Meteo Weather API (no backend, no API key required)
 * Forecast: today / next hours
 * Archive: past years’ same calendar month (hourly range → daily samples)
 */

const HOURLY = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,windspeed_10m,windgusts_10m'

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive'

/** @param {number} year @param {number} month 1–12 */
function monthRangeISO(year, month) {
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${pad(month)}-${pad(lastDay)}`
  return { start, end }
}

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
 * Fetch full-calendar-month hourly archive for each of the past N years
 * (same month as `date`, e.g. ~5 years × ~28–31 daily samples for percentiles).
 * @param {{ lat: number, lon: number, elevation?: number, date: string, yearsBack?: number }} params
 *   date format YYYY-MM-DD; yearsBack defaults to 5
 * @returns {Promise<{ list: ArchiveResponse[], requested: number }>}
 *   list: one response per past year (whole month); requested: requested years
 */
export async function fetchArchiveSameMonth({ lat, lon, elevation, date, yearsBack = 5 }) {
  const [y, month] = date.split('-').map(Number)
  const requests = []
  for (let i = 1; i <= yearsBack; i++) {
    const pastYear = y - i
    const { start, end } = monthRangeISO(pastYear, month)
    const url = new URL(ARCHIVE_BASE)
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('start_date', start)
    url.searchParams.set('end_date', end)
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
