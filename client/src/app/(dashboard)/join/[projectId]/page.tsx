"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FolderKanban, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function JoinProjectPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();
    const projectId = params?.projectId as string;
    const [joining, setJoining] = useState(false);

    const handleJoin = async () => {
        if (!projectId) return;
        setJoining(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/join`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Joined project successfully!");
                router.push(`/project/${projectId}`);
            } else {
                toast.error(data.error || "Failed to join project");
            }
        } catch {
            toast.error("An error occurred while joining");
        } finally {
            setJoining(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-6">
                    <CardHeader>
                        <UserPlus className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="text-2xl mt-2">Join Project</CardTitle>
                        <CardDescription>
                            You have been invited to collaborate on a RepoLens project. Please sign in to accept.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/sign-in" className="block w-full">
                            <Button className="w-full">Sign In to Join</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-6 shadow-xl border border-border">
                <CardHeader>
                    <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary w-fit">
                        <FolderKanban className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-2xl font-bold mt-4">Project Invitation</CardTitle>
                    <CardDescription>
                        You have been invited to join this project on RepoLens.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full py-3 font-semibold text-base"
                    >
                        {joining ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining Project...
                            </>
                        ) : (
                            "Accept & Join Project"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
