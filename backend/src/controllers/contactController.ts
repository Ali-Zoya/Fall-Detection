import { z } from 'zod'
import { prisma } from '../config/prisma'
import { asyncHandler } from '../utils/asyncHandler'
import { conflict, notFound } from '../utils/errors'
import { normalizePhone } from '../utils/phone'

const MAX_CONTACTS = 10

/** Optional: an empty value is stored as null. */
const optionalPhoneField = z
  .string()
  .trim()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null
    const n = normalizePhone(v)
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number, e.g. +91 98765 43210, or leave it empty' })
      return z.NEVER
    }
    return n
  })

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid e-mail address').max(200),
  phone: optionalPhoneField,
  relationship: z.string().trim().min(2, 'Relationship is required').max(50),
  isPrimary: z.boolean().optional(),
})

type ContactInput = z.infer<typeof contactSchema>

export const listContacts = asyncHandler(async (req, res) => {
  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: req.userId! },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
  res.json({ contacts })
})

export const createContact = asyncHandler(async (req, res) => {
  const userId = req.userId!
  const input = req.body as ContactInput

  const contact = await prisma.$transaction(async (tx) => {
    const count = await tx.emergencyContact.count({ where: { userId } })
    if (count >= MAX_CONTACTS) throw conflict(`You can save at most ${MAX_CONTACTS} contacts`)
    if (await tx.emergencyContact.findUnique({ where: { userId_email: { userId, email: input.email } } })) {
      throw conflict('You already saved a contact with this e-mail address')
    }
    // The first contact is always primary; otherwise only if requested.
    const makePrimary = count === 0 || input.isPrimary === true
    if (makePrimary) await tx.emergencyContact.updateMany({ where: { userId }, data: { isPrimary: false } })
    return tx.emergencyContact.create({
      data: { userId, name: input.name, email: input.email, phone: input.phone, relationship: input.relationship, isPrimary: makePrimary },
    })
  })
  res.status(201).json({ contact })
})

export const updateContact = asyncHandler(async (req, res) => {
  const userId = req.userId!
  const id = String(req.params.id)
  const input = req.body as ContactInput

  const contact = await prisma.$transaction(async (tx) => {
    // Ownership check: the contact must belong to the signed-in user.
    const existing = await tx.emergencyContact.findFirst({ where: { id, userId } })
    if (!existing) throw notFound('Contact not found')

    const clash = await tx.emergencyContact.findUnique({ where: { userId_email: { userId, email: input.email } } })
    if (clash && clash.id !== id) throw conflict('You already saved a contact with this e-mail address')

    // A primary contact cannot be "un-primaried" directly – choose another primary instead.
    const makePrimary = existing.isPrimary || input.isPrimary === true
    if (makePrimary && !existing.isPrimary) {
      await tx.emergencyContact.updateMany({ where: { userId }, data: { isPrimary: false } })
    }
    return tx.emergencyContact.update({
      where: { id },
      data: { name: input.name, email: input.email, phone: input.phone, relationship: input.relationship, isPrimary: makePrimary },
    })
  })
  res.json({ contact })
})

export const deleteContact = asyncHandler(async (req, res) => {
  const userId = req.userId!
  const id = String(req.params.id)

  await prisma.$transaction(async (tx) => {
    const existing = await tx.emergencyContact.findFirst({ where: { id, userId } })
    if (!existing) throw notFound('Contact not found')
    await tx.emergencyContact.delete({ where: { id } })
    // If the primary contact was deleted, promote the oldest remaining one.
    if (existing.isPrimary) {
      const next = await tx.emergencyContact.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
      if (next) await tx.emergencyContact.update({ where: { id: next.id }, data: { isPrimary: true } })
    }
  })
  res.status(204).send()
})
