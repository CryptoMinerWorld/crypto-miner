pragma solidity 0.4.23;

import "./ChestKeyERC20.sol";

/**
 * @title Founder's Chest Key ERC20 Token
 *
 * @notice Founder's Chest Key is a transferable fungible entity (ERC20 token)
 *      used to open Founder's Chest found in Antarctica
 * @notice Founder's Chest Key is a part of the mining process and Chest System.
 *      Keys may by found in plots of land (see PlotERC721) in Antarctica only when mining
 *
 * @dev Founder's Chest Key is mintable and burnable entity,
 *      meaning it can be created or destroyed by the authorized addresses
 * @dev An address authorized can mint/burn its own tokens (own balance) as well
 *      as tokens owned by another address (additional permission level required)
 *
 * @author Basil Gorin
 */
contract FoundersKeyERC20 is ChestKeyERC20 {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x70221dffd5103663ba8bf65a43517466ba616c4937710b99c7f003a7ae99fbc7;

  /**
   * @notice ERC20 name of the token (long name)
   */
  string public constant name = "FOUNDERS KEY - CryptoMiner World";

}

