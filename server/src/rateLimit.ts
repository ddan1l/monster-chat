export interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

export const BURST = Number(process.env.MSG_BURST ?? 50);
const REFILL_PER_SEC = Number(process.env.MSG_REFILL_PER_SEC ?? 10);

// Токен-бакет на соединение. Мутирует bucket, возвращает можно ли пропустить
// сообщение (т.е. персистить его). typing/ping не лимитируем — они не пишут в БД.
export function allowMessage(bucket: TokenBucket, now = Date.now()): boolean {
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
        BURST,
        bucket.tokens + elapsedSec * REFILL_PER_SEC
    );
    bucket.lastRefill = now;
    if (bucket.tokens < 1) {
        return false;
    }
    bucket.tokens -= 1;
    return true;
}
