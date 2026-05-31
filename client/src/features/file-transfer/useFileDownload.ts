import type { FileAttachment } from "shared";
import { useCrypto, fromBase64 } from "@shared/crypto/useCrypto";

export function useFileDownload() {
    const { decryptBytes } = useCrypto();

    async function downloadFile(attachment: FileAttachment): Promise<void> {
        const response = await fetch(attachment.url);
        if (!response.ok) {
            throw new Error("Failed to download file");
        }

        const decrypted = await decryptBytes(
            await response.arrayBuffer(),
            fromBase64(attachment.key),
            fromBase64(attachment.iv)
        );

        const blob = new Blob([decrypted], { type: attachment.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    return { downloadFile };
}
