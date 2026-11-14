import type { User } from '@prisma/client'

/** The user fields that may be sent to the browser (never the password hash). */
export function toPublicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    countdownSeconds: u.countdownSeconds,
    shareLocation: u.shareLocation,
    sensitivity: u.sensitivity,
    alertSound: u.alertSound,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}
