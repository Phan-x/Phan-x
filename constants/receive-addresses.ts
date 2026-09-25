/*
 * Real, user-supplied deposit addresses. DO NOT let anyone edit these
 * without direct confirmation from the wallet owner — sending users an
 * incorrect address means their funds are unrecoverable.
 *
 * The EVM address is applied to all standard EVM-compatible networks,
 * since a single EVM wallet address is valid to receive funds on any
 * EVM chain (ERC20, BEP20, Arbitrum, AVAX, opBNB all share the same
 * 0x address format from the same wallet).
 */
const EVM_ADDRESS = "0x35F03a02cb3D9f4F163223B0424d16ABB11ACe66";

export const DEPOSIT_ADDRESSES: Record<string, string> = {
  TRC20: "TEtQbTpJQxHQ4Gon36guBeBLxrk95sJTSB",
  SOL: "8h2SdrbGbrocRjDqKrkhu1d85b7qnxepgZe9QM5W58SY",
  ERC20: EVM_ADDRESS,
  BEP20: EVM_ADDRESS,
  ARETH: EVM_ADDRESS,
  AVAX: EVM_ADDRESS,
  OPBNB: EVM_ADDRESS,
};
