# HD Wallet API

A production-grade REST API for generating and managing hierarchical deterministic (HD) wallets for Ethereum and Bitcoin, built with Node.js and TypeScript.

Live testnet transaction: [`0x502f9f7e61d0600e6ae70dbc9899df91358be9b589485a2cb2daa9c3c32b2ec7`](https://sepolia.etherscan.io/tx/0x502f9f7e61d0600e6ae70dbc9899df91358be9b589485a2cb2daa9c3c32b2ec7)

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + TypeScript | Type safety across the entire codebase |
| Framework | Fastify | Schema-first, faster than Express, built-in logging |
| Wallet crypto | `ethers.js`, `bitcoinjs-lib`, `bip32`, `bip39` | Industry standard libraries |
| Database | PostgreSQL + Prisma | Relational integrity for wallet/address relationships |
| Validation | Zod | Runtime validation with inferred TypeScript types |
| ETH RPC | Alchemy | Reliable Ethereum node provider with asset transfer APIs |
| BTC API | Blockstream | Free public Bitcoin testnet API |
| Encryption | AES-256-GCM | Authenticated encryption for mnemonic storage |

---

## Architecture
```
Request → Fastify Route → Zod Validation → Service Layer → Crypto Layer
                                                ↓
                                          PostgreSQL (encrypted mnemonics)
                                                ↓
                                     Alchemy RPC / Blockstream API
```

### Project Structure
```
src/
├── crypto/
│   ├── hd.ts          # BIP-32/39/44 key derivation
│   ├── btc.ts         # Bitcoin transaction builder (PSBT)
│   └── encryption.ts  # AES-256-GCM mnemonic encryption
├── services/
│   ├── wallet.service.ts  # Wallet CRUD, address derivation
│   ├── eth.service.ts     # Ethereum balance, history, broadcast
│   └── btc.service.ts     # Bitcoin UTXOs, fees, broadcast
├── routes/
│   ├── wallet.routes.ts   # Wallet management endpoints
│   └── tx.routes.ts       # Transaction endpoints
├── plugins/
│   └── prisma.ts      # Fastify Prisma plugin
└── schemas/
    └── wallet.schema.ts   # Zod request schemas
```

---

## Security Model

**Private keys never touch the database.** The only sensitive value persisted is the encrypted mnemonic. The security flow is:

1. Mnemonic generated with 256 bits of entropy (24 words)
2. Encrypted with AES-256-GCM before database write
   - Fresh 12-byte IV per encryption — same mnemonic never produces the same ciphertext
   - GCM auth tag detects any tampering on decrypt
3. Decrypted in memory only at transaction signing time
4. Private key derived in memory, used to sign, then garbage collected
5. Private keys and mnemonics are never logged or returned in API responses

**Production hardening (not implemented, known tradeoffs):**
- `ENCRYPTION_KEY` should come from AWS KMS or HashiCorp Vault, not an env variable
- Private key operations should run in an HSM or TEE
- API should require authentication (JWT or API key middleware)
- Rate limiting on transaction endpoints to prevent abuse

---

## Standards Implemented

- **BIP-39** — Mnemonic generation and seed derivation
- **BIP-32** — Hierarchical deterministic wallet tree
- **BIP-44** — Multi-coin derivation paths (`m/44'/coin'/0'/0/index`)
- **EIP-1559** — Modern Ethereum transaction format with dynamic fees
- **P2WPKH** — Native SegWit Bitcoin address format (`bc1...`)
- **PSBT** — Partially Signed Bitcoin Transaction standard

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/hd-wallet-api
cd hd-wallet-api
npm install

cp .env.example .env
# Fill in ALCHEMY_API_KEY and ENCRYPTION_KEY (must be 32 chars)

docker compose up -d
npx prisma migrate dev
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ALCHEMY_API_KEY` | Alchemy API key (Sepolia network) |
| `ENCRYPTION_KEY` | 32-character AES-256 encryption key |
| `PORT` | Server port (default: 3000) |

---

## API Reference

### Wallets

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/wallets` | Create a new HD wallet |
| `GET` | `/wallets` | List all wallets |
| `GET` | `/wallets/:id` | Get wallet with addresses |
| `GET` | `/wallets/:id/balance` | Get live balance for all addresses |
| `POST` | `/wallets/:id/derive` | Derive the next address |
| `DELETE` | `/wallets/:id` | Delete a wallet |

**Create wallet:**
```bash
curl -X POST http://localhost:3000/wallets \
  -H "Content-Type: application/json" \
  -d '{"name": "My ETH Wallet", "chain": "ETHEREUM"}'
```

**Get balance:**
```bash
curl http://localhost:3000/wallets/:id/balance
```

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/tx/eth/send` | Sign and broadcast an ETH transaction |
| `POST` | `/tx/btc/send` | Sign and broadcast a BTC transaction |
| `GET` | `/tx/eth/history/:walletId` | ETH transaction history |
| `GET` | `/tx/btc/history/:walletId` | BTC transaction history |
| `GET` | `/tx/btc/fees` | Current Bitcoin fee estimates |

**Send ETH:**
```bash
curl -X POST http://localhost:3000/tx/eth/send \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "uuid",
    "fromIndex": 0,
    "toAddress": "0x...",
    "amountEth": "0.001"
  }'
```

**Send BTC:**
```bash
curl -X POST http://localhost:3000/tx/btc/send \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "uuid",
    "fromIndex": 0,
    "toAddress": "tb1q...",
    "amountSats": 10000,
    "feeRate": "standard"
  }'
```

---

## Networks

This API runs against testnets. No real funds are used.

| Chain | Network | Explorer |
|---|---|---|
| Ethereum | Sepolia | [sepolia.etherscan.io](https://sepolia.etherscan.io) |
| Bitcoin | Testnet | [blockstream.info/testnet](https://blockstream.info/testnet) |