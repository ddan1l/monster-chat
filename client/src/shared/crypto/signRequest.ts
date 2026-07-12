import { useCrypto, toBase64 } from "@shared/crypto/useCrypto";

// Подписывает HTTP-запрос: клиент подписывает `METHOD path?query timestamp`
// приватным ключом. Сервер проверяет подпись и свежесть timestamp — знание
// чужого публичного ключа запрос не подделает.
export async function signRequest(
    method: string,
    url: string
): Promise<Record<string, string>> {
    const { sign, exportSignPublicKey } = useCrypto();
    const { pathname, search } = new URL(url, window.location.origin);
    const timestamp = Date.now().toString();
    const canonical = `${method.toUpperCase()} ${pathname}${search} ${timestamp}`;
    const signature = await sign(new TextEncoder().encode(canonical));
    return {
        "x-sign-key": await exportSignPublicKey(),
        "x-timestamp": timestamp,
        "x-signature": toBase64(signature),
    };
}
