import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Logo'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-[56px] font-bold leading-none tracking-[-0.04em]">404</h1>
      <p className="text-slate-600">This page does not exist.</p>
      <Link to="/"><Button variant="dark">Back to home</Button></Link>
    </div>
  )
}
