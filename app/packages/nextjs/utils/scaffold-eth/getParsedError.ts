import { BaseError as BaseViemError, ContractFunctionRevertedError } from "viem";

/**
 * Attempts to decode a raw hex string as printable UTF-8 text or standard Error(string).
 * Returns the decoded text if valid and printable, otherwise null.
 */
export function decodeRawUtf8Hex(hex: string): string | null {
  try {
    if (!hex || typeof hex !== "string") return null;
    let cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) return null;
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) return null;

    // Check if it starts with standard Error(string) selector 0x08c379a0
    if (cleanHex.startsWith("08c379a0") && cleanHex.length >= 138) {
      const lengthHex = cleanHex.slice(72, 136);
      const strLen = parseInt(lengthHex, 16);
      if (strLen > 0 && cleanHex.length >= 136 + strLen * 2) {
        const strHex = cleanHex.slice(136, 136 + strLen * 2);
        const bytes = new Uint8Array(strHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
        const decoded = new TextDecoder("utf-8").decode(bytes);
        if (decoded.trim()) return decoded.trim();
      }
    }

    // Try decoding payload as raw UTF-8 (common with Stylus string revert bytes)
    const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    // Validate printable ASCII/UTF-8 with no non-printable control characters
    if (/^[\x20-\x7E\s\u00A0-\uFFFF]+$/.test(text) && text.trim().length > 0) {
      return text.trim();
    }
  } catch {
    // Ignore error if not valid UTF-8
  }
  return null;
}

/**
 * Extract potential hex error payload from any error object or error string.
 */
export function extractHexData(error: any): string | null {
  if (!error) return null;

  const candidates = [
    error?.data?.data,
    error?.data?.raw,
    error?.data,
    error?.cause?.data,
    error?.cause?.cause?.data,
    error?.raw,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("0x") && c.length > 2) {
      return c;
    }
  }

  const fullText = `${error?.message || ""} ${error?.shortMessage || ""} ${error?.details || ""} ${error?.cause?.message || ""}`;

  const match = fullText.match(/0x[a-fA-F0-9]{8,}/);
  if (match) {
    return match[0];
  }

  return null;
}

/**
 * Parses a viem/wagmi error to get a displayable string
 */
// biome-ignore lint/suspicious/noExplicitAny: error object walk type
export const getParsedError = (error: any): string => {
  // First check if error payload contains raw UTF-8 revert string
  const hex = extractHexData(error);
  if (hex) {
    const rawText = decodeRawUtf8Hex(hex);
    if (rawText) {
      return rawText;
    }
  }

  const parsedError = error?.walk ? error.walk() : error;

  if (parsedError instanceof BaseViemError) {
    if (parsedError.details) {
      const detailsHex = extractHexData(parsedError.details);
      if (detailsHex) {
        const decoded = decodeRawUtf8Hex(detailsHex);
        if (decoded) return decoded;
      }
      return parsedError.details;
    }

    if (parsedError.shortMessage) {
      if (
        parsedError instanceof ContractFunctionRevertedError &&
        parsedError.data &&
        parsedError.data.errorName !== "Error"
      ) {
        const customErrorArgs = parsedError.data.args?.toString() ?? "";
        return `${parsedError.shortMessage.replace(/reverted\.$/, "reverted with the following reason:")}\n${
          parsedError.data.errorName
        }(${customErrorArgs})`;
      }

      const shortHex = extractHexData(parsedError.shortMessage);
      if (shortHex) {
        const decoded = decodeRawUtf8Hex(shortHex);
        if (decoded) return decoded;
      }

      return parsedError.shortMessage;
    }

    return parsedError.message ?? parsedError.name ?? "An unknown error occurred";
  }

  const genHex = extractHexData(parsedError);
  if (genHex) {
    const decoded = decodeRawUtf8Hex(genHex);
    if (decoded) return decoded;
  }

  return parsedError?.message ?? "An unknown error occurred";
};

