import { env, emailConfigured, emailProvider, aiConfigured } from './config/env'
import { prisma } from './config/prisma'
import { app } from './app'

async function main() {
  // Warn (do not crash) if the database is down so /health can report it.
  try {
    await prisma.$connect()
    console.log('[db] connected to PostgreSQL')
  } catch (e) {
    console.error('[db] could not connect to PostgreSQL – check DATABASE_URL and that the server is running.')
    console.error('     ', (e as Error).message.split('\n').slice(-2).join(' '))
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[server] SafeWalk API listening on http://localhost:${env.PORT}`)
    console.log(`[config] E-mail alerts: ${emailConfigured ? `configured (${emailProvider})` : 'NOT configured (alerts will be recorded but no e-mail sent)'}`)
    if (env.BREVO_API_KEY && !env.EMAIL_FROM) console.warn('[config] BREVO_API_KEY is set but EMAIL_FROM is missing, so Brevo cannot be used.')
    console.log(`[config] AI chatbot: ${aiConfigured ? `configured (${env.AI_MODEL})` : 'NOT configured (assistant uses built-in knowledge base)'}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`)
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((e) => {
  console.error('[server] failed to start', e)
  process.exit(1)
})
