pragma solidity 0.4.23;

import "./GoldERC20.sol";

/**
 * @title Silver Smart Contract
 *
 * @notice Silver is a transferable fungible entity (ERC20 token)
 *      used to "pay" for in game services like gem upgrades, etc.
 * @notice Silver is a part of Gold/Silver system, which allows to
 *      upgrade gems (level, grade, etc.)
 *
 * @dev Silver is mintable and burnable entity,
 *      meaning it can be created or destroyed by the authorized addresses
 * @dev An address authorized can mint/burn its own tokens (own balance) as well
 *      as tokens owned by another address (additional permission level required)
 *
 * @author Basil Gorin
 */
contract SilverERC20 is GoldERC20 {
  /**
   * @dev Smart contract version
   * @dev Should be incremented manually in this source code
   *      each time smart contact source code is changed
   * @dev To distinguish from other tokens must be multiple of 0x10
   */
  uint32 public constant TOKEN_VERSION = 0x20;

  /**
   * @notice ERC20 symbol of that token (short name)
   */
  string public constant symbol = "SLV";

  /**
   * @notice ERC20 name of the token (long name)
   */
  string public constant name = "SILVER - CryptoMiner World";

}
