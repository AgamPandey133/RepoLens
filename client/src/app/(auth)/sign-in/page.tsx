"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSignIn } from "@/hooks/use-signin"
import { useAuth } from "@/components/AuthProvider"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"

const SignInPage = () => {
  const { user } = useAuth()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const { mutate, isPending: isLoading } = useSignIn()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const formData = new FormData(formEl)

    const rawEmail = (formData.get("email") as string) || form.email || (formEl.elements.namedItem("email") as HTMLInputElement)?.value || ""
    const rawPassword = (formData.get("password") as string) || form.password || (formEl.elements.namedItem("password") as HTMLInputElement)?.value || ""

    const email = rawEmail.trim().toLowerCase()
    const password = rawPassword.trim()

    if (!email || !password) {
      toast.error("Please fill in both email and password")
      return
    }

    mutate({ email, password }, {
      onSuccess: () => {
        toast.success("Signed in successfully! Redirecting...")
        setTimeout(() => {
          window.location.href = "/"
        }, 300)
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to sign in")
      },
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 py-6">
      {/* Decorative background blobs */}
      <div className="absolute -top-10 -left-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

      {/* Already logged-in banner */}
      {user && (
        <div className="z-10 mb-4 w-full max-w-md p-2.5 rounded-xl border border-primary/30 bg-primary/10 text-center text-xs flex items-center justify-between gap-2 shadow-sm">
          <span>Signed in as <strong>{user.email}</strong></span>
          <Link href="/" className="inline-flex items-center text-primary font-semibold hover:underline">
            Go to Dashboard <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      )}

      {/* RepoLens Branding */}
      <div className="z-10 mb-5 select-none text-center">
        <Link href="/" className="inline-flex items-center gap-1">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-foreground drop-shadow-md">
            Repo
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-primary drop-shadow-md">
            Lens
          </span>
        </Link>
      </div>

      <div className="z-10 w-full max-w-md rounded-2xl border border-border bg-card/90 p-6 sm:p-7 shadow-xl backdrop-blur-md transition hover:shadow-2xl">
        <h1 className="mb-1.5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="mb-6 text-center text-xs sm:text-sm text-muted-foreground">
          Sign in to access your repositories and codebase insights
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="username email"
                required
                className="pl-10 h-10 text-foreground bg-background/80 text-sm"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                className="pl-10 pr-10 h-10 text-foreground bg-background/80 text-sm"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 sm:h-11 font-semibold tracking-wide transition-all hover:scale-[1.01] mt-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs sm:text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SignInPage
