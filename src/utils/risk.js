/**
 * Aggregate today's window and each historical year's window, then compute percentiles and risk score
 */

/**
 * Select the hours for a given day from the API hourly series and aggregate day metrics
 * @param {Object} hourly - { time: string[], temperature_2m, ... }
 * @param {string} date - YYYY-MM-DD; keep only points for that date
 */
export function aggregateDayMetrics(hourly, date) {
  if (!hourly?.time?.length) return null
  const dateStr = date.slice(0, 10)
  const indices = hourly.time
    .map((t, i) => (String(t).startsWith(dateStr) ? i : -1))
    .filter(i => i >= 0)
  if (indices.length === 0) return null

  const pick = (arr) => indices.map(i => arr[i]).filter(v => v != null)
  const temp = pick(hourly.temperature_2m)
  const appTemp = pick(hourly.apparent_temperature)
  const humidity = pick(hourly.relative_humidity_2m)
  const precip = pick(hourly.precipitation)
  const wind = pick(hourly.windspeed_10m)
  const gust = pick(hourly.windgusts_10m)

  const max = (a) => (a.length ? Math.max(...a) : null)
  const min = (a) => (a.length ? Math.min(...a) : null)
  const sum = (a) => (a.length ? a.reduce((s, x) => s + x, 0) : null)
  const avg = (a) => (a.length ? sum(a) / a.length : null)

  return {
    temp_max: max(temp),
    temp_min: min(temp),
    apparent_min: min(appTemp),
    humidity_max: max(humidity),
    precip_sum: sum(precip),
    wind_max: max(wind),
    gust_max: max(gust),
    // for risk: coldest feels-like, strongest wind, total precipitation
    risk_cold: min(appTemp),
    risk_wind: max(gust),
    risk_rain: sum(precip),
  }
}

/**
 * Split a multi-day hourly archive into one aggregate per calendar day (sorted).
 * @param {Object} hourly - Open-Meteo hourly object
 * @returns {ReturnType<typeof aggregateDayMetrics>[]}
 */
export function aggregateMonthDailyFromHourly(hourly) {
  if (!hourly?.time?.length) return []
  const dates = new Set()
  for (const t of hourly.time) {
    const d = String(t).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.add(d)
  }
  return [...dates]
    .sort()
    .map((d) => aggregateDayMetrics(hourly, d))
    .filter(Boolean)
}

/**
 * Percentile rank of value in an array (0~100)
 */
function percentileRank(value, sortedArr) {
  if (!sortedArr.length) return 50
  const sorted = [...sortedArr].sort((a, b) => a - b)
  let count = 0
  for (const v of sorted) {
    if (v < value) count++
    else break
  }
  return Math.round((count / sorted.length) * 100)
}

/**
 * Wind/precip: higher is riskier, higher percentile = more extreme
 * Feels-like temperature: lower is riskier, use (100 - percentile) as "extremeness"
 */
export function computePercentiles(todayMetrics, historyMetricsList) {
  if (!todayMetrics || !historyMetricsList?.length) return null
  const keys = ['risk_wind', 'risk_rain', 'risk_cold']
  const hist = historyMetricsList.map(m => m).filter(Boolean)
  const windVals = hist.map(m => m.risk_wind).filter(v => v != null)
  const rainVals = hist.map(m => m.risk_rain).filter(v => v != null)
  const coldVals = hist.map(m => m.risk_cold).filter(v => v != null)

  const windPct = windVals.length ? percentileRank(todayMetrics.risk_wind, windVals) : 50
  const rainPct = rainVals.length ? percentileRank(todayMetrics.risk_rain, rainVals) : 50
  // colder feels-like is riskier: smaller value is more extreme, use 100 - percentile
  const coldPct = coldVals.length ? 100 - percentileRank(todayMetrics.risk_cold, coldVals) : 50

  return {
    wind: windPct,
    rain: rainPct,
    cold: coldPct,
  }
}

/**
 * Composite risk score 0~100; higher means less recommended
 * Weighted average of percentiles, then mapped to a level
 */
export function compositeRisk(percentiles, weights = { wind: 0.35, rain: 0.35, cold: 0.3 }) {
  if (!percentiles) return { score: 50, level: 'unknown' }
  const { wind = 50, rain = 50, cold = 50 } = percentiles
  const score = Math.round(
    (wind * (weights.wind ?? 1/3) + rain * (weights.rain ?? 1/3) + cold * (weights.cold ?? 1/3)) /
    ((weights.wind ?? 1/3) + (weights.rain ?? 1/3) + (weights.cold ?? 1/3))
  )
  const level = score >= 70 ? 'not_recommended' : score >= 40 ? 'caution' : 'recommended'
  return { score: Math.min(100, Math.max(0, score)), level }
}

/** Summary label */
export function levelLabel(level) {
  const map = {
    not_recommended: 'Not recommended',
    caution: 'Use caution',
    recommended: 'Recommended',
    unknown: 'Unknown',
  }
  return map[level] ?? 'Unknown'
}

/**
 * Take top 2~3 indicators (higher percentile first) as key drivers
 */
export function topReasons(percentiles, limit = 3) {
  if (!percentiles) return []
  const items = [
    { key: 'wind', label: 'Wind', pct: percentiles.wind },
    { key: 'rain', label: 'Precipitation', pct: percentiles.rain },
    { key: 'cold', label: 'Feels-like cold', pct: percentiles.cold },
  ].filter(i => i.pct != null)
  items.sort((a, b) => b.pct - a.pct)
  return items.slice(0, limit)
}

/**
 * Build a "compared with past N years" summary string
 */
export function comparisonText(percentiles, n) {
  if (!percentiles) return ''
  const parts = []
  if (percentiles.wind >= 70) parts.push(`more extreme wind (${percentiles.wind}%)`)
  if (percentiles.rain >= 70) parts.push(`wetter than usual (${percentiles.rain}%)`)
  if (percentiles.cold >= 70) parts.push(`colder feels-like (${percentiles.cold}%)`)
  if (percentiles.wind <= 30) parts.push(`milder wind (${percentiles.wind}%)`)
  if (percentiles.rain <= 30) parts.push(`drier than usual (${percentiles.rain}%)`)
  if (percentiles.cold <= 30) parts.push(`warmer feels-like (${percentiles.cold}%)`)
  if (parts.length === 0) {
    return `Compared with daily conditions in the same calendar month over the past ${n} years, today is close to typical.`
  }
  return `Compared with daily conditions in the same calendar month over the past ${n} years: ${parts.join(', ')}.`
}

/**
 * Serializable payload for an external “advice” API / LLM.
 * Keeps raw metrics + percentile story so the model can judge fitness to the user’s activity.
 *
 * @param {{
 *   queryDate: string,
 *   todayMetrics: ReturnType<typeof aggregateDayMetrics>,
 *   percentiles: ReturnType<typeof computePercentiles>,
 *   score: number,
 *   level: string,
 *   yearsBack: number,
 *   hasHistory: boolean,
 *   archiveRequested?: number,
 *   archiveSuccess?: number,
 *   historySampleDays?: number,
 * }} p
 */
export function buildAdviceContext(p) {
  const {
    queryDate,
    todayMetrics,
    percentiles,
    score,
    level,
    yearsBack,
    hasHistory,
    archiveRequested,
    archiveSuccess,
    historySampleDays,
  } = p
  const reasons = topReasons(percentiles, 3)
  return {
    queryDate,
    today_summary: todayMetrics
      ? {
          temp_max_c: todayMetrics.temp_max,
          temp_min_c: todayMetrics.temp_min,
          apparent_min_c: todayMetrics.apparent_min,
          humidity_max_pct: todayMetrics.humidity_max,
          precipitation_sum_mm: todayMetrics.precip_sum,
          wind_max_ms: todayMetrics.wind_max,
          gust_max_ms: todayMetrics.gust_max,
        }
      : null,
    vs_same_month_history: {
      years_compared: yearsBack,
      has_history: hasHistory,
      archive_requested: archiveRequested,
      archive_success: archiveSuccess,
      history_sample_days: historySampleDays,
      percentiles: percentiles || null,
      key_drivers: reasons.map((r) => ({ factor: r.key, label: r.label, percentile: r.pct })),
      comparison_text: comparisonText(percentiles, yearsBack),
    },
    model_risk_index: {
      score_0_to_100: score,
      level,
      note: 'Heuristic blend of wind/rain/cold percentiles; your backend should treat this as input, not a verdict.',
    },
  }
}
