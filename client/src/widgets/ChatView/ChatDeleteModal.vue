<script setup lang="ts">
import { ref, watch } from "vue";

import AppButton from "@shared/ui/components/AppButton.vue";
import AppCheckbox from "@shared/ui/components/AppCheckbox.vue";
import AppModal from "@shared/ui/components/AppModal.vue";

const props = defineProps<{ visible: boolean; isSelf: boolean }>();
const emit = defineEmits<{ confirm: [alsoPeer: boolean]; close: [] }>();

// Чекбокс «также у собеседника» — сбрасываем при каждом открытии.
const alsoPeer = ref(false);
watch(
    () => props.visible,
    (v) => {
        if (v) {
            alsoPeer.value = false;
        }
    }
);

function confirm(): void {
    emit("confirm", props.isSelf && alsoPeer.value);
}
</script>

<template>
    <AppModal
        :is-visible="visible"
        title="Удалить сообщение"
        :max-width="360"
        @close="emit('close')"
    >
        <div class="mc-del">
            <AppCheckbox v-if="isSelf" v-model="alsoPeer">
                Удалить также у собеседника
            </AppCheckbox>
            <div class="mc-del__actions">
                <AppButton variant="danger" @click="confirm">
                    Удалить
                </AppButton>
            </div>
        </div>
    </AppModal>
</template>

<style scoped lang="scss">
.mc-del {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &__actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }
}
</style>
