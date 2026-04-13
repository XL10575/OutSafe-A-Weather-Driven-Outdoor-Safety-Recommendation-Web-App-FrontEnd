<script setup>
import { onMounted, ref, watch } from 'vue'
import MapPicker from './MapPicker.vue'

const ACTIVITY_PROMPT_KEY = 'outsafe_activity_prompt'

const emit = defineEmits(['submit'])
const lat = ref(41.4993)
const lon = ref(-81.6944)
const elevation = ref('')
const yearsBack = ref(5)
const activityPrompt = ref('')

onMounted(() => {
  try {
    const s = localStorage.getItem(ACTIVITY_PROMPT_KEY)
    if (typeof s === 'string') activityPrompt.value = s
  } catch {
    /* ignore */
  }
})

watch(activityPrompt, (v) => {
  try {
    localStorage.setItem(ACTIVITY_PROMPT_KEY, v)
  } catch {
    /* ignore */
  }
})

function onMapSelect({ lat: newLat, lon: newLon }) {
  lat.value = Math.round(newLat * 1e5) / 1e5
  lon.value = Math.round(newLon * 1e5) / 1e5
}

function onSubmit() {
  const payload = {
    lat: Number(lat.value),
    lon: Number(lon.value),
    elevation: elevation.value === '' ? undefined : Number(elevation.value),
    yearsBack: Math.min(10, Math.max(1, Number(yearsBack.value) || 5)),
    activityPrompt: String(activityPrompt.value || '').trim(),
  }
  emit('submit', payload)
}
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0;">Location</h2>
    <p class="muted" style="margin-bottom: 0.5rem;">Click the map or enter coordinates. Timezone is detected automatically (timezone=auto).</p>
    <MapPicker :lat="lat" :lon="lon" @select="onMapSelect" />
    <div class="form-row">
      <div class="form-group">
        <label>Latitude</label>
        <input v-model.number="lat" type="number" step="any" placeholder="41.4993" />
      </div>
      <div class="form-group">
        <label>Longitude</label>
        <input v-model.number="lon" type="number" step="any" placeholder="-81.6944" />
      </div>
    </div>
    <div class="form-group">
      <label>Elevation (m, optional)</label>
      <input v-model="elevation" type="number" step="any" placeholder="Leave blank to auto-detect" />
    </div>
    <div class="form-group">
      <label>Past years to compare (same month, all days per year)</label>
      <input v-model.number="yearsBack" type="number" min="1" max="10" />
    </div>
    <div class="form-group">
      <label>Activity description (sent to AI, can be saved long-term)</label>
      <textarea
        v-model="activityPrompt"
        class="activity-textarea"
        rows="4"
        placeholder="For example: Today I'm going to hike. Or: I'm just driving for a spin, as long as it's not snowing."
      />
      <p class="muted" style="margin: 0.35rem 0 0; font-size: 0.85rem;">
        Describe your outdoor type, the backend will combine the weather and risk indicators below to let the model determine if it is suitable。
      </p>
    </div>
    <button type="button" @click="onSubmit">Get outdoor safety advice</button>
  </div>
</template>

<style scoped>
.muted { color: var(--muted); font-size: 0.9rem; }
.activity-textarea {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border, #ccc);
  resize: vertical;
  min-height: 5rem;
}
</style>
