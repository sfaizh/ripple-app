import * as dotenv from 'dotenv';
import { createBrowserClient } from '@supabase/ssr';

if (typeof window === 'undefined') {
  dotenv.config({ path: '.env.local' });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
