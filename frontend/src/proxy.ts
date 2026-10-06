import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/upload',
  '/analytics',
  '/budget',
  '/ai-chat',
  '/settings',
];

// Routes only for unauthenticated users (redirect to dashboard if already logged in)
const AUTH_ROUTES = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read token from cookie — localStorage is not accessible in proxy (server-side)
  const token = request.cookies.get('token')?.value;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
