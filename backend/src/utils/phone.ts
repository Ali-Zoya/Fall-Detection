import { env } from '../config/env'

/**
 * Normalises a phone number to E.164 ("+919876543210").
 *  - spaces, dashes, dots and brackets are removed
 *  - "00" prefix is treated as "+"
 *  - a bare 10-digit number gets DEFAULT_COUNTRY_CODE (default +91)
 * Returns null if the result is not a plausible international number.
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s\-().]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (!s.startsWith('+')) {
    s = s.replace(/^0+/, '') // national trunk prefix
    if (!/^\d{10}$/.test(s)) return null
    s = env.DEFAULT_COUNTRY_CODE + s
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null
}
