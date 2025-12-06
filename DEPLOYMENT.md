# FPS Game - Production Deployment Guide

## 🚀 Project Structure (Monorepo)

```
fps-game/
├── src/              # Client (Three.js + Vite)
├── server/           # WebSocket game server
├── onchain/          # Solana Anchor program
├── public/           # Static assets
└── shared/           # Shared types
```

## 📦 Dependencies Installation

```bash
# Install all dependencies (root + server workspace)
npm install
```

## 🛠️ Development

```bash
# Client only
npm run dev

# Server only
npm run dev:server

# Both together
npm run dev:all
```

## 🏗️ Production Build

```bash
# Build client
npm run build

# Build server
npm run build:server

# Build Solana program (if needed)
npm run build-onchain
```

## ☁️ Vercel Deployment

### Prerequisites
1. Push code to GitHub
2. Connect repository to Vercel

### Environment Variables (Set in Vercel Dashboard)
```
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_WS_SERVER_URL=wss://your-server-url.com
```

### Deploy Steps
1. Import project in Vercel
2. Select root directory
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables
6. Deploy!

### Server Deployment (Separate)
Deploy the `server/` directory to a Node.js hosting service:
- Railway
- Render
- Fly.io
- AWS/GCP/Azure

Server needs WebSocket support and should expose port 3001 (or custom).

## 🔐 Security Checklist

Before pushing to GitHub:

```bash
# Verify no secrets are tracked
git ls-files | grep -E '(keypair|id\.json|\.env$|test-ledger)'

# Should return nothing. If it does, remove:
git rm --cached <file>
```

### Critical Files (Already in .gitignore)
- ✅ `*-keypair.json` (Solana keys)
- ✅ `id.json` (Wallet keys)
- ✅ `.env` files
- ✅ `test-ledger/` (Validator data)
- ✅ `node_modules/`
- ✅ Build outputs

## 🌐 Solana Program Deployment

### Devnet
```bash
cd onchain
solana config set --url devnet
anchor build
anchor deploy
```

### Mainnet (Use with caution)
```bash
solana config set --url mainnet-beta
# Ensure you have sufficient SOL for deployment
anchor deploy
```

Update program ID in:
- `onchain/programs/fps_game/src/lib.rs` (declare_id!)
- `src/onchain/anchorClient.ts` (PROGRAM_ID)

## 📋 Pre-Push Checklist

- [ ] All TypeScript errors fixed ✅
- [ ] Production build succeeds ✅
- [ ] `.gitignore` covers all sensitive files ✅
- [ ] No keypairs committed
- [ ] Environment variables documented
- [ ] Server deployed separately
- [ ] RPC URLs configured for production
- [ ] Program deployed to devnet/mainnet
- [ ] IDL copied to public after build

## 🎮 Architecture Notes

### Client (Vercel)
- Static site with Vite
- Three.js for rendering
- WebSocket client for multiplayer
- Phantom wallet integration
- Calls Solana RPC directly

### Server (Separate hosting)
- Node.js WebSocket server
- RAPIER physics (server-authoritative)
- Matchmaking (2-player rooms)
- Hit detection & scoring

### On-chain (Solana)
- Match state storage
- Kill/win recording
- Player scores

## 🐛 Troubleshooting

### Build fails with module errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Vercel deployment fails
- Check build logs for missing env vars
- Ensure `dist/` is output directory
- Verify build command is `npm run build`

### WebSocket connection fails
- Update `VITE_WS_SERVER_URL` to deployed server URL
- Ensure server supports WSS (not WS) for HTTPS sites
- Check CORS settings on server

## 📝 Post-Deployment

1. Test wallet connection on production
2. Verify WebSocket connects to server
3. Test full gameplay loop
4. Monitor Solana transactions on explorer
5. Check browser console for errors

## 🚢 Ready to Push!

```bash
git add .
git commit -m "chore: production-ready build with monorepo structure"
git push origin main
```

Your code is now production-ready! 🎉
