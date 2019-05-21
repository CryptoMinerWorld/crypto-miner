pragma solidity 0.5.8;

import "./GoldERC20.sol";

/**
 * @title Silver ERC20 Token
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
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   *      and changes smart contract itself is to be redeployed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x7a137fa4315e494a34e94bf9214632429f3db8ab037df8e859c368661dd070ac;

  /**
   * @notice ERC20 symbol of that token (short name)
   */
  string public constant symbol = "SLV";

  /**
   * @notice ERC20 name of the token (long name)
   */
  string public constant name = "SILVER - CryptoMiner World";

}
