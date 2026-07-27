import assert from "node:assert/strict";
import { test } from "node:test";

import { allowMessage, BURST, type TokenBucket } from "./rateLimit.js";

// Токен-бакет: полный бакет пропускает BURST подряд и блокирует следующее;
// со временем дозаправляется, но не выше BURST.

test("a full bucket allows BURST messages, then blocks", () => {
    const t0 = 1_000_000;
    const bucket: TokenBucket = { tokens: BURST, lastRefill: t0 };

    // Все BURST сообщений в один момент времени проходят.
    for (let i = 0; i < BURST; i++) {
        assert.equal(allowMessage(bucket, t0), true);
    }
    // BURST+1-е в тот же момент — отброшено.
    assert.equal(allowMessage(bucket, t0), false);
});

test("bucket refills over time", () => {
    const t0 = 1_000_000;
    const bucket: TokenBucket = { tokens: 0, lastRefill: t0 };

    // Пустой бакет — сразу блок.
    assert.equal(allowMessage(bucket, t0), false);

    // Через секунду накапало REFILL_PER_SEC (>=1) токенов — снова пропускает.
    assert.equal(allowMessage(bucket, t0 + 1000), true);
});

test("refill is capped at BURST", () => {
    const t0 = 1_000_000;
    const bucket: TokenBucket = { tokens: 0, lastRefill: t0 };

    // Прошёл час — но бакет не может превысить BURST.
    allowMessage(bucket, t0 + 3_600_000);
    assert.ok(bucket.tokens <= BURST);
});
