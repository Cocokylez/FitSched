# FitToken (FIT) — Base Blockchain

ERC-20 reward token for the [FitSched](https://github.com/Cocokylez/fitsched-fullstack) fitness app.  
Built on [Base](https://base.org) — Coinbase's Ethereum L2.

---

## Tokenomics

| Allocation | Amount | % | Notes |
|---|---|---|---|
| Team + Reserve | 500,000,000 FIT | 50% | Minted to owner at deploy |
| Community / LP | 100,000,000 FIT | 10% | Minted to owner at deploy |
| **Rewards Pool** | **400,000,000 FIT** | **40%** | Minted on-demand by distributor |
| **Total** | **1,000,000,000 FIT** | **100%** | Hard cap — can never exceed |

---

## How Users Earn FIT

FitToken mirrors the app's existing off-chain reward logic:

| Action | Reward |
|---|---|
| Complete a verified workout | **1.00 FIT** base |
| + Streak bonus (day 1) | **+0.20 FIT** |
| + Streak bonus (tapers to day 30+) | **+0.02–0.20 FIT** |
| Verification score < 25% | **0 FIT** |
| Verification score 25–55% | **0.5× rewards** |
| Arm 2× boost (costs 3 FIT) | **2× on next workout** |

---

## Contract

| Field | Value |
|---|---|
| Name | FitToken |
| Symbol | FIT |
| Decimals | 18 |
| Chain | Base (chainId: 8453) |
| Standard | ERC-20 + ERC-20Burnable + Ownable2Step |

---

## Development Setup

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Install dependencies

```bash
cd fittoken
forge install OpenZeppelin/openzeppelin-contracts
```

### 3. Copy and fill in env vars

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Run tests

```bash
forge test -vvv
```

### 5. Deploy to testnet (free)

```bash
# Get free Base Sepolia ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

### 6. Deploy to mainnet (when ready)

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

---

## Deployment Checklist

- [ ] Install Foundry (`foundryup`)
- [ ] `forge install OpenZeppelin/openzeppelin-contracts`
- [ ] Fill in `.env` (copy from `.env.example`)
- [ ] `forge test` — all tests pass
- [ ] Deploy to Base Sepolia testnet
- [ ] Verify contract on Basescan
- [ ] Test `mintReward()` on testnet from distributor wallet
- [ ] **[Budget needed]** Deploy to Base mainnet
- [ ] Add `FIT_TOKEN_ADDRESS` to FitSched backend `.env`
- [ ] Integrate `wagmi` / `viem` in the Next.js app for wallet connect + claim UI

---

## Roles

| Role | Who | Can Do |
|---|---|---|
| Owner | Multisig / cold wallet | Rotate distributor, transfer ownership |
| Reward Distributor | FitSched backend hot wallet | Call `mintReward()` |
| Users | Anyone | Transfer, burn own tokens |

---

## Estimated Gas Costs (Base mainnet)

| Action | Estimated Gas | ~USD at 0.001 gwei |
|---|---|---|
| Deploy contract | ~1,200,000 gas | ~$0.10 |
| `mintReward()` | ~65,000 gas | ~$0.005 |
| `transfer()` | ~21,000 gas | ~$0.002 |

Base is very cheap. Deploying costs a few dollars at most.

---

## Future Roadmap (v2+)

- **Wallet connect in app** — users link their wallet to receive on-chain FIT
- **Claim page** — users claim accumulated off-chain FIT to their wallet
- **DEX listing** — add liquidity on Uniswap v3 on Base
- **Governance** — FIT holders vote on new features / reward rates
- **NFT badges** — mint achievement NFTs on Base using FIT
