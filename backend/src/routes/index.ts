import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { authLimiter, chatLimiter, testEmailLimiter } from '../middleware/rateLimit'
import * as auth from '../controllers/authController'
import * as contacts from '../controllers/contactController'
import * as falls from '../controllers/fallController'
import * as notifications from '../controllers/notificationController'
import * as chat from '../controllers/chatController'

export const api = Router()

// ---- Authentication ----
api.post('/auth/register', authLimiter, validateBody(auth.registerSchema), auth.register)
api.post('/auth/login', authLimiter, validateBody(auth.loginSchema), auth.login)
api.get('/auth/me', requireAuth, auth.me)
api.put('/auth/profile', requireAuth, validateBody(auth.profileSchema), auth.updateProfile)

// ---- Emergency contacts (all require login, all scoped to the signed-in user) ----
api.get('/contacts', requireAuth, contacts.listContacts)
api.post('/contacts', requireAuth, validateBody(contacts.contactSchema), contacts.createContact)
api.put('/contacts/:id', requireAuth, validateBody(contacts.contactSchema), contacts.updateContact)
api.delete('/contacts/:id', requireAuth, contacts.deleteContact)

// ---- Fall events ----
api.post('/falls', requireAuth, validateBody(falls.createFallSchema), falls.createFall)
api.get('/falls', requireAuth, falls.listFalls)
api.get('/falls/:id', requireAuth, falls.getFall)
api.post('/falls/:id/resend', requireAuth, falls.resendFall)

// ---- Notifications ----
api.get('/notifications', requireAuth, notifications.listNotifications)
api.post('/notifications/test', testEmailLimiter, requireAuth, notifications.sendTest)

// ---- SafeWalk Assistant (public; no account data used) ----
api.get('/chat/status', chat.chatStatus)
api.post('/chat', chatLimiter, optionalAuth, validateBody(chat.chatSchema), chat.chat)
