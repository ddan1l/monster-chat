export function useDebounce(fn: () => void | Promise<void>, delay: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(): void {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            timer = null;
            void fn();
        }, delay);
    }

    function cancel(): void {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    return { schedule, cancel };
}
