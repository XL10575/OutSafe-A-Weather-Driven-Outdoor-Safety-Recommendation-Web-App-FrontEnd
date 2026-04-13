<script setup>
import { ref } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    default: null
  }
})

const isExpanded = ref(true)

function toggleConsole() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="debug-console" :class="{ collapsed: !isExpanded }">
    <div class="console-header" @click="toggleConsole">
      <span class="title">Open-Meteo API Debug Console</span>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▲' }}</span>
    </div>
    <div class="console-body" v-show="isExpanded">
      <div v-if="!data" class="no-data">
        No API data loaded yet. Submit a location to see raw API response.
      </div>
      <pre v-else class="json-content">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.debug-console {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-width: 90vw;
  background-color: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: monospace;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: height 0.3s ease;
}

.debug-console.collapsed {
  height: 40px; /* Just the header */
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #2d2d2d;
  cursor: pointer;
  user-select: none;
  font-weight: bold;
  font-size: 14px;
}

.console-header:hover {
  background-color: #3d3d3d;
}

.toggle-icon {
  font-size: 12px;
}

.console-body {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.no-data {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.json-content {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 12px;
  line-height: 1.4;
  color: #9cdcfe;
}

/* Custom scrollbar for webkit */
.console-body::-webkit-scrollbar {
  width: 8px;
}

.console-body::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.console-body::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.console-body::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
</style>
