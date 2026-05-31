/**
 * useApiClient.js — Axios with Clerk JWT attached automatically
 */
import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import axios from 'axios'

export function useApiClient() {
  const { getToken } = useAuth()
  return useMemo(() => {
    const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
    })
    client.interceptors.request.use(async (config) => {
      const token = await getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })
    return client
  }, [getToken])
}