<script setup lang="ts">
import { computed } from "vue";

interface InviteLinkParts {
    base: string;
    code: string;
    hashKey: string;
    key: string;
}

const props = defineProps<{
    link: string;
}>();

const isValidLink = (url: string): boolean => {
    return /^https?:\/\/[^/]+\/(app\/)?join\/[^#]+#key=.+$/.test(url);
};

const parseInviteLink = (url: string): InviteLinkParts => {
    const regex = /^(https?:\/\/[^/]+\/(app\/)?join\/)([^#]+)(#key=)(.+)$/;
    const match = url.match(regex);

    if (!match) {
        throw new Error("Неверный формат ссылки");
    }

    return {
        base: match[1],
        code: match[3],
        hashKey: match[4],
        key: match[5],
    };
};

const parts = computed<InviteLinkParts>(() => {
    if (!isValidLink(props.link)) {
        throw new Error("Неверный формат ссылки");
    }

    return parseInviteLink(props.link);
});
</script>

<template>
    <code class="invite-link">
        <span class="base">{{ parts.base }}</span>
        <span class="code">{{ parts.code }}</span>
        <span class="hash-key">{{ parts.hashKey }}</span>
        <span class="key">{{ parts.key }}</span>
    </code>
</template>

<style scoped>
.base {
    color: var(--mc-fg-dim);
}

.code {
    color: var(--mc-acid);
}

.hash-key {
    color: var(--mc-fg-dim);
}

.key {
    color: var(--mc-fg-mute);
}
</style>
