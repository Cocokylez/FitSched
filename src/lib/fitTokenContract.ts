/**
 * fitTokenContract.ts
 *
 * Thin viem wrapper around the on-chain FitToken (FIT) contract on Base.
 * Used exclusively by server-side code (API routes / server actions).
 * Never imported on the client — it references private env vars.
 *
 * Feature flag: if FIT_TOKEN_ADDRESS is not set, `isTokenDeployed()` returns
 * false and `mintFitTokensOnChain()` throws — callers should guard with the
 * flag before reaching the mint call.
 */

// Prevents this file from being imported in client components.
// Next.js will throw a build error if it is — protecting DISTRIBUTOR_PRIVATE_KEY.
import "server-only"

import { createWalletClient, createPublicClient, http, parseUnits, isAddress, getAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { base, baseSepolia } from "viem/chains"

// ── ABI (only the subset we need) ─────────────────────────────────────────────
export const FIT_TOKEN_ABI = [
  {
    name: "mintReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "account", type: "address" }],
    outputs: [{ name: "",        type: "uint256" }],
  },
  {
    name: "rewardsRemaining",
    type: "function",
    stateMutability: "view",
    inputs:  [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the contract address env var is set — used as a feature flag. */
export function isTokenDeployed(): boolean {
  return Boolean(process.env.FIT_TOKEN_ADDRESS)
}

/** Returns true for any valid checksummed or lowercase EVM address. */
export function isValidEvmAddress(address: string): boolean {
  return isAddress(address)
}

/** Normalise to checksummed EVM address, or return null if invalid. */
export function toChecksumAddress(address: string): `0x${string}` | null {
  if (!isAddress(address)) return null
  return getAddress(address)
}

// ── Chain + client factory ────────────────────────────────────────────────────

function getChain() {
  return process.env.NODE_ENV === "production" ? base : baseSepolia
}

function getRpcUrl(): string {
  return process.env.BASE_RPC_URL ?? (
    process.env.NODE_ENV === "production"
      ? "https://mainnet.base.org"
      : "https://sepolia.base.org"
  )
}

function getContractAddress(): `0x${string}` {
  const addr = process.env.FIT_TOKEN_ADDRESS
  if (!addr) throw new Error("FIT_TOKEN_ADDRESS is not set — token not yet deployed")
  if (!isAddress(addr)) throw new Error("FIT_TOKEN_ADDRESS is not a valid EVM address")
  return getAddress(addr) as `0x${string}`
}

function getDistributorAccount() {
  const key = process.env.DISTRIBUTOR_PRIVATE_KEY
  if (!key) throw new Error("DISTRIBUTOR_PRIVATE_KEY is not set")
  return privateKeyToAccount(key as `0x${string}`)
}

// ── Public client (read-only) ─────────────────────────────────────────────────

export function getFitTokenPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  })
}

// ── Mint rewards (write) ──────────────────────────────────────────────────────

export type MintResult = {
  txHash: `0x${string}`
  amountWei: bigint
}

/**
 * Calls `mintReward(to, amount, reason)` on the FitToken contract.
 *
 * @param toAddress  Recipient's wallet (must be a valid EVM address).
 * @param amount     Off-chain FIT amount (e.g., 12.50). Converted to 18-decimal wei.
 * @param reason     Human-readable reason logged in the contract event.
 */
export async function mintFitTokensOnChain(
  toAddress: string,
  amount: number,
  reason: string,
): Promise<MintResult> {
  const contractAddress = getContractAddress()
  const account         = getDistributorAccount()

  const checksummed = toChecksumAddress(toAddress)
  if (!checksummed) throw new Error(`Invalid EVM address: ${toAddress}`)

  const chain   = getChain()
  const rpcUrl  = getRpcUrl()

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  })

  // Convert off-chain decimal amount (2 dp) to 18-decimal wei
  const amountWei = parseUnits(amount.toFixed(2), 18)

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: FIT_TOKEN_ABI,
    functionName: "mintReward",
    args: [checksummed, amountWei, reason],
  })

  return { txHash, amountWei }
}

// ── Read on-chain balance ─────────────────────────────────────────────────────

/**
 * Reads the on-chain FIT balance of a wallet address.
 * Returns the human-readable amount (18-decimal wei → float).
 */
export async function getOnChainFitBalance(walletAddress: string): Promise<number> {
  const checksummed = toChecksumAddress(walletAddress)
  if (!checksummed) return 0

  const client          = getFitTokenPublicClient()
  const contractAddress = getContractAddress()

  const raw = await client.readContract({
    address: contractAddress,
    abi: FIT_TOKEN_ABI,
    functionName: "balanceOf",
    args: [checksummed],
  }) as bigint

  // Convert 18-decimal wei → human-readable with 2 dp
  return Number(raw) / 1e18
}
