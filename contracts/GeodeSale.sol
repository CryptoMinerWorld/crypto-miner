pragma solidity 0.4.23;

import "./GemERC721.sol";

/**
 * @notice GeodeSale sells the Gems (as Geodes)
 */
contract GeodeSale {
  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant SALE_VERSION = 0x2;

  /// @dev Version of the Gem smart contract to work with
  /// @dev See `GemERC721.TOKEN_VERSION`
  uint32 public constant GEM_VERSION_REQUIRED = 0x1;

  /// @dev Structure used as temporary storage for gem data
  struct Gem {
    uint16 plotId;
    uint8 depth;
    uint8 gemNum;
    uint8 color;
    uint8 level;
    uint8 gradeType;
    uint8 gradeValue;
  }

  /// @notice Number of geodes to sell
  uint16 public constant GEODES_TO_SELL = 5500;

  /// @notice Amount of gems in a geode
  uint8 public constant GEMS_IN_GEODE = 4;

  /// @notice Number of different colors defined for a gem
  uint8 public constant COLORS = 6;

  /// @notice Number of different grade values defined for a gem
  uint8 public constant GRADE_VALUES = 100;

  /// @notice Current value of geodes sold, initially zero
  uint16 public geodesSold = 0;

  /// @dev Pointer to a next geode to be sold
  uint16 public nextGeode = 1;

  /// @dev Pointer to a next gem do be minted
  uint32 public nextGem = 0x401;

  /// @dev A gem to sell, should be set in constructor
  GemERC721 public gemContract;

  /// @dev Address to send all the incoming funds
  address public beneficiary;

  /// @dev Mapping for the geode owners, will be used to issue land plots
  mapping(uint16 => address) public geodeOwners;

  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in buyGeodes()
  event GeodeSold(uint16 indexed plotId, address indexed owner, uint16 gems);
  /// @dev fired in buyGeodes()
  event PurchaseComplete(address indexed owner, uint16 geodes, uint16 bonusGems);

  /// @dev Creates a GeodeSale attached to an already deployed Gem smart contract
  constructor(address gemAddress, address _beneficiary) public {
    // validate inputs
    require(gemAddress != address(0));
    require(_beneficiary != address(0));
    require(gemAddress != _beneficiary);

    // bind the Gem smart contract
    gemContract = GemERC721(gemAddress);

    // validate if character card instance is valid
    // by validating smart contract version
    require(GEM_VERSION_REQUIRED == gemContract.TOKEN_VERSION());

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

    // current price value
    uint256 _currentPrice = currentPrice();

    // value should be enough to buy at least one geode
    require(value >= _currentPrice);

    // calculate number of geodes to sell
    uint256 geodesToSell = value / _currentPrice;

    // we cannot sell more then GEODES_TO_SELL
    if(geodesSold + geodesToSell > GEODES_TO_SELL) {
      geodesToSell = GEODES_TO_SELL - geodesSold;
    }

    // recalculate how much value we have to take from player
    value = geodesToSell * _currentPrice;

    // overflow check
    require(value <= msg.value);

    // calculate how much we have to send back to player
    uint256 change = msg.value - value;

    // if player buys 10 geodes - he receives one for free
    geodesToSell += geodesToSell / 10;

    // update counters
    geodesSold += uint16(geodesToSell);

    // create geodes – actually create gems
    for(uint16 i = 0; i < geodesToSell; i++) {
      // open created geode + emit an event
      __openGeode(nextGeode + i, player, GEMS_IN_GEODE + ((i + 1) % 5 == 0? 1: 0));
    }

    // update next geode to sell pointer
    nextGeode += uint16(geodesToSell);

    // send the value to the beneficiary
    beneficiary.transfer(value);

    // send change back to player
    if(change > 0) {
      player.transfer(change);
    }

    // fire an event
    emit PurchaseComplete(player, geodesSold, geodesSold / 5);
  }

  /// @dev current geode price, implements early bid feature
  function currentPrice() public constant returns (uint256) {
    // first 500 geodes price is 0.04 ETH, then 0.08 ETH
    return geodesSold < 500? 40 finney: 80 finney;
  }

/*
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
*/

  // private function to create geode and send all
  // the gems inside it to a player
  function __openGeode(uint16 geodeId, address player, uint8 n) private {
    // generate the gems (geode content)
    Gem[] memory gems = __randomGeode(geodeId, n);

    // store geode owner
    geodeOwners[geodeId] = player;

    // iterate and mint gems required
    for(uint32 i = 0; i < gems.length; i++) {
      gemContract.mint(
        player,
        nextGem++,
        gems[i].plotId,
        gems[i].depth,
        gems[i].gemNum,
        gems[i].color,
        gems[i].level,
        gems[i].gradeType,
        gems[i].gradeValue
      );
    }

    // emit an event
    emit GeodeSold(geodeId, player, uint16(gems.length));
  }

  // generates 5 gems for a given geode ID randomly
  function __randomGeode(uint16 geodeId, uint8 n) private constant returns (Gem[]) {
    // define an array of gems to return as a result of opening the geode specified
    Gem[] memory gems = new Gem[](n);

    // variable for randomness
    uint256 randomness;

    // create the gems
    for(uint8 i = 1; i <= n; i++) {
      // get some randomness to work with – 256 bits should be more then enough
      // and.. yeah! – this is heavily influenceable by miners!
      randomness = uint256(keccak256(block.number, gasleft(), msg.sender, tx.origin, geodeId, i));

      // use lower 16 bits to determine gem color
      uint8 colorId = __colorId(uint16(randomness));

      // use next 16 bits to determine grade value
      uint8 gradeValue = __gradeValue(uint16(randomness >> 32));

      // use next 32 bits to determine grade type
      uint8 gradeType = __gradeType(uint32(randomness >> 64));

      // add into array (plotId, depth, gemNum, color, level, grade)
      gems[i - 1] = Gem(geodeId, 0, i, colorId, 1, gradeType, gradeValue);
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
    // we need to ensure only colors 9, 10, 11, 12, 1, 2 are allowed
    return (uint8(__randomValue(randomness, 8, COLORS, 0x10000)) % 12) + 1;
  }

  // determines grade value randomly
  function __gradeValue(uint16 randomness) private pure returns (uint8) {
    // normalize 0x10000 random range into 100
    return uint8(__randomValue(randomness, 0, GRADE_VALUES, 0x10000));
  }

  // determines grade type randomly
  function __gradeType(uint32 randomness) private pure returns (uint8) {
    // use only low 24 bits of randomness
    randomness &= 0xFFFFFF;

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

  // assembled the gradeId from type and value
  function __createGradeId(uint8 gradeType, uint8 gradeValue) private pure returns (uint16) {
    // enforce valid grades: D, C, B, A, AA, AAA – 1, 2, 3, 4, 5, 6 accordingly
    assert(gradeType >= 1 && gradeType <= 6);

    // pack the grade ID and return
    return uint16(gradeType) << 8 | gradeValue;
  }

  // enforce at least `n` gem(s) of level `levelId`
  function __enforceLevelConstraint(Gem[] gems, uint8 n, uint8 levelId, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length >= n);

    // generate a random index in range [0, length - n) to rewrite color
    uint8 index = uint8(__randomValue(randomness, 0, gems.length - n, 0x10000)); // use low 16 bits

    // rewrite the color in the gems array
    for(uint8 i = index; i < index + n; i++) {
      // set the new level
      gems[i].level = levelId;
    }
  }

  // enforce at least `n` gem(s) of grade type `gradeType`
  function __enforceGradeConstraint(Gem[] gems, uint8 n, uint8 gradeType, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length >= n);

    // generate a random index in range [0, length - n) to rewrite grade type
    uint8 index = uint8(__randomValue(randomness, 0, gems.length - n, 0x10000)); // use low 16 bits

    // rewrite the grade type in the gems array
    for(uint8 i = index; i < index + n; i++) {
      // set the new grade type
      gems[i].gradeType = gradeType;
    }
  }

  // gives a random value, normalizing the given one (randomness)
  function __randomValue(uint256 randomness, uint256 offset, uint256 length, uint256 n) private pure returns (uint256) {
    // return random in range [offset, offset + length)
    return offset + randomness * length / n;
  }

}
