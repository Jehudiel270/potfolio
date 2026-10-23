<script setup lang="ts">
defineProps<{ modelValue: boolean, label: string, hint?: string }>()
defineEmits<{ 'update:modelValue': [v: boolean] }>()
</script>

<template>
  <label class="flex cursor-pointer items-start gap-3">
    <input type="checkbox" class="mt-1 h-4 w-4 accent-sky-400" :checked="modelValue" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)">
    <span><span class="block text-sm font-semibold">{{ label }}</span><span v-if="hint" class="ad-hint !mt-0 block">{{ hint }}</span></span>
  </label>
</template>
