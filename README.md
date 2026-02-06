# Agent Dashboard - Shadcn UI

A comprehensive agent dashboard application built with Next.js and shadcn/ui components, integrated with dadih-server API for wallet management, transactions, and cashout code operations.

## Features

- 🎨 Beautiful UI built with shadcn/ui components
- 🔐 Agent login with email and password authentication
- 🔍 Search wallets by mobile number
- 👤 View wallet details (name, identity, status)
- ✅ Activate/Deactivate wallets
- 💰 Deposit funds to customer wallets
- 💳 Cashout code management (create, search, pay)
- 📊 Transaction history and filtering
- 👨‍💼 Agent account information and balances
- 🎯 Protected routes with authentication check
- 📱 Responsive design
- 🌙 Dark mode support (via CSS variables)
- 🔌 Full integration with dadih-server API

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure API URL:
   - Create a `.env.local` file in the root directory
   - Add the following:
     ```
     # URL of your dadih-server API
     DADIH_API_URL=http://localhost:3000/api
     
     # Public API URL (uses Next.js proxy to avoid CORS)
     NEXT_PUBLIC_API_URL=/api/proxy
     ```
   - Update `DADIH_API_URL` to match your dadih-server instance

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

5. Login with your agent credentials (from dadih-server)

## Project Structure

```
shadcn-dashboard/
├── app/
│   ├── dashboard/
│   │   ├── account/          # Agent account page
│   │   ├── cashout-codes/    # Cashout codes management
│   │   ├── deposit/          # Deposit to wallet
│   │   ├── transactions/     # Transaction history
│   │   ├── wallet-search/    # Search wallets
│   │   ├── wallet/[id]/      # Wallet details page
│   │   ├── layout.tsx        # Dashboard layout with navigation
│   │   └── page.tsx          # Dashboard main page
│   ├── globals.css           # Global styles and CSS variables
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Login page
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   └── select.tsx
│   ├── login-form.tsx        # Login form component
│   ├── wallet-search.tsx     # Wallet search component
│   ├── wallet-view.tsx       # Wallet details view
│   ├── wallet-deposit.tsx    # Deposit component
│   ├── cashout-codes.tsx     # Cashout codes management
│   ├── transactions-list.tsx # Transactions list
│   └── agent-account.tsx     # Agent account view
└── lib/
    ├── utils.ts              # Utility functions
    └── api.ts                # API client for dadih-server
```

## Dashboard Features

### Wallet Management
- **Search Wallet**: Search for customer wallets by mobile number
- **View Wallet**: Display wallet details including name, mobile, code, balances, and status
- **Activate/Deactivate**: Toggle wallet active status
- **Deposit**: Add funds to customer wallets

### Cashout Codes
- **Create**: Generate cashout codes for customers
- **Search**: Find cashout codes by code
- **Pay**: Process cashout code payments
- **List**: View all cashout codes with filtering by status

### Transactions
- **View History**: Browse transaction history
- **Filter**: Filter transactions by wallet ID
- **Details**: View transaction details including amounts, currencies, and accounts

### Agent Account
- **Account Info**: View agent information
- **Balances**: Display account balances for different currencies

## CORS Configuration

The dashboard uses a Next.js API proxy route (`/app/api/proxy/[...path]/route.ts`) to avoid CORS issues when communicating with the dadih-server API. This proxy:

- Forwards all API requests from the frontend to the dadih-server
- Adds proper CORS headers to responses
- Handles authentication tokens securely
- Eliminates the need to configure CORS on the dadih-server

All API requests go through `/api/proxy/*` which then forwards them to the dadih-server API configured in `DADIH_API_URL`.

## API Integration

The dashboard integrates with the dadih-server API. The API client (`lib/api.ts`) handles:
- Agent authentication
- Wallet operations (search, view, update, deposit)
- Cashout code management
- Transaction queries
- Account information

### API Endpoints Used

- `POST /api/users/login` - Agent login
- `GET /api/wallets/search?mobile=...` - Search wallet by mobile
- `GET /api/wallets/:id` - Get wallet details
- `PATCH /api/wallets/:id` - Update wallet (activate/deactivate)
- `POST /api/wallets/transaction` - Deposit to wallet
- `GET /api/cashout-codes/search?code=...` - Search cashout code
- `POST /api/cashout-codes/pay` - Pay cashout code
- `POST /api/cashout-codes/agent-create` - Create cashout code
- `GET /api/cashout-codes` - List cashout codes
- `GET /api/transactions` - Get transactions
- `GET /api/accounts` - Get agent accounts
- `GET /api/currencies` - Get available currencies

## Authentication

The current implementation uses localStorage for authentication state and token management. In production, you should:
- Use a proper authentication solution (NextAuth.js, Clerk, etc.)
- Implement server-side authentication checks
- Use secure HTTP-only cookies for tokens
- Add proper password hashing and validation
- Implement token refresh mechanism

## Components

All shadcn/ui components are located in `components/ui/` and can be customized via Tailwind CSS classes and CSS variables defined in `app/globals.css`.

## License

MIT

