/*
 * Real, user-supplied deposit addresses. DO NOT let anyone edit these
 * without direct confirmation from the wallet owner — sending users an
 * incorrect address means their funds are unrecoverable.
 *
 * The EVM address (0xcCe5...) was provided by the owner and is
 * applied to all standard EVM-compatible networks, since a single EVM
 * wallet address is valid to receive funds on any EVM chain (ERC20,
 * BEP20, Polygon, Arbitrum, Optimism, AVAX, opBNB all share the same
 * 0x address format from the same wallet).
 *
 * Networks with no address on file here (TON, CELO, and the internal
 * "خارج السلسلة" transfer) are intentionally left out — the Receive
 * screen shows "not available" for these rather than guessing.
 */
const EVM_ADDRESS = "0xcCe5FD0B5bd7155426a2679Ce962FcAa344fbE1F";

export const DEPOSIT_ADDRESSES: Record<string, string> = {
  TRC20: "TUecN52zbqrDDvjN3bdBMccWMLxaY4FLfq",
  SOL: "B9Lxvy9AKQkUJ3YmjckHS2ZFHChC4LJMBcami9xq4JNC",
  ERC20: EVM_ADDRESS,
  BEP20: EVM_ADDRESS,
  POLYGON: EVM_ADDRESS,
  ARETH: EVM_ADDRESS,
  OPTIMISM: EVM_ADDRESS,
  AVAX: EVM_ADDRESS,
  OPBNB: EVM_ADDRESS,
};
