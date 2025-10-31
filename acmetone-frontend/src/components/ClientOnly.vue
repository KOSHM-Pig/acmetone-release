<template>
  <template v-if="mounted">
    <slot />
  </template>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const mounted = ref(false);

onMounted(() => {
  mounted.value = true;
});
</script> 