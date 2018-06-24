pragma solidity 0.4.23;

import "./GemERC721.sol";

/**
 * @notice GeodeSale sells the Gems (as Geodes)
 */
contract Presale {
  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant PRESALE_VERSION = 0x3;

  /// @dev Version of the Gem smart contract to work with
  /// @dev See `GemERC721.TOKEN_VERSION`
  uint32 public constant TOKEN_VERSION_REQUIRED = 0x2;

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

  /// @dev A mapping storing geode / land plot balances,
  ///      just to get player an idea how much plot land he owns
  mapping(address => uint16) public geodeBalances;

  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in buyGeodes()
  event PurchaseComplete(
    address indexed _from,
    address indexed _to,
    uint16 geodes,
    uint32 gems,
    uint64 price,
    uint16 geodesTotal,
    uint32 gemsTotal
  );
  /// @dev fired in buyGeodes()
  event PresaleStateChanged(uint16 sold, uint16 left, uint64 lastPrice, uint64 currentPrice);

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
    require(TOKEN_VERSION_REQUIRED == gemContract.TOKEN_VERSION());

    // set the beneficiary
    beneficiary = _beneficiary;
  }

  /// @dev Returns the presale state data as a packed uint96 tuple structure
  function getPacked() public constant returns (uint96) {
    // pack and return
    return uint96(geodesSold) << 80 | uint80(geodesLeft()) << 64 | currentPrice();
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
    uint64 _currentPrice = currentPrice();

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

    // if player buys 10 geodes and there are still additional geodes to sell
    if(geodesToSell >= 10 && geodesSold + geodesToSell < GEODES_TO_SELL) {
      // - he receives one free geode
      geodesToSell++;
    }

    // update counters
    geodesSold += uint16(geodesToSell);

    // update owner geode balance
    geodeBalances[player] += uint16(geodesToSell);

    // create geodes – actually create gems
    for(uint16 i = 0; i < geodesToSell; i++) {
      // open created geode + emit an event, geode number 5 (4) contains additional gem
      __openGeode(nextGeode + i, player, GEMS_IN_GEODE + (i == 4? 1: 0));
    }

    // update next geode to sell pointer
    nextGeode += uint16(geodesToSell);

    // send the value to the beneficiary
    beneficiary.transfer(value);

    // send change back to player
    if(change > 0) {
      player.transfer(change);
    }

    // fire required events:
    // purchase complete (used to display success message to player)
    emit PurchaseComplete(
      player,
      player,
      uint16(geodesToSell),
      uint32(GEMS_IN_GEODE * geodesToSell + (geodesToSell >= 5 ? 1 : 0)),
      uint64(value),
      geodeBalances[player],
      uint32(gemContract.balanceOf(player))
    );

    // presale state changed (used for UI updates)
    emit PresaleStateChanged(geodesSold, geodesLeft(), _currentPrice, currentPrice());
  }

  /// @dev current geode price, implements early bid feature
  function currentPrice() public constant returns (uint64) {
    // first 500 geodes price is 0.05 ETH, then 0.1 ETH
    return geodesSold < 500? 50 finney: 100 finney;
  }

  /// @dev number of geodes available for sale
  function geodesLeft() public constant returns (uint16) {
    // overflow check, should not happend by design
    assert(geodesSold <= GEODES_TO_SELL);

    // calculate based on `geodesSold` value
    return GEODES_TO_SELL - geodesSold;
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
    __enforceLevelConstraint(gems, 2, uint16(randomness >> 96));
    // enforce 1 gem of the grade A
    __enforceGradeConstraint(gems, 4, uint16(randomness >> 128));

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

    // Grade D: 50% probability of 16777216 total values
    if(randomness < 8388608) {
      return 1;
    }
    // Grade C: 37% probability
    else if(randomness < 14596178) {
      return 2;
    }
    // Grade B: 10% probability
    else if(randomness < 16273900) {
      return 3;
    }
    // Grade A: 2.5% probability
    else if(randomness < 16693330) {
      return 4;
    }
    // Grade AA: 0.49% probability
    else if(randomness < 16775538) {
      return 5;
    }
    // Grade AAA: 0.01% probability
    else {
      return 6;
    }
  }

/*
  // assembles the gradeId from type and value
  function __createGradeId(uint8 gradeType, uint8 gradeValue) private pure returns (uint16) {
    // enforce valid grades: D, C, B, A, AA, AAA – 1, 2, 3, 4, 5, 6 accordingly
    assert(gradeType >= 1 && gradeType <= 6);

    // pack the grade ID and return
    return uint16(gradeType) << 8 | gradeValue;
  }
*/

  // enforce at least one gem of level `levelId`
  function __enforceLevelConstraint(Gem[] gems, uint8 levelId, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length > 0);

    // generate a random index in range [0, length - n) to rewrite color
    uint8 index = uint8(__randomValue(randomness, 0, gems.length - 1, 0x10000)); // use low 16 bits

    // set the new level
    gems[index].level = levelId;
  }

  // enforce at least one gem of grade type `gradeType`
  function __enforceGradeConstraint(Gem[] gems, uint8 gradeType, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length > 0);

    // first we check if geode contains gem grade A or higher
    uint8 maxGrade = 0;

    // find the highest grade
    for(uint8 i = 0; i < gems.length; i++) {
      if(maxGrade < gems[i].gradeType) {
        maxGrade = gems[i].gradeType;
      }
    }

    // if maximum grade type is lower then gradeType
    if(maxGrade < gradeType) {
      // generate a random index in range [0, length - n) to rewrite grade type
      uint8 index = uint8(__randomValue(randomness, 0, gems.length - 1, 0x10000)); // use low 16 bits

      // rewrite the grade type in the gems array - set the new grade type
      gems[index].gradeType = gradeType;
    }
  }

  // gives a random value, normalizing the given one (randomness)
  function __randomValue(uint256 randomness, uint256 offset, uint256 length, uint256 n) private pure returns (uint256) {
    // return random in range [offset, offset + length)
    return offset + randomness * length / n;
  }

}
