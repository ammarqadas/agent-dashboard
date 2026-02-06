import { NextRequest, NextResponse } from 'next/server'

// Get the API URL from environment variable
const DADIH_API_URL = process.env.DADIH_API_URL

// Validate that DADIH_API_URL is set (required in production)
if (!DADIH_API_URL) {
  console.error('ERROR: DADIH_API_URL environment variable is not set!')
  console.error('Please set DADIH_API_URL in your Vercel project settings.')
  console.error('For local development, create .env.local with: DADIH_API_URL=http://localhost:3000/api')
}

// Warn if using localhost in production (won't work in serverless)
if (DADIH_API_URL && (DADIH_API_URL.includes('localhost') || DADIH_API_URL.includes('127.0.0.1'))) {
  if (process.env.VERCEL) {
    console.error('ERROR: DADIH_API_URL points to localhost, which will not work in Vercel serverless functions!')
    console.error('Please set DADIH_API_URL to your actual backend API URL in Vercel project settings.')
  }
}

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
  // #region agent log
  const hasApiUrl = !!DADIH_API_URL
  const apiUrlValue = DADIH_API_URL ? (DADIH_API_URL.includes('localhost') || DADIH_API_URL.includes('127.0.0.1') ? 'localhost' : 'external') : 'missing'
  fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:handleProxy',message:'Proxy request started',data:{hasApiUrl,apiUrlType:apiUrlValue,isVercel:!!process.env.VERCEL,path:pathSegments.join('/'),method},timestamp:Date.now(),sessionId:'debug-session',runId:'proxy-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Check if DADIH_API_URL is configured
  if (!DADIH_API_URL) {
    console.error('DADIH_API_URL is not set')
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server configuration error: DADIH_API_URL environment variable is not set. Please configure it in Vercel project settings.' 
      },
      { 
        status: 500,
        headers: corsHeaders(request),
      }
    )
  }

  try {
    const path = pathSegments.join('/')
    const url = new URL(request.url)
    const queryString = url.search
    
    // url.search already includes the leading '?'
    const targetUrl = `${DADIH_API_URL}/${path}${queryString || ''}`
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:handleProxy',message:'About to fetch target URL',data:{targetUrl,method},timestamp:Date.now(),sessionId:'debug-session',runId:'proxy-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
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
    // #region agent log
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : null
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : null
    fetch('http://127.0.0.1:7242/ingest/8d3c5a92-a0d4-40b2-9563-508743174ab0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:handleProxy',message:'Proxy error caught',data:{errorMessage,errorCode,errorCause,targetUrl:DADIH_API_URL,method},timestamp:Date.now(),sessionId:'debug-session',runId:'proxy-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    console.error('Proxy error:', error)
    console.error('Target URL was:', DADIH_API_URL)
    
    // Provide more helpful error messages
    let userMessage = 'Proxy request failed'
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        if (DADIH_API_URL?.includes('localhost') || DADIH_API_URL?.includes('127.0.0.1')) {
          userMessage = 'Cannot connect to localhost from serverless function. Please set DADIH_API_URL to your actual backend API URL in Vercel project settings.'
        } else {
          userMessage = `Cannot connect to backend API at ${DADIH_API_URL}. Please verify the URL is correct and the server is accessible.`
        }
      } else {
        userMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: userMessage 
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

