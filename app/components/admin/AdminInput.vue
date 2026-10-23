<script setup lang="ts">
const props = defineProps<{ label: string, modelValue: string | number | null | undefined, type?: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'tel', hint?: string, rows?: number, placeholder?: string, min?: number, max?: number, step?: number, maxlength?: number }>()
const emit = defineEmits<{ 'update:modelValue': [v: string | number] }>()
const id = useId()
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', props.type === 'number' ? Number(v) : v)
}
</script>

<template>
  <div>
    <label :for="id" class="ad-label">{{ label }}</label>
    <textarea v-if="type === 'textarea'" :id="id" class="ad-input" :rows="rows ?? 3" :value="modelValue ?? ''" :maxlength="maxlength" :placeholder="placeholder" @input="onInput" />
    <input v-else :id="id" class="ad-input" :type="type ?? 'text'" :value="modelValue ?? ''" :min="min" :max="max" :step="step" :maxlength="maxlength" :placeholder="placeholder" @input="onInput">
    <p v-if="hint" class="ad-hint">{{ hint }}</p>
  </div>
</template>
