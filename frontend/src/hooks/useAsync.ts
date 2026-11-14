import { useCallback, useEffect, useRef, useState } from 'react'

/** Runs an async loader on mount / when deps change and exposes {data, error, loading, reload}. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const r = await loaderRef.current()
      if (id === seq.current) setData(r)
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => {
      seq.current++ // ignore results of outdated requests
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload }
}
