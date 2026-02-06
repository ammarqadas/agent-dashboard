import { NextRequest, NextResponse } from 'next/server'

const DADIH_API_URL = process.env.DADIH_API_URL || 'http://localhost:3000/api'

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin')
  // If this is a browser CORS request, echo back the Origin and allow credentials.
  // If no Origin header exists (same-origin/server-to-server), allow '*'.
  const allowOrigin = origin || '*'
  const allowCredentials = origin ? 'true' : 'false'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    // Only valid when Allow-Origin is not '*'
    ...(origin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    // Ensure caches don't mix origins
    ...(origin ? { Vary: 'Origin' } : {}),
  } as Record<string, string>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params.path, 'POST')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params.path, 'PATCH')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params.path, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, params.path, 'DELETE')
}

async function handleProxy(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/')
    const url = new URL(request.url)
    const queryString = url.search
    
    // url.search already includes the leading '?'
    const targetUrl = `${DADIH_API_URL}/${path}${queryString || ''}`
    
    // Forward auth + cookies
    const authHeader = request.headers.get('authorization')
    const cookie = request.headers.get('cookie')

    const headers = new Headers()
    if (authHeader) headers.set('Authorization', authHeader)
    if (cookie) headers.set('Cookie', cookie)

    const contentType = request.headers.get('content-type') || ''

    let body: BodyInit | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      if (contentType.includes('multipart/form-data')) {
        // Recreate form-data (NextRequest does not expose the raw boundary safely)
        const fd = await request.formData()
        body = fd
        // DO NOT set Content-Type; fetch will set boundary automatically
      } else if (contentType.includes('application/json')) {
        body = await request.text()
        headers.set('Content-Type', 'application/json')
      } else if (contentType) {
        // Forward other payload types
        const buf = await request.arrayBuffer()
        body = buf as any
        headers.set('Content-Type', contentType)
      }
    }
    
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    })
    
    const data = await response.json()

    // Return response with valid CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: corsHeaders(request),
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Proxy request failed' 
      },
      { 
        status: 500,
        headers: corsHeaders(request),
      }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      'Access-Control-Max-Age': '86400',
    },
  })
}

