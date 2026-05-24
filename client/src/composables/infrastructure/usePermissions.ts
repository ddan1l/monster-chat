import { ref, computed } from "vue";

export function usePermissions(name: PermissionName) {
    const status = ref<PermissionState>("prompt");
    const ready = ref(false);

    navigator.permissions.query({ name }).then((result) => {
        status.value = result.state;
        ready.value = true;
        result.addEventListener("change", () => {
            status.value = result.state;
        });
    });

    async function request(): Promise<void> {
        if (name === "notifications") {
            await Notification.requestPermission();
        }
    }

    const isGranted = computed(() => status.value === "granted");

    return { status, ready, isGranted, request };
}
