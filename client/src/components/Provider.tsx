"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { ProjectProvider } from "./ProjectProvider"
import { AuthProvider } from "./AuthProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
    // ensure one QueryClient per app, not per render
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AuthProvider>
                    <ProjectProvider>
                        {children}
                    </ProjectProvider>
                </AuthProvider>
                <Toaster richColors position="top-right" />
            </ThemeProvider>
        </QueryClientProvider>
    )
}
