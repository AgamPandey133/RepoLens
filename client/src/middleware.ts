import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    const pathname = req.nextUrl.pathname;

    const publicPaths = ["/sign-in", "/sign-up", "/api/auth", "/api/webhooks", "/api/bot/webhook"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    // If user is not logged in and trying to access protected paths (not public), redirect to sign-in
    if (!token && !isPublic) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
