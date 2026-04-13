<script setup>
import { ref } from 'vue'
import { fetchForecast, fetchArchiveSameMonth } from './api/weather'
import {
  aggregateDayMetrics,
  aggregateMonthDailyFromHourly,
  computePercentiles,
  compositeRisk,
} from './utils/risk'
import LocationPicker from './components/LocationPicker.vue'
import SafetyResult from './components/SafetyResult.vue'

const loading = ref(false)
const error = ref('')
const result = ref(null) // { level, score, percentiles, yearsBack }

async function onLocationSubmit({ lat, lon, elevation, yearsBack }) {
  loading.value = true
  error.value = ''
  result.value = null

  try {
    // Fetch forecast first; hourly.time is in local timezone, avoid UTC/local date mismatch
    const forecast = await fetchForecast({ lat, lon, elevation })
    const queryDate =
      forecast.hourly?.time?.[0]?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10)

    const todayMetrics = aggregateDayMetrics(forecast.hourly, queryDate)
    if (!todayMetrics) {
      error.value = "Couldn't parse today's hourly data"
      return
    }

    const { list: archiveList, requested: archiveRequested } = await fetchArchiveSameMonth({
      lat,
      lon,
      elevation,
      date: queryDate,
      yearsBack,
    })
    const historyMetricsList = archiveList.flatMap((ar) =>
      aggregateMonthDailyFromHourly(ar.hourly)
    )
    const validHistory = historyMetricsList.filter(Boolean)
    const percentiles = computePercentiles(todayMetrics, validHistory)
    const { score, level } = compositeRisk(percentiles)

    result.value = {
      level,
      score,
      percentiles: percentiles || {},
      yearsBack,
      hasHistory: validHistory.length > 0,
      archiveRequested,
      archiveSuccess: archiveList.length,
      historySampleDays: validHistory.length,
    }
  } catch (e) {
    error.value = e.message || 'Request failed. Please check your network and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <h1 style="margin-bottom: 1rem;">OutSafe · Outdoor Safety Advice</h1>
  <LocationPicker @submit="onLocationSubmit" />
  <div v-if="loading" class="loading">Fetching weather and historical data…</div>
  <p v-else-if="error" class="error">{{ error }}</p>
  <SafetyResult
    v-else-if="result"
    :level="result.level"
    :score="result.score"
    :percentiles="result.percentiles"
    :years-back="result.yearsBack"
    :has-history="result.hasHistory"
    :archive-requested="result.archiveRequested"
    :archive-success="result.archiveSuccess"
    :history-sample-days="result.historySampleDays"
  />
</template>
