import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setAuthTokenGetter } from '@/api/client'

export function AuthTokenSetup() {
  const { getToken, isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return  // ← Yeh line add karo

    setAuthTokenGetter(async () => {
      if (!isLoaded || !isSignedIn) return null
      try {
        return await getToken()  // ← skipCache: true hata do
      } catch {
        return null
      }
    })
  }, [getToken, isSignedIn, isLoaded])

  return null
}