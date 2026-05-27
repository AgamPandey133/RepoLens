import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    const pathname = req.nextUrl.pathname;

    const publicPaths = ["/sign-in", "/sign-up", "/api/auth"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));

    // If user is logged in and trying to access sign-in/sign-up, redirect to home
    if (token && isPublic && !pathname.startsWith("/api/auth")) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // If user is not logged in and trying to access protected paths (not public), redirect to sign-in
    if (!token && !isPublic) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
