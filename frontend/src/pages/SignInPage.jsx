/**
 * src/pages/SignInPage.jsx + SignUpPage.jsx
 * Uses Clerk's pre-built <SignIn> and <SignUp> components.
 * WHY use Clerk's components? They handle:
 *   - Password validation, OAuth buttons, MFA, error messages
 *   - Token management, session persistence
 *   - All in a beautiful, accessible UI
 * We just need to wrap them in our layout.
 */
import { SignIn } from '@clerk/clerk-react'
import { BookOpen } from 'lucide-react'

function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-secondary-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <span className="font-display font-bold text-2xl text-parchment-50">LogosLight</span>
      </div>
      {children}
    </div>
  )
}

export default function SignInPage() {
  return (
    <AuthShell>
      {/* routing="path" and path="/sign-in" enable Clerk's multi-step flows */}
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthShell>
  )
}