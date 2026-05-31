/**
 * src/lib/supabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase client configured to use Clerk's JWT for Row-Level Security.
 *
 * SYSTEM DESIGN: Why attach Clerk token to Supabase?
 *   Supabase RLS policies check auth.uid() (or the 'sub' JWT claim).
 *   By attaching the Clerk token, Supabase knows WHO is making the request
 *   and enforces "users can only read/write their own data" at the DB level.
 *   This is defense-in-depth: even if our Django code has a bug, the DB
 *   won't return other users' data.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClient } from '@supabase/supabase-js'
import { useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Create a Supabase client that attaches Clerk's JWT on every request.
 * @param {Function} getToken - Clerk's getToken function
 */
export function createClerkSupabaseClient(getToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: async (url, options = {}) => {
        // Get the Clerk JWT specifically for Supabase
        // 'supabase' is the Clerk JWT Template name you create in Clerk Dashboard
        const clerkToken = await getToken({ template: 'supabase' })
        const headers = new Headers(options.headers)
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`)
        }
        return fetch(url, { ...options, headers })
      },
    },
  })
}

/**
 * Hook: returns a Supabase client authenticated as the current Clerk user.
 * useMemo ensures the client is only recreated when getToken changes.
 * Big-O: O(1) — cached, not recreated on every render.
 */
export function useSupabase() {
  const { getToken } = useAuth()
  return useMemo(() => createClerkSupabaseClient(getToken), [getToken])
}