import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, createSessionForUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    try {
        const { email, password, name, imageUrl } = await req.json()
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Missing email or password' },
                { status: 400 }
            )
        }

        const cleanEmail = email.trim().toLowerCase()
        const cleanName = (name || '').trim() || cleanEmail.split('@')[0]

        const existing = await prisma.user.findUnique({ where: { email: cleanEmail } })
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
        }

        const hashed = await hashPassword(password)
        const user = await prisma.user.create({
            data: {
                email: cleanEmail,
                password: hashed,
                name: cleanName,
                imageUrl: imageUrl ?? null,
            },
        })

        const session = await createSessionForUser(user.id)

        const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://");
        const cookieStore = await cookies()
        cookieStore.set({
            name: 'session',
            value: session.token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && isHttps,
            sameSite: 'lax',
            path: '/',
            expires: session.expiresAt,
        })

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                imageUrl: user.imageUrl,
            },
        })
    } catch (err: any) {
        console.error("Sign-up error:", err);
        const errMsg = err?.message || "";
        if (errMsg.includes("tenant") || errMsg.includes("ENOTFOUND") || errMsg.includes("Can't reach database") || err?.name === "PrismaClientInitializationError") {
            return NextResponse.json({
                error: "Database is unreachable or paused. Please restore/unpause your project in the Supabase dashboard."
            }, { status: 503 });
        }
        return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
    }
}
