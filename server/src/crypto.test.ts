import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";

import {
    generateNonce,
    decodeBase64,
    encodeUtf8,
    verifySignature,
} from "./crypto.js";

const { subtle } = webcrypto;

async function makeSigner() {
    const pair = await subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    );
    const raw = await subtle.exportKey("raw", pair.publicKey);
    const pubB64 = Buffer.from(raw).toString("base64");
    async function sign(data: ArrayBuffer): Promise<string> {
        const sig = await subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            pair.privateKey,
            data
        );
        return Buffer.from(sig).toString("base64");
    }
    return { pubB64, sign };
}

test("generateNonce returns distinct base64 values", () => {
    const a = generateNonce();
    const b = generateNonce();
    assert.notEqual(a, b);
    assert.ok(Buffer.from(a, "base64").length === 32);
});

test("encodeUtf8 / decodeBase64 roundtrip", () => {
    const s = "GET /api/messages/x 123";
    const bytes = new Uint8Array(encodeUtf8(s));
    assert.equal(Buffer.from(bytes).toString("utf8"), s);
    const b64 = Buffer.from("hello").toString("base64");
    assert.equal(Buffer.from(decodeBase64(b64)).toString("utf8"), "hello");
});

test("verifySignature accepts a valid signature", async () => {
    const { pubB64, sign } = await makeSigner();
    const nonce = generateNonce();
    const data = decodeBase64(nonce);
    const sig = await sign(data);
    assert.equal(await verifySignature(pubB64, data, sig), true);
});

test("verifySignature rejects tampered data", async () => {
    const { pubB64, sign } = await makeSigner();
    const data = decodeBase64(generateNonce());
    const sig = await sign(data);
    const tampered = decodeBase64(generateNonce()); // другая нагрузка
    assert.equal(await verifySignature(pubB64, tampered, sig), false);
});

test("verifySignature rejects a foreign key", async () => {
    const signer = await makeSigner();
    const other = await makeSigner();
    const data = decodeBase64(generateNonce());
    const sig = await signer.sign(data);
    assert.equal(await verifySignature(other.pubB64, data, sig), false);
});

test("verifySignature returns false on malformed input", async () => {
    assert.equal(
        await verifySignature("not-base64!!", encodeUtf8("x"), "nope"),
        false
    );
});
