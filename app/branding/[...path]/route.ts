import { brandingResponse } from '@/lib/branding/runtime.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: { path: string[] } }) {
  return brandingResponse(request, context.params.path, 'dashboard')
}
