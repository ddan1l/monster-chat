<template>
    <span class="icon-dot"></span>
</template>

<style lang="scss">
.icon-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--mc-acid);
    box-shadow: 0 0 8px var(--mc-acid);
    animation: pulse 2s infinite;
    display: block;
}
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}
</style>
