import { signRequest } from "@shared/crypto/signRequest";
import { useCrypto, toBase64 } from "@shared/crypto/useCrypto";

import type { FileAttachment } from "shared";

export function useFileUpload() {
    const { encryptBytes } = useCrypto();

    async function uploadFile(
        file: File,
        chatId: string
    ): Promise<FileAttachment> {
        const { encrypted, keyRaw, iv } = await encryptBytes(
            await file.arrayBuffer()
        );
        const url = `/api/files/${chatId}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                ...(await signRequest("POST", url)),
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
