import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './utils/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // First, get the response from next-intl
  const intlResponse = intlMiddleware(request);

  // Then, pass it through Supabase to refresh the session and attach auth cookies
  return await updateSession(request, intlResponse);
}

export const config = {
  matcher: ['/', '/(ru|en|kz)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
