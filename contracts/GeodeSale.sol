pragma solidity ^0.4.0;

import "./Gem.sol";

/**
 * @notice GeodeSale sells the Gems (as Geodes)
 */
contract GeodeSale {
  /// @notice Number of geodes to sell
  uint16 public constant GEODES_TO_SELL = 5000;

  /// @notice Price of a single geode
  uint256 public constant GEODE_PRICE = 100 finney;

  /// @notice Amount of gems in a geode
  uint8 public constant GEMS_IN_GEODE = 15;

  /// @notice Current value of geodes sold, initially zero
  uint16 public geodesSold = 0;

  /// @dev A gem to sell, should be set in constructor
  Gem public gem;


  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in buyGeodes()
  event GeodeCreated(uint16 indexed plotId);

  /// @dev Creates a GeodeSale attached to an already deployed Gem smart contract
  function GeodeSale(address gemAddress) public {
    // bind the Gem smart contract
    gem = Gem(gemAddress);
  }

  /**
   * @notice Calculates number of geodes to sell and sells them by
   * minting correspondent number of gems to the sender
   */
  function getGeodes() public payable {
    // check if there are still geodes to sell
    require(geodesSold < GEODES_TO_SELL);

    // call sender nicely - player
    address player = msg.sender;

    // amount of ether sent with the transaction
    uint256 value = msg.value;

    // value should be enough to buy at least one geode
    require(value >= GEODE_PRICE);

    // calculate number of geodes to sell
    uint256 geodesToSell = value / GEODE_PRICE;

    // we cannot sell more then GEODES_TO_SELL
    if(geodesSold + geodesToSell > GEODES_TO_SELL) {
      geodesToSell = GEODES_TO_SELL - geodesSold;
    }

    // recalculate how much value we have to take from player
    value = geodesToSell * GEODE_PRICE;

    // calculate how much we have to send back to player
    uint256 change = msg.value - value;

    // TODO: remove the assertion, it should never happen
    assert(geodesToSell <= GEODES_TO_SELL);

    // update counters
    geodesSold += uint16(geodesToSell);

    // create geodes – actually create gems
    for(uint16 i = 0; i < geodesToSell; i++) {
      for(uint256 j = 0; j < GEMS_IN_GEODE; j++) {
        gem.mint(uint80(j), player);
      }
      // emit an event
      GeodeCreated(i);
    }

    // send change back to player
    if(change > 0) {
      player.transfer(change);
    }
  }
}
