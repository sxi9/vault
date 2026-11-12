import QRCode from "qrcode";
import { tagUrl } from "./config";

/** SVG markup for a tag's QR (encodes the public tag URL). */
export async function qrSvg(code: string, opts: { size?: number; margin?: number } = {}): Promise<string> {
  return QRCode.toString(tagUrl(code), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: opts.margin ?? 0,
    width: opts.size ?? 256,
    color: { dark: "#121214", light: "#ffffff" },
  });
}

/** PNG buffer for download / print. */
export async function qrPng(code: string, size = 1024): Promise<Buffer> {
  return QRCode.toBuffer(tagUrl(code), { type: "png", errorCorrectionLevel: "M", margin: 1, width: size });
}
