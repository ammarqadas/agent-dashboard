# Agent API — Developer Reference

Technical reference for the Shumul Cash Agent Dashboard backend API.

All client requests are routed through a Next.js proxy (`/api/proxy/*`) to the
dadih-server backend. The proxy handles CORS, forwards auth headers, and passes
through request bodies unchanged.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [Wallets](#wallets)
   - [Deposits](#deposits)
   - [Cashout Codes](#cashout-codes)
   - [Remittances](#remittances)
   - [Transactions](#transactions)
   - [Accounts & Reference Data](#accounts--reference-data)
6. [Data Models](#data-models)
7. [Environment Variables](#environment-variables)

---

## Architecture

```
Browser                          Next.js Proxy                 dadih-server
──────                          ──────────────                 ────────────
POST /api/proxy/agents/login  →  /api/proxy/[...path]  →  ${DADIH_API_URL}/agents/login
Authorization: Bearer <jwt>      forwards headers              processes request
                                 returns JSON + CORS headers
```

- **Client-side base URL:** Always `/api/proxy` (same-origin, no CORS).
- **Server-side target:** `DADIH_API_URL` environment variable (e.g. `http://localhost:3000/api`).
- The proxy supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
- `multipart/form-data` bodies are forwarded correctly (browser sets the boundary).

---

## Authentication

### Login

```http
POST /api/proxy/agents/login
Content-Type: application/json
```

**Request body:**

```json
{
  "email": "agent@example.com",
  "password": "secret"
}
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "token": "<jwt>",
  "exp": 1784743948,
  "user": {
    "id": 7,
    "name": "Agent Name",
    "email": "agent@example.com",
    "mobile": null,
    "type": "agent",
    "agentWallet": 23,
    "active": true,
    "allowedNetworks": [
      { "id": 3, "key": "shumulCash", "label": "شمول كاش" },
      { "id": 2, "key": "shumulPay", "label": "شمول باي" }
    ],
    "activateCustomerWallet": true,
    "allowCashoutCode": true,
    "allowSendRemittance": true,
    "allowWalletDeposit": true
  }
}
```

On success the token is stored in `localStorage` under key `agentToken` and sent
as `Authorization: Bearer <token>` on every subsequent request.

### Token lifecycle

| Event | Behavior |
|-------|----------|
| Successful login | Token stored in `localStorage.agentToken` |
| Every request | Token reloaded from `localStorage` and sent as `Authorization: Bearer <token>` |
| `401` or `403` response | Token + `isAuthenticated` + `agentUser` cleared from `localStorage`; browser redirected to `/` (login page) |

### Logout

Clear `localStorage` keys `agentToken`, `isAuthenticated`, and `agentUser`, then
call `apiClient.clearToken()`.

---

## Response Format

All endpoints return JSON with a standard envelope:

```typescript
interface ApiResponse<T = any> {
  success: boolean
  message?: string      // human-readable error/success message
  data?: T              // primary payload (shape varies per endpoint)
  [key: string]: any    // additional fields (docs, token, pagination, etc.)
}
```

Pagination responses include:

```json
{
  "success": true,
  "docs": [...],
  "total": 120,
  "page": 1,
  "limit": 50,
  "pages": 3
}
```

---

## Error Handling

| HTTP Status | Meaning | Client Behavior |
|-------------|---------|-----------------|
| `200` | Success | Process response data |
| `400` | Bad request / validation error | Display `message` to user |
| `401` | Unauthorized (missing/invalid token) | Clear auth, redirect to login |
| `403` | Forbidden (insufficient permissions) | Clear auth, redirect to login |
| `404` | Resource not found | Display error message |
| `500` | Server/proxy error | Display `message` (often proxy misconfiguration) |

---

## Endpoints

### Auth

#### `POST /api/proxy/agents/login`

Authenticate an agent and receive a JWT token.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | yes | Agent email address |
| `password` | `string` | yes | Agent password |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Login status |
| `token` | `string` | JWT token for subsequent requests |
| `exp` | `number` | Token expiry timestamp |
| `user` | `object` | Agent profile with permissions |

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agents/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","password":"secret"}'
```

---

### Wallets

#### `POST /api/proxy/agent/create-wallet`

Create a new customer wallet.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | yes | Customer full name |
| `mobile` | `string` | yes | Customer mobile number (E.164 format recommended) |
| `password` | `string` | no | Wallet password |
| `address` | `string` | no | Customer address |

**Response (`200 OK`):**

```json
{
  "success": true,
  "wallet": {
    "id": "64b...",
    "name": "Ahmed Ali",
    "mobile": "+967712345678"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agent/create-wallet \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahmed Ali","mobile":"+967712345678"}'
```

---

#### `GET /api/proxy/agent/wallet-search?mobile={mobile}`

Search for a wallet by mobile number.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `mobile` | `string` | yes | Mobile number to search |

**Response (`200 OK`):**

```json
{
  "success": true,
  "wallet": {
    "id": "64b...",
    "name": "Ahmed Ali",
    "mobile": "+967712345678"
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/agent/wallet-search?mobile=%2B967712345678" \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/wallets/{id}?depth={depth}`

Get full wallet details including accounts and identity card.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` | Wallet ID |

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `depth` | `number` | `2` | Populated relation depth |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "id": "64b...",
    "name": "Ahmed Ali",
    "mobile": "+967712345678",
    "active": true,
    "card": {
      "fullName": "Ahmed Ali",
      "idNumber": "012345678",
      "type": "national",
      "expdate": "2028-01-01",
      "idImageFront": "https://...",
      "idImageBack": "https://...",
      "idImageSelfi": "https://..."
    },
    "accounts": [
      {
        "id": "64c...",
        "name": "YER Wallet",
        "balance": 15000,
        "currency": { "id": "1", "code": "YER", "name": "Yemeni Rial", "symbol": "﷼" },
        "active": true
      }
    ]
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/wallets/64b...?depth=2" \
  -H "Authorization: Bearer <token>"
```

---

#### `PATCH /api/proxy/wallets/{id}`

Update wallet properties (activate/deactivate).

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` | Wallet ID |

**Request body:**

| Field | Type | Description |
|-------|------|-------------|
| `active` | `boolean` | `true` to activate, `false` to deactivate |

**Response (`200 OK`):**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3000/api/proxy/wallets/64b... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

---

#### `POST /api/proxy/wallet-cards/with-upload`

Upsert wallet identity card with optional image uploads (multipart/form-data).

**Request body (`multipart/form-data`):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `walletId` | `string` | yes | Wallet ID |
| `fullName` | `string` | no | Full name on ID card |
| `idNumber` | `string` | no | National ID / passport number |
| `type` | `string` | no | `"national"` or `"passport"` |
| `expdate` | `string` | no | ID expiry date (ISO 8601) |
| `idImageFront` | `File` | no | Front image of ID |
| `idImageBack` | `File` | no | Back image of ID |
| `idImageSelfi` | `File` | no | Selfie with ID |

**Response (`200 OK`):**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/wallet-cards/with-upload \
  -H "Authorization: Bearer <token>" \
  -F "walletId=64b..." \
  -F "fullName=Ahmed Ali" \
  -F "idNumber=012345678" \
  -F "type=national" \
  -F "expdate=2028-01-01" \
  -F "idImageFront=@front.jpg" \
  -F "idImageBack=@back.jpg"
```

---

### Deposits

#### `POST /api/proxy/action/execute-generic`

Deposit funds to a single wallet.

**Request body:**

```json
{
  "actionKey": "agent_deposit",
  "payload": {
    "mobile": "+967712345678",
    "amount": 5000,
    "currency": "YER",
    "notes": "Cash deposit"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actionKey` | `string` | yes | Must be `"agent_deposit"` |
| `payload.mobile` | `string` | yes | Recipient wallet mobile number |
| `payload.amount` | `number` | yes | Deposit amount |
| `payload.currency` | `string\|number` | yes | Currency code or ID |
| `payload.notes` | `string` | no | Optional memo |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "results": [
      { "success": true, "message": "Deposit completed" }
    ]
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/action/execute-generic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "actionKey": "agent_deposit",
    "payload": {
      "mobile": "+967712345678",
      "amount": 5000,
      "currency": "YER"
    }
  }'
```

---

#### `POST /api/proxy/agent/deposit`

Bulk deposit to multiple wallets in a single request.

**Request body:**

```json
{
  "deposits": [
    { "mobile": "+967712345678", "amount": 5000, "currency": "YER", "notes": "Deposit 1" },
    { "mobile": "+967798765432", "amount": 10000, "currency": "YER" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deposits` | `array` | yes | Array of deposit objects |
| `deposits[].mobile` | `string` | yes | Recipient mobile number |
| `deposits[].amount` | `number` | yes | Deposit amount |
| `deposits[].currency` | `string\|number` | yes | Currency code or ID |
| `deposits[].notes` | `string` | no | Optional memo per deposit |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      { "success": true, "message": "Deposit completed" },
      { "success": true, "message": "Deposit completed" }
    ]
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agent/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deposits": [
      {"mobile":"+967712345678","amount":5000,"currency":"YER"},
      {"mobile":"+967798765432","amount":10000,"currency":"YER"}
    ]
  }'
```

---

### Cashout Codes

#### `GET /api/proxy/cashout-codes/search?code={code}`

Look up a cashout code by its code string.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | yes | Cashout code to search |

**Response (`200 OK`):**

```json
{
  "success": true,
  "cashoutCode": {
    "id": "64d...",
    "code": "CO-1234-ABCD",
    "amount": 10000,
    "currency": { "id": "1", "code": "YER", "name": "Yemeni Rial" },
    "status": "pending",
    "wallet": "64b...",
    "createdAt": "2026-07-20T12:00:00.000Z",
    "expiresAt": "2026-07-21T12:00:00.000Z"
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/cashout-codes/search?code=CO-1234-ABCD" \
  -H "Authorization: Bearer <token>"
```

---

#### `POST /api/proxy/action/execute-generic` (cashout code pay)

Pay/redemption a cashout code.

**Request body:**

```json
{
  "actionKey": "agent_cashout_code_pay",
  "code": "CO-1234-ABCD",
  "notes": "Paid to customer"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actionKey` | `string` | yes | Must be `"agent_cashout_code_pay"` |
| `code` | `string` | yes | Cashout code to pay |
| `notes` | `string` | no | Optional memo |

**Response (`200 OK`):**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/action/execute-generic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"actionKey":"agent_cashout_code_pay","code":"CO-1234-ABCD"}'
```

---

#### `POST /api/proxy/action/execute-generic` (cashout code create)

Create a new cashout code.

**Request body:**

```json
{
  "actionKey": "agent_cashout_code_create",
  "mobile": "+967712345678",
  "amount": 10000,
  "currency": "YER"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actionKey` | `string` | yes | Must be `"agent_cashout_code_create"` |
| `mobile` | `string` | yes | Customer mobile number |
| `amount` | `number` | yes | Code amount |
| `currency` | `string\|number` | yes | Currency code or ID |

**Response (`200 OK`):**

```json
{
  "success": true,
  "code": "CO-1234-ABCD",
  "result": { "..." : "..." }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/action/execute-generic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"actionKey":"agent_cashout_code_create","mobile":"+967712345678","amount":10000,"currency":"YER"}'
```

---

#### `GET /api/proxy/cashout-codes/agent-list`

List cashout codes with optional filtering and pagination.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `string` | — | Filter by `"pending"`, `"paid"`, or `"expired"` |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `50` | Items per page |

**Response (`200 OK`):**

```json
{
  "success": true,
  "cashoutCodes": [
    {
      "id": "64d...",
      "code": "CO-1234-ABCD",
      "amount": 10000,
      "currency": { "code": "YER" },
      "status": "pending",
      "wallet": "64b...",
      "createdAt": "2026-07-20T12:00:00.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 50,
  "pages": 3
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/cashout-codes/agent-list?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

### Remittances

#### `POST /api/proxy/presubmit/execute` (search)

Search for an incoming remittance by ID.

**Request body:**

```json
{
  "networkKey": "express",
  "configType": "search",
  "remittanceId": "EXP-12345"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `networkKey` | `string` | yes | Remittance network key (e.g. `"express"`) |
| `configType` | `string` | yes | Must be `"search"` |
| `remittanceId` | `string` | yes | Remittance tracking ID |

**Response (`200 OK`):**

```json
{
  "success": true,
  "searchToken": "abc...",
  "senderName": "Mohammed Saeed",
  "senderMobile": "+967711111111",
  "receiverName": "Ahmed Ali",
  "receiverMobile": "+967722222222",
  "amount": 50000,
  "currencyCode": "YER"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/presubmit/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"networkKey":"express","configType":"search","remittanceId":"EXP-12345"}'
```

---

#### `POST /api/proxy/presubmit/execute` (commission)

Calculate commission before sending a remittance.

**Request body:**

```json
{
  "configType": "preSubmit",
  "amount": 50000,
  "networkKey": "express",
  "currencyCode": "YER"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `configType` | `string` | yes | Must be `"preSubmit"` |
| `amount` | `number` | yes | Transfer amount |
| `networkKey` | `string` | yes | Remittance network key |
| `currencyCode` | `string` | yes | Currency code |

**Response (`200 OK`):**

```json
{
  "success": true,
  "totalCommission": 500,
  "totalAmount": 50500,
  "searchToken": "abc..."
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/presubmit/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"configType":"preSubmit","amount":50000,"networkKey":"express","currencyCode":"YER"}'
```

---

#### `POST /api/proxy/agent/action/execute-generic` (send)

Send a remittance.

**Request body:**

```json
{
  "networkKey": "express",
  "configType": "send",
  "senderName": "Mohammed Saeed",
  "senderMobile": "+967711111111",
  "receiverName": "Ahmed Ali",
  "receiverMobile": "+967722222222",
  "amount": 50000,
  "currency": "YER",
  "notes": "Family support",
  "commission": 500,
  "totalAmount": 50500,
  "searchToken": "abc..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `networkKey` | `string` | yes | Remittance network key |
| `configType` | `string` | yes | Must be `"send"` |
| `senderName` | `string` | yes | Sender full name |
| `senderMobile` | `string` | yes | Sender mobile |
| `receiverName` | `string` | yes | Receiver full name |
| `receiverMobile` | `string` | yes | Receiver mobile |
| `amount` | `number` | yes | Transfer amount |
| `currency` | `string\|number` | yes | Currency code or ID |
| `notes` | `string` | no | Optional memo |
| `commission` | `number` | no | Commission amount |
| `totalAmount` | `number` | no | Total debited amount |
| `searchToken` | `string` | no | Token from search/commission step |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "transactionId": "64e...",
    "expressid": "EXP-12345",
    "amount": 50000,
    "currency": "YER"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agent/action/execute-generic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "networkKey":"express",
    "configType":"send",
    "senderName":"Mohammed Saeed",
    "senderMobile":"+967711111111",
    "receiverName":"Ahmed Ali",
    "receiverMobile":"+967722222222",
    "amount":50000,
    "currency":"YER"
  }'
```

---

#### `POST /api/proxy/agent/action/execute-generic` (pay)

Pay/receive an incoming remittance.

**Request body:**

```json
{
  "networkKey": "express",
  "configType": "pay",
  "searchToken": "abc...",
  "amount": 50000,
  "currency": "YER",
  "senderName": "Mohammed Saeed",
  "senderMobile": "+967711111111",
  "receiverName": "Ahmed Ali",
  "receiverMobile": "+967722222222",
  "idNumber": "012345678",
  "type": "national",
  "expdate": "2028-01-01"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `networkKey` | `string` | yes | Remittance network key |
| `configType` | `string` | yes | Must be `"pay"` |
| `searchToken` | `string` | yes | Token from the search step |
| `amount` | `number` | yes | Amount to pay out |
| `currency` | `string\|number` | no | Currency code or ID |
| `senderName` | `string` | no | Sender name |
| `senderMobile` | `string` | no | Sender mobile |
| `receiverName` | `string` | no | Receiver name |
| `receiverMobile` | `string` | no | Receiver mobile |
| `idNumber` | `string` | no | Receiver ID number |
| `type` | `string` | no | ID type (`"national"` or `"passport"`) |
| `expdate` | `string` | no | ID expiry date |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "txId": "64f...",
    "expressid": "EXP-12345",
    "amount": 50000,
    "commission": 500,
    "totalAmount": 49500,
    "status": "completed"
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agent/action/execute-generic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "networkKey":"express",
    "configType":"pay",
    "searchToken":"abc...",
    "amount":50000,
    "currency":"YER"
  }'
```

---

#### `POST /api/proxy/agent/bulk-remittance`

Send multiple remittances in a single request.

**Request body:**

```json
{
  "payload": {
    "senderName": "Mohammed Saeed",
    "senderMobile": "+967711111111",
    "currency": "YER",
    "distWallet": "64g...",
    "remittances": [
      { "amount": 25000, "receiverName": "Ahmed Ali", "receiverMobile": "+967722222222" },
      { "amount": 25000, "receiverName": "Omar Saleh", "receiverMobile": "+967733333333" }
    ],
    "notes": "Monthly support",
    "commission": 1000
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payload.senderName` | `string` | yes | Sender full name |
| `payload.senderMobile` | `string` | yes | Sender mobile |
| `payload.currency` | `string\|number` | yes | Currency code or ID |
| `payload.distWallet` | `string\|number` | yes | Distribution wallet ID |
| `payload.remittances` | `array` | yes | Array of `{ amount, receiverName, receiverMobile }` |
| `payload.notes` | `string` | no | Optional memo |
| `payload.commission` | `number` | no | Total commission |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      { "success": true, "transactionId": "64e...", "expressid": "EXP-11111" },
      { "success": true, "transactionId": "64f...", "expressid": "EXP-22222" }
    ]
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/proxy/agent/bulk-remittance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "senderName":"Mohammed Saeed",
      "senderMobile":"+967711111111",
      "currency":"YER",
      "distWallet":"64g...",
      "remittances":[
        {"amount":25000,"receiverName":"Ahmed Ali","receiverMobile":"+967722222222"},
        {"amount":25000,"receiverName":"Omar Saleh","receiverMobile":"+967733333333"}
      ]
    }
  }'
```

---

### Transactions

#### `GET /api/proxy/agent/transactions`

List transactions for the authenticated agent.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `50` | Items per page |
| `sort` | `string` | — | Sort field (e.g. `"-createdAt"` for newest first) |

**Response (`200 OK`):**

```json
{
  "success": true,
  "transactions": [
    {
      "id": "64h...",
      "direction": "credit",
      "operationType": "deposit",
      "amount": 5000,
      "currency": { "code": "YER", "name": "Yemeni Rial" },
      "sourceAccount": "64c...",
      "destinationAccount": "64d...",
      "description": "Cash deposit",
      "createdAt": "2026-07-20T14:30:00.000Z"
    }
  ],
  "total": 85,
  "page": 1,
  "limit": 50
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/agent/transactions?page=1&limit=20&sort=-createdAt" \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/wallets/{walletId}/transactions`

List transactions for a specific wallet.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `walletId` | `string` | Wallet ID |

**Response (`200 OK`):**

```json
{
  "success": true,
  "transactions": [
    {
      "id": "64h...",
      "direction": "debit",
      "operationType": "cashout",
      "amount": 10000,
      "currency": { "code": "YER" },
      "createdAt": "2026-07-20T10:00:00.000Z"
    }
  ]
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/wallets/64b.../transactions" \
  -H "Authorization: Bearer <token>"
```

---

### Accounts & Reference Data

#### `GET /api/proxy/agents/me`

Get the authenticated agent's profile.

**Response (`200 OK`):**

```json
{
  "success": true,
  "user": {
    "id": 7,
    "name": "Agent Name",
    "email": "agent@example.com",
    "mobile": null,
    "type": "agent",
    "agentWallet": 23,
    "active": true,
    "allowedNetworks": [
      { "id": 3, "key": "shumulCash", "label": "شمول كاش" },
      { "id": 2, "key": "shumulPay", "label": "شمول باي" }
    ],
    "activateCustomerWallet": true,
    "allowCashoutCode": true,
    "allowSendRemittance": true,
    "allowWalletDeposit": true
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/proxy/agents/me \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/accounts?owner=agent`

Get the agent's account balances.

**Response (`200 OK`):**

```json
{
  "success": true,
  "docs": [
    {
      "id": "64c...",
      "name": "YER Operations",
      "balance": 500000,
      "currency": { "id": "1", "code": "YER", "name": "Yemeni Rial", "symbol": "﷼" },
      "active": true,
      "code": "OP-YER"
    },
    {
      "id": "64d...",
      "name": "USD Operations",
      "balance": 1200.50,
      "currency": { "id": "2", "code": "USD", "name": "US Dollar", "symbol": "$" },
      "active": true,
      "code": "OP-USD"
    }
  ]
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/accounts?owner=agent" \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/accounts/{accountId}`

Get a single account by ID.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `accountId` | `string` | Account ID |

**Response (`200 OK`):**

```json
{
  "success": true,
  "data": {
    "id": "64c...",
    "name": "YER Operations",
    "balance": 500000,
    "currency": { "id": "1", "code": "YER", "name": "Yemeni Rial" },
    "active": true
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/proxy/accounts/64c..." \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/currencies`

List all supported currencies.

**Response (`200 OK`):**

```json
{
  "success": true,
  "docs": [
    { "id": "1", "code": "YER", "name": "Yemeni Rial", "symbol": "﷼" },
    { "id": "2", "code": "USD", "name": "US Dollar", "symbol": "$" }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/proxy/currencies \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /api/proxy/agent/dist-wallets`

List distribution wallets (system wallets used as remittance network endpoints).

**Response (`200 OK`):**

```json
{
  "success": true,
  "networks": [
    { "key": "express", "name": "Express Remittance" },
    { "key": "tiara", "name": "Tiara Transfer" }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/proxy/agent/dist-wallets \
  -H "Authorization: Bearer <token>"
```

---

## Data Models

```typescript
interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  [key: string]: any
}

interface CashoutCode {
  id: string | number
  code: string
  amount: number
  currency: Currency | string
  status: "pending" | "paid" | "expired"
  wallet: Wallet | string
  createdAt: string
  expiresAt?: string
}

interface Currency {
  id: string | number
  code: string       // e.g. "YER", "USD"
  name: string       // e.g. "Yemeni Rial"
  symbol?: string    // e.g. "﷼", "$"
}

interface Wallet {
  id: string | number
  name?: string
  mobile?: string
}

interface WalletFull {
  id: string | number
  name: string
  mobile: string
  active: boolean
  card?: {
    fullName: string
    idNumber: string
    type: "national" | "passport"
    expdate: string
    idImageFront?: string
    idImageBack?: string
    idImageSelfi?: string
  }
  accounts: Account[]
}

interface Account {
  id: string | number
  name: string
  balance: number
  currency: Currency | string
  active: boolean
  code?: string
}

interface Transaction {
  id: string | number
  direction: "credit" | "debit"
  operationType: string
  amount: number
  currency: Currency | string
  sourceAccount: string
  destinationAccount: string
  description?: string
  createdAt: string
}

interface AgentUser {
  id: number
  name: string
  email: string
  mobile?: string | null
  type: "agent"
  agentWallet: number
  active: boolean
  allowedNetworks: AllowedNetwork[]
  activateCustomerWallet: boolean
  allowCashoutCode: boolean
  allowSendRemittance: boolean
  allowWalletDeposit: boolean
}

interface AllowedNetwork {
  id: number
  key: string       // e.g. "shumulCash", "shumulPay"
  label: string     // e.g. "شمول كاش"
}
```

---

## Environment Variables

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `DADIH_API_URL` | Server-only | yes | Base URL of the dadih-server backend (e.g. `http://localhost:3000/api`) |
| `NEXT_PUBLIC_API_URL` | Client + Server | no | Client-side API base. Set to `/api/proxy` (default) to route through the Next.js proxy |

### Notes

- `DADIH_API_URL` **must** be set in production (Vercel, Docker, etc.). The proxy returns a `500` error if it is missing.
- In development, both variables can point to the same backend (`http://localhost:3000/api`), though the client will still use `/api/proxy`.
- The client automatically falls back to `/api/proxy` if `NEXT_PUBLIC_API_URL` points to a cross-origin URL, preventing browser CORS failures.

---

## CORS

The proxy route at `app/api/proxy/[...path]/route.ts` adds CORS headers to every response:

```
Access-Control-Allow-Origin: <request origin or *>
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true  (when Origin is present)
Access-Control-Max-Age: 86400           (preflight cache)
```

This eliminates the need to configure CORS on the dadih-server itself.
