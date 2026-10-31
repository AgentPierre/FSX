import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { usingStub } from "./lib/data/mode";

export async function middleware(request: NextRequest) {
  if (usingStub()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name,value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name,value,options));
      },
    },
  });
  // Verify/refresh with Auth; never trust an unverified getSession() cookie.
  await db.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/login", "/owner/:path*", "/staff/:path*", "/api/owner/:path*", "/api/staff/:path*", "/api/account/:path*", "/api/users/me", "/api/orders/:path*/ticket"],
};
