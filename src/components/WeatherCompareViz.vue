<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Output of `buildCompareVizSeries` */
  rows: { type: Array, default: () => [] },
  hasHistory: { type: Boolean, default: false },
  yearsBack: { type: Number, default: 5 },
})

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const x = Number(n)
  if (Math.abs(x) >= 100) return x.toFixed(0)
  return x.toFixed(1)
}

function axisSpan(hist, today) {
  if (!hist) {
    const t = today != null ? Number(today) : 0
    const pad = Math.max(Math.abs(t) * 0.1, 1e-3)
    return { lo: t - pad, hi: t + pad }
  }
  let lo = hist.min
  let hi = hist.max
  if (today != null && !Number.isNaN(Number(today))) {
    const t = Number(today)
    lo = Math.min(lo, t)
    hi = Math.max(hi, t)
  }
  const span = hi - lo
  const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(hi) * 0.05, 1e-3)
  return { lo: lo - pad, hi: hi + pad }
}

function pct(val, lo, hi) {
  if (val == null || Number.isNaN(val)) return null
  if (hi === lo) return 50
  return Math.min(100, Math.max(0, ((Number(val) - lo) / (hi - lo)) * 100))
}

const prepared = computed(() => {
  return (props.rows || []).map((row) => {
    const { hist, today } = row
    const { lo, hi } = axisSpan(hist, today)
    const iqrLeft = hist ? pct(hist.p25, lo, hi) : null
    const iqrWidth = hist ? Math.max(0, pct(hist.p75, lo, hi) - (iqrLeft ?? 0)) : null
    const medianPct = hist ? pct(hist.p50, lo, hi) : null
    const todayPct = today != null ? pct(today, lo, hi) : null
    return {
      ...row,
      lo,
      hi,
      iqrLeft,
      iqrWidth,
      medianPct,
      todayPct,
      fmtToday: fmt(today),
      fmtMed: hist ? fmt(hist.p50) : '—',
      fmtMin: hist ? fmt(hist.min) : '—',
      fmtMax: hist ? fmt(hist.max) : '—',
    }
  })
})
</script>

<template>
  <section class="viz" aria-label="Weather comparison chart">
    <h4 class="viz__title">Today vs past (same month)</h4>
    <p class="viz__caption">
      Gray band = historical IQR (25–75%); line = median. Marker = today. Based on up to {{ yearsBack }} years of
      daily samples.
    </p>

    <div v-if="!hasHistory" class="viz__empty">No historical samples — bars show today’s value on a neutral scale only.</div>

    <div v-for="row in prepared" :key="row.key" class="viz-row">
      <div class="viz-row__head">
        <span class="viz-row__label">{{ row.label }}</span>
        <span class="viz-row__nums">
          <strong>{{ row.fmtToday }}</strong>{{ row.unit }}
          <span v-if="row.hist" class="viz-row__meta"> · median {{ row.fmtMed }}</span>
        </span>
      </div>
      <div class="viz-track" role="img" :aria-label="`${row.label}: today ${row.fmtToday}`">
        <div class="viz-track__bg" />
        <template v-if="row.hist && row.iqrLeft != null && row.iqrWidth != null">
          <div class="viz-iqr" :style="{ left: row.iqrLeft + '%', width: row.iqrWidth + '%' }" title="Historical 25–75%" />
          <div class="viz-median" :style="{ left: row.medianPct + '%' }" title="Historical median" />
        </template>
        <div
          v-if="row.todayPct != null"
          class="viz-today"
          :style="{ left: row.todayPct + '%' }"
          :title="'Today: ' + row.fmtToday"
        />
      </div>
      <div v-if="row.hist" class="viz-axis">
        <span>{{ row.fmtMin }}</span>
        <span>{{ row.fmtMax }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.viz {
  margin: 0.75rem 0 0.25rem;
  padding: 0.65rem 0.5rem 0.5rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.viz__title {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted, #8b949e);
}

.viz__caption {
  margin: 0 0 0.65rem;
  font-size: 0.68rem;
  line-height: 1.4;
  color: var(--muted, #8b949e);
}

.viz__empty {
  font-size: 0.72rem;
  color: var(--warning, #d29922);
  margin-bottom: 0.5rem;
}

.viz-row {
  margin-bottom: 0.65rem;
}

.viz-row:last-child {
  margin-bottom: 0;
}

.viz-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
}

.viz-row__label {
  color: var(--text-secondary, #b7c0c9);
  font-weight: 600;
}

.viz-row__nums {
  color: var(--text, #e6edf3);
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem;
  text-align: right;
}

.viz-row__nums strong {
  color: var(--accent, #58a6ff);
  font-weight: 700;
}

.viz-row__meta {
  color: var(--muted, #8b949e);
  font-weight: 400;
}

.viz-track {
  position: relative;
  height: 14px;
  border-radius: 7px;
  margin-bottom: 0.2rem;
}

.viz-track__bg {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.viz-iqr {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 4px;
  background: rgba(139, 148, 158, 0.35);
  pointer-events: none;
}

.viz-median {
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: rgba(230, 237, 243, 0.85);
  pointer-events: none;
  z-index: 1;
}

.viz-today {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 10px;
  margin-left: -5px;
  border-radius: 3px;
  background: linear-gradient(180deg, #6eb4ff, var(--accent, #58a6ff));
  box-shadow: 0 0 0 2px rgba(15, 20, 25, 0.9);
  z-index: 2;
  pointer-events: none;
}

.viz-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  color: var(--muted, #8b949e);
  font-variant-numeric: tabular-nums;
}
</style>
