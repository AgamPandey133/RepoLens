import { API_PATHS } from "@/lib/paths"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface SignInData {
    email: string
    password: string
}

export const useSignIn = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (userData: SignInData) => {
            const res = await fetch(API_PATHS.LOGIN, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(userData),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Sign in failed")
            }

            return data 
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["authUser"] })
        }
    })
}
