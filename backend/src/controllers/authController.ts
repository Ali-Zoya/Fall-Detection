import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'
import { badRequest, conflict, unauthorized } from '../utils/errors'
import { signToken } from '../utils/jwt'
import { normalizePhone } from '../utils/phone'
import { toPublicUser } from '../utils/publicUser'

const BCRYPT_ROUNDS = 12
// Compared against when the e-mail does not exist, so response time does not reveal which e-mails are registered.
const DUMMY_HASH = bcrypt.hashSync('safewalk-timing-equaliser', BCRYPT_ROUNDS)

const phoneField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v)
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number, e.g. +91 98765 43210' })
      return z.NEVER
    }
    return n
  })

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid e-mail address').max(200),
  phone: phoneField,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid e-mail address'),
  password: z.string().min(1, 'Password is required').max(72),
})

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: phoneField,
    countdownSeconds: z.number().int().min(5, 'Minimum is 5 seconds').max(60, 'Maximum is 60 seconds'),
    shareLocation: z.boolean(),
    sensitivity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    alertSound: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body as z.infer<typeof registerSchema>
  if (await prisma.user.findUnique({ where: { email } })) {
    throw conflict('An account with this e-mail already exists')
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({ data: { name, email, phone, passwordHash } })
  res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>
  const user = await prisma.user.findUnique({ where: { email } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) throw unauthorized('Incorrect e-mail or password')
  res.json({ token: signToken(user.id), user: toPublicUser(user) })
})

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) throw unauthorized('Account no longer exists')
  res.json({ user: toPublicUser(user) })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const data = req.body as z.infer<typeof profileSchema>
  if (Object.keys(data).length === 0) throw badRequest('Nothing to update')
  const user = await prisma.user.update({ where: { id: req.userId! }, data })
  res.json({ user: toPublicUser(user) })
})
