pragma solidity 0.4.23;

import "./ChestKeyERC20.sol";

/**
 * @title Artifact ERC20 Token
 *
 * @notice Artifact ERC20 is a transferable fungible entity (ERC20 token)
 *      to be exchanged into Artifact ERC721 later in the game
 * @notice Artifact ERC20 is a part of the mining process. Artifacts may by found
 *      in plots of land (see PlotERC721) only when mining
 *
 * @dev Artifact ERC20 is mintable and burnable entity,
 *      meaning it can be created or destroyed by the authorized addresses
 * @dev An address authorized can mint/burn its own tokens (own balance) as well
 *      as tokens owned by another address (additional permission level required)
 *
 * @author Basil Gorin
 */
contract ArtifactERC20 is ChestKeyERC20 {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0xfe81d4b23218a9d32950b26fad0ab9d50928ece566126c1d1bf0c1bfe2666da6;

  /**
   * @notice ERC20 symbol of that token (short name)
   */
  string public constant symbol = "A20";

  /**
   * @notice ERC20 name of the token (long name)
   */
  string public constant name = "ARTIFACT20 - CryptoMiner World";

}

