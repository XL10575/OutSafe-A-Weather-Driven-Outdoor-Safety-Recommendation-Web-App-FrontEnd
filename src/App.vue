<script setup>
import { ref } from 'vue'
import { fetchAiAdvice, isAdviceApiConfigured } from './api/advice'
import { fetchForecast, fetchArchiveSameMonth } from './api/weather'
import {
  aggregateDayMetrics,
  aggregateMonthDailyFromHourly,
  buildAdviceContext,
  computePercentiles,
  compositeRisk,
} from './utils/risk'
import LocationPicker from './components/LocationPicker.vue'
import SafetyResult from './components/SafetyResult.vue'
import DebugConsole from './components/DebugConsole.vue'

const loading = ref(false)
const error = ref('')
const result = ref(null) // { level, score, percentiles, yearsBack, ... }
const aiAdvice = ref('')
const aiAdviceLoading = ref(false)
const aiAdviceError = ref('')
const rawMeteoData = ref(null) // Stores raw Open-Meteo data for the debug console

async function onLocationSubmit({ lat, lon, elevation, yearsBack, activityPrompt }) {
  loading.value = true
  error.value = ''
  result.value = null
  aiAdvice.value = ''
  aiAdviceError.value = ''
  aiAdviceLoading.value = false
  rawMeteoData.value = null

  /** @type {ReturnType<typeof buildAdviceContext> | null} */
  let adviceContext = null

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
    
    rawMeteoData.value = {
      forecast,
      archiveList
    }
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

    adviceContext = buildAdviceContext({
      queryDate,
      todayMetrics,
      percentiles,
      score,
      level,
      yearsBack,
      hasHistory: validHistory.length > 0,
      archiveRequested,
      archiveSuccess: archiveList.length,
      historySampleDays: validHistory.length,
    })
  } catch (e) {
    error.value = e.message || 'Request failed. Please check your network and try again.'
  } finally {
    loading.value = false
  }

  if (!adviceContext || !isAdviceApiConfigured()) return

  aiAdviceLoading.value = true
  try {
    aiAdvice.value = await fetchAiAdvice({
      userPrompt: activityPrompt || '',
      context: adviceContext,
    })
  } catch (e) {
    if (e?.code === 'ADVICE_API_NOT_CONFIGURED') {
      aiAdviceError.value = ''
    } else {
      aiAdviceError.value = e?.message || 'AI returned wrong response'
    }
  } finally {
    aiAdviceLoading.value = false
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
    :advice-api-configured="isAdviceApiConfigured()"
    :ai-advice="aiAdvice"
    :ai-advice-loading="aiAdviceLoading"
    :ai-advice-error="aiAdviceError"
  />

  <DebugConsole :data="rawMeteoData" />
</template>
