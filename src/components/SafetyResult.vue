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
  historySampleDays: { type: Number, default: 0 },
  adviceApiConfigured: { type: Boolean, default: false },
  aiAdvice: { type: String, default: '' },
  aiAdviceLoading: { type: Boolean, default: false },
  aiAdviceError: { type: String, default: '' },
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
    <h2 style="margin-top: 0;">AI Outdoor Safety Advice</h2>
    <div v-if="!adviceApiConfigured" class="advice-skip muted">
      didn't set <code>VITE_ADVICE_API_URL</code> so it won't request AI; below is the risk reference calculated by the local algorithm.
    </div>
    <div v-else-if="aiAdviceLoading" class="advice-loading">Generating advice based on your activity description…</div>
    <p v-else-if="aiAdviceError" class="advice-error">{{ aiAdviceError }}</p>
    <div v-else-if="aiAdvice" class="ai-advice-body">{{ aiAdvice }}</div>
    <p v-else class="muted">No AI response (please check that the backend returns the advice / message / content / text fields in the JSON).</p>

    <h2 class="section-title">Local risk reference (percentiles and composite score)</h2>
    <p>
      <span :class="['badge', badgeClass()]">{{ levelLabel(level) }}</span>
      <span class="muted" style="margin-left: 0.5rem;">Composite risk index {{ score }}% (for model and human comparison, not the final conclusion)</span>
    </p>
    <div v-if="!hasHistory" class="no-history-tip">
      <p>No historical month data available. Percentiles are approximate (50% means no historical comparison).</p>
      <p class="no-history-reasons">Requested {{ archiveRequested }} past-year month fetches, succeeded {{ archiveSuccess }}, daily samples parsed {{ historySampleDays }}. If samples are 0, check network, Open-Meteo rate limits, or archive coverage for that area.</p>
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
.section-title { margin: 1.25rem 0 0.5rem; font-size: 1.1rem; }
.muted { color: var(--muted); font-size: 0.9rem; }
.sub { font-size: 1rem; margin: 0.75rem 0 0.25rem; color: var(--muted); }
.reason-block { margin-top: 0.5rem; }
.no-history-tip { font-size: 0.85rem; color: var(--warning); margin-top: 0.5rem; }
.no-history-tip p { margin: 0.25rem 0; }
.no-history-reasons { color: var(--muted); font-size: 0.8rem; }
.advice-skip { font-size: 0.9rem; margin-bottom: 0.5rem; }
.advice-loading { color: var(--muted); margin: 0.25rem 0 0.75rem; }
.advice-error { color: var(--danger, #c0392b); margin: 0.25rem 0 0.75rem; }
.ai-advice-body {
  white-space: pre-wrap;
  line-height: 1.55;
  margin: 0.25rem 0 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--card-subtle, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--border, #ddd);
}
</style>
