import { useCrypto, toBase64 } from "@shared/crypto/useCrypto";

import type { FileAttachment } from "shared";

export function useFileUpload() {
    const { exportSignPublicKey, encryptBytes } = useCrypto();

    async function uploadFile(
        file: File,
        chatId: string
    ): Promise<FileAttachment> {
        const { encrypted, keyRaw, iv } = await encryptBytes(
            await file.arrayBuffer()
        );
        const signPubKey = await exportSignPublicKey();

        const response = await fetch(`/api/files/${chatId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "X-Sign-Key": signPubKey,
            },
            body: encrypted,
        });

        if (!response.ok) {
            throw new Error("Upload failed");
        }

        const { fileUrl } = await response.json();

        return {
            url: fileUrl,
            key: toBase64(keyRaw),
            iv: toBase64(iv),
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
        };
    }

    return { uploadFile };
}
