import { SignUp } from '@clerk/clerk-react'
import { BookOpen } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-secondary-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <span className="font-display font-bold text-2xl text-parchment-50">LogosLight</span>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  )
}