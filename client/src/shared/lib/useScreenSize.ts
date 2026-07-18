import { computed, onMounted, ref } from "vue";

const width = ref(window.innerWidth);
const height = ref(window.innerHeight);

function updateSize() {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
}

let initialized = false;

export function useScreenSize() {
    onMounted(() => {
        if (!initialized) {
            updateSize();
            window.addEventListener("resize", updateSize);
            initialized = true;
        }
    });

    return {
        width,
        height,

        isMobile: computed(() => width.value <= 768),
        isTablet: computed(() => width.value > 768 && width.value < 1024),
        isDesktop: computed(() => width.value >= 1024),
    };
}
