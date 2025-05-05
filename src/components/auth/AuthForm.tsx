import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { AuthService } from '@/lib/firebase/auth-service'
import { useAuth } from '@/contexts/AuthContext'
import GoogleSignIn from '@/components/auth/GoogleSignIn'
import AdminLoginForm from '@/components/auth/AdminLoginForm'

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false)
})

type AuthFormData = z.infer<typeof authSchema>

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authMode, setAuthMode] = useState<'email' | 'google' | 'admin'>('email')
  const [authMode, setAuthMode] = useState<'email' | 'google' | 'admin'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { signInAsAdmin } = useAuth()
  const authService = AuthService.getInstance()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      rememberMe: false
    }
  })

  const onSubmit = async (data: AuthFormData) => {
    try {
      setIsLoading(true)
      
      if (authMode === 'admin') {
        await signInAsAdmin(data.email, data.password)
        toast({
          title: "Welcome Admin",
          description: "Successfully signed in as administrator"
        })
        navigate('/dashboard')
      } else if (isSignUp) {
        await authService.signUp(data.email, data.password, data.rememberMe)
        toast({
          title: "Account created",
          description: "Welcome to Reality Film!"
        })
        navigate('/dashboard')
      } else {
        await authService.signIn(data.email, data.password, data.rememberMe)
        toast({
          title: "Welcome back",
          description: "Successfully signed in"
        })
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Auth error:', error)
      toast({
        title: "Authentication error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = (document.getElementById('email') as HTMLInputElement)?.value
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      await authService.resetPassword(email)
      toast({
        title: "Password reset email sent",
        description: "Please check your inbox for further instructions"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-tufti-surface/20 backdrop-blur-md rounded-xl p-8 border border-tufti-red/10">
        <div className="flex gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => setAuthMode('email')}
            className={authMode === 'email' ? 'bg-tufti-red/10' : ''}
          >
            Email
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAuthMode('google')}
            className={authMode === 'google' ? 'bg-tufti-red/10' : ''}
          >
            Google
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAuthMode('admin')}
            className={authMode === 'admin' ? 'bg-tufti-red/10' : ''}
          >
            Admin
          </Button>
        </div>

        {authMode === 'google' && <GoogleSignIn />}
        {authMode === 'admin' && <AdminLoginForm />}
        {authMode === 'email' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tufti-silver/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tufti-silver/60" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tufti-silver/60 hover:text-tufti-silver"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            {authMode === 'admin' && (
              <div className="text-sm text-tufti-gold">
                Admin credentials required
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register('rememberMe')} />
                <Label htmlFor="rememberMe" className="text-sm">Remember me</Label>
              </div>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-tufti-red hover:text-tufti-red/80"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? "Sign Up" : "Sign In"
              )}
            </Button>
            
            {authMode === 'email' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-tufti-silver hover:text-tufti-white"
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </motion.div>
  )
}