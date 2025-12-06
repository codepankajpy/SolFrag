# FPS Game On-chain (Solana Anchor)

## Structure
- `programs/fps_game`: Anchor program implementing matches with create/join/record_kill/finish.
- `Anchor.toml`: Provider configuration for localnet.
- `Cargo.toml`: Workspace pointing to the program.

## Prerequisites
- Solana CLI installed (`solana --version`)
- Anchor CLI installed (`anchor --version`)
- Local validator running (`solana-test-validator`)
- A dev wallet at `~/.config/solana/id.json`

## Build & Deploy (Localnet)
```bash
# In one terminal, start local validator
solana-test-validator --reset

# In another terminal, navigate to onchain workspace
cd onchain

# Build program
anchor build

# Deploy to localnet
anchor deploy

# Program ID will be printed; ensure it matches Anchor.toml
```

## Quick Client Calls (Typescript via Anchor)
Install deps in your web client:
```bash
npm i @coral-xyz/anchor @solana/web3.js
```
Example snippet:
```ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const provider = anchor.AnchorProvider.local();
anchor.setProvider(provider);
const idl = await anchor.Program.fetchIdl("Fgme111111111111111111111111111111111111111", provider);
const program = new anchor.Program(idl!, new PublicKey("Fgme111111111111111111111111111111111111111"), provider);

// Create match PDA (derive client-side or let program init seed)
const winPoints = 3;
await program.methods.createMatch(winPoints).accounts({
  owner: provider.wallet.publicKey,
}).rpc();

// Join match, record kills, finish similarly by passing match_account PDA
```

## Notes
- For hackathon speed, we used a fixed program ID in `declare_id!` and `Anchor.toml`.
- Consider re-running `anchor keys list` and updating IDs for production.
