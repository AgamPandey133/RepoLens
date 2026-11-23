import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, createSessionForUser } from '@/lib/auth'
import { cookies } from 'next/headers'


export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()
        if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })

        const cleanEmail = email.trim().toLowerCase()
        const user = await prisma.user.findUnique({ where: { email: cleanEmail } })
        if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

        const ok = await verifyPassword(password, user.password)
        if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })


        const session = await createSessionForUser(user.id)

        const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");
        const cookieStore = await cookies();
        cookieStore.set({
            name: 'session',
            value: session.token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && isHttps,
            sameSite: 'lax',
            path: '/',
            expires: session.expiresAt
        })


        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl } })
    } catch (err: any) {
        console.error("Sign-in error:", err);
        const errMsg = err?.message || "";
        if (errMsg.includes("tenant") || errMsg.includes("ENOTFOUND") || errMsg.includes("Can't reach database") || err?.name === "PrismaClientInitializationError") {
            return NextResponse.json({
                error: "Database is unreachable or paused. Please restore/unpause your project in the Supabase dashboard."
            }, { status: 503 });
        }
        return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
    }
}