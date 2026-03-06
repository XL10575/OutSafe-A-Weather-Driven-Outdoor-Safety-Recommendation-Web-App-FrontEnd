<script setup>
import { levelLabel, topReasons, comparisonText } from '../utils/risk'

const props = defineProps({
  level: { type: String, default: 'unknown' },
  score: { type: Number, default: 0 },
  percentiles: { type: Object, default: () => ({}) },
  yearsBack: { type: Number, default: 5 },
  hasHistory: { type: Boolean, default: true },
  archiveRequested: { type: Number, default: 0 },
  archiveSuccess: { type: Number, default: 0 },
})

const badgeClass = () => {
  if (props.level === 'not_recommended') return 'badge--danger'
  if (props.level === 'caution') return 'badge--warning'
  return 'badge--success'
}

const reasons = () => topReasons(props.percentiles, 3)
const comparison = () => comparisonText(props.percentiles, props.yearsBack)
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0;">Summary</h2>
    <p>
      <span :class="['badge', badgeClass()]">{{ levelLabel(level) }}</span>
      <span class="muted" style="margin-left: 0.5rem;">Overall risk {{ score }}%</span>
    </p>
    <div v-if="!hasHistory" class="no-history-tip">
      <p>No same-day historical data available. Percentiles are approximate (50% means no historical comparison).</p>
      <p class="no-history-reasons">Possible reasons: requested {{ archiveRequested }} years, succeeded {{ archiveSuccess }}. If 0, it is usually due to network issues, Open-Meteo rate limiting, or missing archives for that area/date.</p>
    </div>

    <div v-if="reasons().length" class="reason-block">
      <h3 class="sub">Key drivers</h3>
      <ul class="reason-list">
        <li v-for="r in reasons()" :key="r.key">
          {{ r.label }}: historical percentile {{ r.pct }}%
        </li>
      </ul>
    </div>

    <div class="comparison">
      {{ comparison() }}
    </div>
  </div>
</template>

<style scoped>
.muted { color: var(--muted); font-size: 0.9rem; }
.sub { font-size: 1rem; margin: 0.75rem 0 0.25rem; color: var(--muted); }
.reason-block { margin-top: 0.5rem; }
.no-history-tip { font-size: 0.85rem; color: var(--warning); margin-top: 0.5rem; }
.no-history-tip p { margin: 0.25rem 0; }
.no-history-reasons { color: var(--muted); font-size: 0.8rem; }
</style>
