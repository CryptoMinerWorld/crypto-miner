pragma solidity 0.4.23;

import "./Token.sol";

/**
 * @notice GeodeSale sells the Gems (as Geodes)
 */
contract GeodeSale {
  /// @notice Number of geodes to sell
  uint16 public constant GEODES_TO_SELL = 5000;

  /// @notice Price of a single geode
  uint256 public constant GEODE_PRICE = 100 finney;

  /// @notice Price of a single geode when buying 5 or more (4% discount
  uint256 public constant GEODE_PRICE_5 = 96 finney;

  /// @notice Price of a single geode when buying 10 or more (10% discount)
  uint256 public constant GEODE_PRICE_10 = 90 finney;

  /// @notice Amount of gems in a geode
  uint8 public constant GEMS_IN_GEODE = 5;

  /// @notice Number of different colors defined for a gem
  uint8 public constant COLORS = 6;

  /// @notice Number of different grade values defined for a gem
  uint8 public constant GRADE_VALUES = 100;

  /// @notice Current value of geodes sold, initially zero
  uint16 public geodesSold = 0;

  /// @dev Pointer to a next geode to be sold
  uint16 public nextGeode = 1;

  /// @dev Mapping for the geode owners, will be used to issue land plots
  mapping(uint16 => address) public geodeOwners;

  /// @dev A gem to sell, should be set in constructor
  Token public gemContract;

  /// @dev Address to send all the incoming funds
  address public beneficiary;

  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in buyGeodes()
  event GeodeSold(uint16 indexed plotId, address indexed owner);

  /// @dev Creates a GeodeSale attached to an already deployed Gem smart contract
  constructor(address gemAddress, address _beneficiary) public {
    // validate inputs
    require(gemAddress != address(0));
    require(_beneficiary != address(0));
    require(gemAddress != _beneficiary);

    // bind the Gem smart contract
    gemContract = Token(gemAddress);

    // set the beneficiary
    beneficiary = _beneficiary;
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
    uint256 geodesToSell = calculateGeodesToSell(value);

    // we cannot sell more then GEODES_TO_SELL
    if(geodesSold + geodesToSell > GEODES_TO_SELL) {
      geodesToSell = GEODES_TO_SELL - geodesSold;
    }

    // recalculate how much value we have to take from player
    value = calculateGeodesPrice(geodesToSell);

    // overflow check
    require(value <= msg.value);

    // calculate how much we have to send back to player
    uint256 change = msg.value - value;

    // update counters
    geodesSold += uint16(geodesToSell);

    // create geodes – actually create gems
    for(uint16 i = 0; i < geodesToSell; i++) {
      // open created geode + emit an event
      __openGeode(nextGeode + i, player);
    }

    // update next geode to sell pointer
    nextGeode += uint16(geodesToSell);

    // send the value to the beneficiary
    beneficiary.transfer(value);

    // send change back to player
    if(change > 0) {
      player.transfer(change);
    }
  }

  /// @dev calculates a price to buy several geodes
  function calculateGeodesPrice(uint256 geodesToSell) public pure returns (uint256) {
    // minimum amount of geodes to buy is one, return price of one on zero input
    if(geodesToSell == 0) {
      return GEODE_PRICE;
    }
    // up to 5 geodes (exclusive) - no discount
    else if(geodesToSell < 5) {
      return geodesToSell * GEODE_PRICE;
    }
    // up to 10 geodes (exclusive) - discount 4%
    else if(geodesToSell < 10) {
      return geodesToSell * GEODE_PRICE_5;
    }
    // 10 geodes or more - discount 10%
    else {
      return geodesToSell * GEODE_PRICE_10;
    }
  }

  /// @dev calculates number of geodes to sell by the value sent
  function calculateGeodesToSell(uint256 value) public pure returns (uint256) {
    // not enough value to buy even one geode
    if(value < GEODE_PRICE) {
      return 0;
    }
    // no discount
    else if(value < 5 * GEODE_PRICE_5) {
      return value / GEODE_PRICE;
    }
    // 4% discount
    else if(value < 10 * GEODE_PRICE_10) {
      return value / GEODE_PRICE_5;
    }
    // 10% discount
    else {
      return value / GEODE_PRICE_10;
    }
  }

  // private function to create geode and send all
  // the gems inside it to a player
  function __openGeode(uint16 geodeId, address player) private {
    // generate the gems (geode content)
    uint80[] memory gems = __randomGeode(geodeId);

    // store geode owner
    geodeOwners[geodeId] = player;

    // mint the gems generated
    gemContract.mintTokens(player, gems);

    // emit an event
    emit GeodeSold(geodeId, player);
  }

  // generates 5 gems for a given geode ID randomly
  function __randomGeode(uint16 geodeId) private constant returns(uint80[]) {
    // define an array of gems to return as a result of opening the geode specified
    uint80[] memory gems = new uint80[](GEMS_IN_GEODE);

    // create the gems
    for(uint8 i = 1; i <= GEMS_IN_GEODE; i++) {
      // get some randomness to work with – 256 bits should be more then enough
      // and.. yeah! – this is heavily influenceable by miners!
      uint256 randomness = uint256(keccak256(block.number, gasleft(), msg.sender, tx.origin, geodeId, i));

      // use lower 16 bits to determine gem color
      uint8 colorId = __colorId(uint16(randomness));

      // use next 16 bits to determine grade value
      uint8 gradeValue = __gradeValue(uint16(randomness >> 32));

      // use next 32 bits to determine grade type
      uint8 gradeType = __gradeType(uint32(randomness >> 64));

      // construct the gem UID based on the already calculated attributes
      uint80 gemUid = __createGem(1, colorId, gradeType, gradeValue, geodeId, 0, i);

      // add into array
      gems[i - 1] = gemUid;
    }

    // enforce 1 level 2 gem
    __enforceLevelConstraint(gems, 1, 2, uint16(randomness >> 96));
    // enforce 1 gem of the grade A
    __enforceGradeConstraint(gems, 1, 4, uint16(randomness >> 128));

    // return created gems array back
    return gems;
  }

  // determines color ID randomly
  function __colorId(uint16 randomness) private pure returns (uint8) {
    // normalize 0x10000 random range into 12, starting from 1
    return uint8(__randomValue(randomness, 1, COLORS, 0x10000));
  }

  // determines grade value randomly
  function __gradeValue(uint16 randomness) private pure returns (uint8) {
    // normalize 0x10000 random range into 100
    return uint8(__randomValue(randomness, 0, GRADE_VALUES, 0x10000));
  }

  // determines grade type randomly
  function __gradeType(uint32 randomness) private pure returns (uint8) {
    // use only low 24 bits of randomness
    randomness &= 0xFFFFFFFF;

    // Grade D: 20% probability of 16777216 total values
    if(randomness < 3355444) {
     return 1;
    }
    // Grade C: 28% probability
    else if(randomness < 8053064) {
      return 2;
    }
    // Grade B: 40% probability
    else if(randomness < 14763950) {
      return 3;
    }
    // Grade A: 10.95% probability
    else if(randomness < 16525558) {
      return 4;
    }
    // Grade AA: 1% probability
    else if(randomness < 16768828) {
      return 5;
    }
    // Grade AAA: 0.05% probability
    else {
      return 6;
    }
  }

  // assembles a gem UID from its attributes
  function __createGem(
    uint8 levelId,
    uint8 colorId,
    uint8 gradeType,
    uint8 gradeValue,
    uint16 plotId,
    uint16 blockId,
    uint8 gemId
  ) private constant returns (uint80) {
    // enforce valid levels: in pre-sale we have only level 1
    assert(levelId == 1);
    // enforce valid colors: 1..6
    assert(colorId >= 1 && colorId <= COLORS);
    // create gradeId performing internal validations
    uint16 gradeId = __createGradeId(gradeType, gradeValue);
    // validate plotId, 1..5000 (GEODES_TO_SELL)
    assert(plotId >= nextGeode && plotId <= GEODES_TO_SELL);
    // blockId for geode is zero
    assert(blockId == 0);
    // gemId cannot be greater then GEMS_IN_GEODE
    assert(gemId >= 1 && gemId <= GEMS_IN_GEODE);

    // pack the Gem UID and return
    return uint80(levelId) << 72 | uint72(colorId) << 64 | uint64(gradeId) << 48 | uint48(plotId) << 24 | gemId;
  }

  // assembled the gradeId from type and value
  function __createGradeId(uint8 gradeType, uint8 gradeValue) private pure returns (uint16) {
    // enforce valid grades: D, C, B, A, AA, AAA – 1, 2, 3, 4, 5, 6 accordingly
    assert(gradeType >= 1 && gradeType <= 6);

    // pack the grade ID and return
    return uint16(gradeType) << 8 | gradeValue;
  }

/*
  // enforce `n` gems to be the same (random) color
  function __enforceColorConstraint(uint80[] gems, uint8 n, uint32 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length >= n);
    
    // generate a random index in range [0, length - n) to rewrite color
    uint8 index = uint8(__randomValue(0xFFFF & randomness, 0, gems.length - n, 0x10000)); // use low 16 bits

    // generate random color value
    uint8 colorId = uint8(__randomValue(randomness >> 16, 1, COLORS, 0x10000));

    // rewrite the color in the gems array
    for(uint8 i = index; i < index + n; i++) {
      // clear the color
      gems[i] &= 0xFF00FFFFFFFFFFFFFFFF;
      // set the new color
      gems[i] |= uint72(colorId) << 64;
    }
  }
*/

  // enforce at least `n` gem(s) of level `levelId`
  function __enforceLevelConstraint(uint80[] gems, uint8 n, uint8 levelId, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length >= n);

    // generate a random index in range [0, length - n) to rewrite color
    uint8 index = uint8(__randomValue(randomness, 0, gems.length - n, 0x10000)); // use low 16 bits

    // rewrite the color in the gems array
    for(uint8 i = index; i < index + n; i++) {
      // clear the level
      gems[i] &= 0x00FFFFFFFFFFFFFFFFFF;
      // set the new color
      gems[i] |= uint80(levelId) << 72;
    }
  }

  // enforce at least `n` gem(s) of grade type `gradeType`
  function __enforceGradeConstraint(uint80[] gems, uint8 n, uint8 gradeType, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length >= n);

    // generate a random index in range [0, length - n) to rewrite grade type
    uint8 index = uint8(__randomValue(randomness, 0, gems.length - n, 0x10000)); // use low 16 bits

    // rewrite the grade type in the gems array
    for(uint8 i = index; i < index + n; i++) {
      // clear the grade type
      gems[i] &= 0xFFFF00FFFFFFFFFFFFFF;
      // set the new grade type
      gems[i] |= uint64(gradeType) << 56;
    }
  }

  // gives a random value, normalizing the given one (randomness)
  function __randomValue(uint256 randomness, uint256 offset, uint256 length, uint256 n) private pure returns (uint256) {
    // return random in range [offset, offset + length)
    return offset + randomness * length / n;
  }

}
