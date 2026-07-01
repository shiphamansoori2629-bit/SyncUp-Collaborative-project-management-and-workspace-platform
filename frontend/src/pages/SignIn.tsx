import { SignIn } from '@clerk/clerk-react'
import { AuthLayout } from '@/components/AuthLayout'

export function SignInPage() {
  return (
    <AuthLayout>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthLayout>
  )
}
