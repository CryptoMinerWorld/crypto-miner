pragma solidity ^0.4.0;

import "./Token.sol";

/// @dev extends Token by adding ERC20 compliant token symbol, name and decimals
contract Gem is Token {
  string public constant symbol = "GEM";
  string public constant name = "GEM – Crypto Miner World";
  uint8 public constant decimals = 0;
}
