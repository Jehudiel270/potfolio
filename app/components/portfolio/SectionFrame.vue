<script setup lang="ts">
const props = defineProps<{ id: string, vh: number, title?: string, intro?: string, empty?: string, plain?: boolean }>()
const { lite } = useScene()
</script>

<template>
  <section :id="id" class="pf-section" :style="{ height: lite ? undefined : `${props.vh}dvh` }" :aria-labelledby="title ? `${id}-h` : undefined">
    <div class="pin">
      <div class="pin-main" :class="plain ? '' : 'holo holo-lines p-5 sm:p-7'">
        <h2 v-if="title" :id="`${id}-h`" class="title-lg">{{ title }}</h2>
        <p v-if="intro" class="prose-pf mt-3">{{ intro }}</p>
        <p v-if="empty" class="prose-pf mt-3">{{ empty }}</p>
        <slot />
      </div>
      <div class="min-w-0 self-end" style="pointer-events: none"><div class="pointer-events-auto"><slot name="dock" /></div></div>
    </div>
  </section>
</template>
