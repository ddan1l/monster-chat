const ua = navigator.userAgent;

const isAndroid = /android/i.test(ua);

// iPadOS 13+ маскируется под Mac, поэтому отдельно проверяем тач на «Mac».
const isIPad =
    /ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

const isIOS = /iphone|ipod/i.test(ua) || isIPad;

const isMobile = isAndroid || isIOS;
const isDesktop = !isMobile;

export function useDevice() {
    return { isMobile, isDesktop, isIOS, isAndroid, isIPad };
}
