"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSignUp } from "@/hooks/use-signup"
import { useAuth } from "@/components/AuthProvider"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, Lock, User as UserIcon, Camera, Eye, EyeOff, X, ArrowRight } from "lucide-react"

const SignUpPage = () => {
  const { user } = useAuth()
  const { mutate: signup, isPending: loading } = useSignUp()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Profile picture size must be under 10MB")
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxDim = 160
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL("image/jpeg", 0.8)
          setPreview(compressed)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setPreview(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const formData = new FormData(formEl)

    const rawName = (formData.get("name") as string) || form.name || (formEl.elements.namedItem("name") as HTMLInputElement)?.value || ""
    const rawEmail = (formData.get("email") as string) || form.email || (formEl.elements.namedItem("email") as HTMLInputElement)?.value || ""
    const rawPassword = (formData.get("password") as string) || form.password || (formEl.elements.namedItem("password") as HTMLInputElement)?.value || ""

    const name = rawName.trim()
    const email = rawEmail.trim().toLowerCase()
    const password = rawPassword.trim()

    if (!name || !email || !password) {
      toast.error("Please fill in all required fields")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    const payload = {
      name,
      email,
      password,
      ...(preview ? { imageUrl: preview } : {}),
    }

    signup(payload, {
      onSuccess: () => {
        toast.success("Account created successfully! Redirecting...")
        setTimeout(() => {
          window.location.href = "/"
        }, 300)
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create account")
      },
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 py-4 sm:py-6">
      {/* Decorative background */}
      <div className="absolute -top-10 -left-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-400/10 blur-3xl pointer-events-none" />

      {/* Already logged-in banner */}
      {mounted && user && (
        <div className="z-10 mb-3 w-full max-w-md p-2.5 rounded-xl border border-primary/30 bg-primary/10 text-center text-xs flex items-center justify-between gap-2 shadow-sm">
          <span>Signed in as <strong>{user.email}</strong></span>
          <Link href="/" className="inline-flex items-center text-primary font-semibold hover:underline">
            Go to Dashboard <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
      )}

      {/* Branding */}
      <div className="z-10 mb-4 select-none text-center">
        <Link href="/" className="inline-flex items-center gap-1">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-foreground drop-shadow-md">
            Repo
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-primary drop-shadow-md">
            Lens
          </span>
        </Link>
      </div>

      <div className="z-10 w-full max-w-md rounded-2xl border border-border bg-card/90 p-5 sm:p-7 shadow-xl backdrop-blur-md transition hover:shadow-2xl">
        <h1 className="mb-1 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Create an Account
        </h1>
        <p className="mb-4 text-center text-xs sm:text-sm text-muted-foreground">
          Join RepoLens and unlock intelligent insights for your GitHub repositories
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Profile Picture Upload */}
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <label
                htmlFor="profileImage"
                className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40 hover:bg-muted/60 transition-colors overflow-hidden group shadow-sm"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-foreground transition-colors">
                    <Camera className="h-5 w-5" />
                    <span className="text-[9px] font-medium leading-none mt-0.5">Photo</span>
                  </div>
                )}
                <input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {preview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Optional photo</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-foreground">
              Full Name
            </Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
                className="pl-10 h-10 text-foreground bg-background/80 text-sm"
              />
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                className="pl-10 h-10 text-foreground bg-background/80 text-sm"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                minLength={6}
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
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
