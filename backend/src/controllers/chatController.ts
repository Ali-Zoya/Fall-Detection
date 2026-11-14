import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler'
import { answerChat } from '../services/chatbotService'
import { aiConfigured } from '../config/env'
import { SUGGESTED_TOPICS } from '../services/knowledgeBase'

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
      }),
    )
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === 'user', { message: 'The last message must come from the user' }),
})

/**
 * POST /api/chat
 * Public (works before login). It uses NO account data, stores nothing, and never receives camera
 * frames. The browser sends the recent conversation so follow-up questions have context.
 */
export const chat = asyncHandler(async (req, res) => {
  const { messages } = req.body as z.infer<typeof chatSchema>
  const result = await answerChat(messages)
  res.json(result)
})

/** GET /api/chat/status – lets the UI show whether the AI model is configured. */
export const chatStatus = asyncHandler(async (_req, res) => {
  res.json({ aiConfigured, suggestions: SUGGESTED_TOPICS })
})
