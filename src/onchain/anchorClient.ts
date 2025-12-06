import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

// Program constants
export const PROGRAM_ID = new PublicKey("HTewvNaFXBYjBnEixXXGUAHwjU2yAJbAAdDfouzm3a51");
export const DEFAULT_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export interface MatchIds {
  matchId: number; // u64 in program, we pass as number and convert to le bytes in Anchor
  winPoints: number; // e.g., 3
}

export async function loadIdl(): Promise<Idl> {
  const res = await fetch("/idl/fps_game.json");
  if (!res.ok) throw new Error(`IDL fetch failed: ${res.status}`);
  return (await res.json()) as Idl;
}

export function getProvider(connection: Connection, wallet: any): AnchorProvider {
  // wallet expected to provide: publicKey, signTransaction, signAllTransactions
  return new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
}

export async function getProgram(provider: AnchorProvider): Promise<Program> {
  const idl = await loadIdl();
  return new Program(idl, PROGRAM_ID, provider);
}

// Helpers to interact with the program
export async function createMatch(provider: AnchorProvider, args: MatchIds) {
  const program = await getProgram(provider);
  const owner = provider.wallet.publicKey;
  const [matchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("match"), owner.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(args.matchId)]).buffer))],
    PROGRAM_ID
  );

  return program.methods
    .createMatch(new anchor.BN(args.matchId), args.winPoints)
    .accounts({ owner, match: matchPda })
    .rpc();
}

export async function joinMatch(provider: AnchorProvider, args: { matchId: number; owner: PublicKey }) {
  const program = await getProgram(provider);
  const player = provider.wallet.publicKey;
  const [matchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("match"), args.owner.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(args.matchId)]).buffer))],
    PROGRAM_ID
  );
  return program.methods.joinMatch().accounts({ player, match: matchPda }).rpc();
}

export async function recordKill(provider: AnchorProvider, args: { matchId: number; owner: PublicKey; shooter: PublicKey; victim: PublicKey }) {
  const program = await getProgram(provider);
  const [matchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("match"), args.owner.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(args.matchId)]).buffer))],
    PROGRAM_ID
  );
  return program.methods
    .recordKill(args.victim)
    .accounts({ match: matchPda, shooter: args.shooter })
    .rpc();
}

/**
 * Prepare and sign a recordKill transaction (to be sent to server)
 */
export async function prepareRecordKillTransaction(
  provider: AnchorProvider,
  args: { matchPda: string; victim: PublicKey }
): Promise<string> {
  const program = await getProgram(provider);
  const shooter = provider.wallet.publicKey;
  const matchPda = new PublicKey(args.matchPda);
  
  // Build transaction
  const tx = await program.methods
    .recordKill(args.victim)
    .accounts({ match: matchPda, shooter })
    .transaction();
  
  // Get recent blockhash
  const { blockhash } = await provider.connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = shooter;
  
  // Sign transaction with wallet
  const signedTx = await provider.wallet.signTransaction(tx);
  
  // Serialize to base64
  return signedTx.serialize().toString('base64');
}

export async function finishMatch(provider: AnchorProvider, args: { matchId: number; owner: PublicKey }) {
  const program = await getProgram(provider);
  const [matchPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("match"), args.owner.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(args.matchId)]).buffer))],
    PROGRAM_ID
  );
  return program.methods.finishMatch().accounts({ match: matchPda }).rpc();
}
