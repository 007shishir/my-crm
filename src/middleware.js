import { betterFetch } from "@better-fetch/fetch";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const { data: session } = await betterFetch(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect specific business routes
  if (pathname.startsWith("/leads/")) {
    const businessSlug = pathname.split("/")[2];
    
    if (session.user.role === "admin" || session.user.role === "guest") {
      return NextResponse.next();
    }

    if (session.user.role === "employee" && !session.user.assignedBusinesses?.includes(businessSlug)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect Admin Portal routes
  if (pathname.startsWith("/admin")) {
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
