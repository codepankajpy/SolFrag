# FPS Game — Solana Localnet Integration

This project is a browser FPS with a Node server and basic Solana Anchor program for recording matches, kills, and winners on localnet.

## Prerequisites
- Solana CLI (`solana --version`) and local validator (`solana-test-validator`)
- Anchor CLI (`anchor --version`) matching `anchor-lang` (0.29.x)
- Phantom wallet installed in the browser

## Quick Start

### 1) Run localnet
```zsh
solana-test-validator --reset
```
Keep it running.

### 2) Build & deploy program
```zsh
cd onchain
anchor build
anchor deploy
cd -
```

### 3) Copy IDL for the web client
```zsh
npm run copy-idl
```
This places `fps_game.json` in `public/idl/`.

### 4) Install deps and start web
```zsh
npm install
npm run dev
```
Open the app in the browser. Connect Phantom on the Home screen. Play.

## On-chain Flow (Client)
- On connect: creates a match (`create_match`) if not already created (heuristic owner).
- On second player join: `join_match`.
- On kill: `record_kill`.
- On match win: `finish_match`.

All calls require Phantom to be connected and use the deployed Program ID baked into `src/onchain/anchorClient.ts`.

## Notes
- If you change the on-chain program, re-run:
```zsh
npm run build-onchain
```
- The app tries to convert usernames to `PublicKey` for `record_kill`. Ensure usernames are wallet addresses (base58) to reflect identities correctly.
