import { API_PATHS } from "@/lib/paths"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export const useSignUp = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (userData: { email: string; password: string; name:string; imageUrl?: string }) => {
            const res = await fetch(API_PATHS.SIGN_UP, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(userData),

            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Signup failed")
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["authUser"] })
        }
    })
}