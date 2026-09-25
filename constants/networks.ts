export type NetworkOption = {
  code: string;
  name: string;
  chain: string;
  feeUsd: number;
  feeToken: string;
  color: string;
  logo?: string;
  internal?: boolean;
};

/*
 * Static, approximate gas-fee estimates matching the reference app's
 * screenshots. These are NOT live network fees — for production,
 * replace `feeUsd`/`feeToken` with a live estimate fetched from the
 * Worker (cached for a few minutes) instead of these fixed numbers.
 *
 * `logo` points to Trust Wallet's public, widely-used crypto-assets
 * CDN (the same source most wallet apps pull chain logos from). If a
 * logo fails to load for any reason, the UI falls back to a plain
 * colored circle automatically — it never breaks the row.
 */
const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

export const NETWORKS: NetworkOption[] = [
  { code: "TRC20", name: "TRC20", chain: "Tron", feeUsd: 2.63, feeToken: "2.63188299 USDT", color: "#FF0028", logo: `${TW}/tron/info/logo.png` },
  { code: "ERC20", name: "ERC20", chain: "Ethereum", feeUsd: 0.02, feeToken: "0.024535 USDT", color: "#627EEA", logo: `${TW}/ethereum/info/logo.png` },
  { code: "ARETH", name: "ARETH", chain: "Arbitrum", feeUsd: 0.09, feeToken: "0.00003636 ETH", color: "#28A0F0", logo: `${TW}/arbitrum/info/logo.png` },
  { code: "AVAX", name: "AVAX", chain: "AVAX-C", feeUsd: 0, feeToken: "0.00045 AVAX", color: "#E84142", logo: `${TW}/avalanchec/info/logo.png` },
  { code: "OPBNB", name: "OPBNB", chain: "opBNB", feeUsd: 0, feeToken: "<0.000001 BNB", color: "#F0B90B", logo: `${TW}/opbnb/info/logo.png` },
  { code: "BEP20", name: "BEP20", chain: "Binance Smart Chain", feeUsd: 0.16, feeToken: "0.16364471 USDT", color: "#F3BA2F", logo: `${TW}/smartchain/info/logo.png` },
  { code: "SOL", name: "SOL", chain: "Solana", feeUsd: 0.35, feeToken: "0.346582 USDT", color: "#14F195", logo: `${TW}/solana/info/logo.png` },
];

export function getNetwork(code: string): NetworkOption {
  return NETWORKS.find((n) => n.code === code) || NETWORKS[0];
}
