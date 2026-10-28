// src/utils/validate.ts
// Challenge no 6 (Bonus): validasi input yang lebih rapi dan pesan error yang jelas.
import { HttpError } from "./http-error";

// Format dasar: teks@teks.teks, tanpa spasi
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt hanya memakai 72 byte pertama dari password
export const NAME_MAX = 100;

// Setiap fungsi check* mengembalikan PESAN ERROR kalau tidak valid,
// atau null kalau valid. Parameternya unknown karena isi req.body bisa apa saja.

export const checkEmail = (value: unknown): string | null => {
  if (value === undefined || value === null) return "Email wajib diisi";
  if (typeof value !== "string") return "Email harus berupa teks";
  const email = value.trim();
  if (email === "") return "Email wajib diisi";
  if (email.length > EMAIL_MAX) return `Email maksimal ${EMAIL_MAX} karakter`;
  if (!EMAIL_REGEX.test(email)) {
    return "Format email tidak valid (contoh: nama@domain.com)";
  }
  return null;
};

export const checkPassword = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return "Password wajib diisi";
  if (typeof value !== "string") return "Password harus berupa teks";
  if (value.length < PASSWORD_MIN) {
    return `Password minimal ${PASSWORD_MIN} karakter`;
  }
  if (Buffer.byteLength(value) > PASSWORD_MAX) {
    return `Password terlalu panjang (maksimal ${PASSWORD_MAX} karakter)`;
  }
  return null;
};

// name opsional (di schema: String?), tapi kalau diisi harus teks yang valid.
export const checkName = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "Name harus berupa teks";
  const name = value.trim();
  if (name === "") return "Name tidak boleh kosong jika diisi";
  if (name.length > NAME_MAX) return `Name maksimal ${NAME_MAX} karakter`;
  return null;
};

// Kumpulkan semua hasil check*, buang yang null, lalu lempar SATU HttpError 400
// berisi semua pesan, jadi client tahu semua kesalahannya sekaligus.
export const assertValid = (...results: (string | null)[]): void => {
  const messages = results.filter((r): r is string => r !== null);
  if (messages.length > 0) {
    throw new HttpError(400, messages.join("; "));
  }
};