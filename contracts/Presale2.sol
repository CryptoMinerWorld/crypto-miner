pragma solidity 0.4.23;

import "./GemERC721.sol";
import "./Random.sol";

/**
 * Presale2 replaces both Presale + CouponSale functionality
 *
 * Allows adding and using of a coupons for a free gem promotions
 */
contract Presale2 is AccessControl {
  // smart contract version, incremented manually on Presale API changes
  uint32 public constant PRESALE_VERSION = 0x10;

  // structure used as temporary storage for gem data
  struct Gem {
    uint16 plotId;
    uint8 depth;
    uint8 gemNum;
    uint8 color;
    uint8 level;
    uint8 gradeType;
    uint24 gradeValue;
  }

  // coupon definition structure
  struct Coupon {
    // creation time (block number)
    uint32 created;
    // expiration time (block number)
    uint32 expires;
    // number of free gems issued when used
    uint8 freeGems;
    // number of free land plots issued when used
    uint8 freePlots;
  }

  // a role required to create/add coupons
  uint32 public constant ROLE_COUPON_MANAGER = 0x00000100;

  // a role required to fix next gem and next free gem pointers
  uint32 public constant ROLE_DEVOPS_MANAGER = 0x00000200;

  // total number of geodes to sell
  uint16 public constant GEODES_TO_SELL = 55000;

  // amount of gems in a geode
  uint8 public constant GEMS_IN_GEODE = 3;

  // number of different grade values defined for a gem
  uint24 public constant GRADE_VALUES = 1000000;

  // interval between price increases, seconds
  uint64 public constant PRICE_INCREASE_INTERVAL = 86400;

  // number of geodes sold in previous sale
  uint16 public GEODES_SOLD;

  // gem colors available for sale
  uint8[] public colors = [9, 10, 1, 2];

  // current value of geodes sold
  uint16 public geodesSold; // was: 0;

  // pointer to a next geode to sell
  uint16 public nextGeode; // was: 1;

  // pointer to a next gem do be minted
  uint32 public nextGem; // was: 0x11001;

  // pointer to a next gem do be minted
  uint32 public nextFreeGem; // was: 0x1101;

  // how many free gems allocated by means of coupons
  uint32 public freeGemsAllocated;

  // how many free gems were consumed by players (codes used)
  uint32 public freeGemsUsed;

  // how many free land plots allocated by means of coupons
  uint32 public freePlotsAllocated;

  // how many free land plots were consumed by players (codes used)
  uint32 public freePlotsUsed;

  // how many coupons were totally added into the system
  uint32 public couponsCreated;

  // how many coupons were removed
  uint32 public couponsRemoved;

  // how many coupons were used (consumed) by the players
  uint32 public couponsConsumed;

  // total referral points issued
  uint32 public totalRefPoints;

  // smart contract deployment unix timestamp
  uint64 public created;

  // a gem to sell, should be set in constructor
  GemERC721 public gemContract;

  // previous sale, used to maintain data about previous buyers
  Presale2 public parentSale;

  // address to send 19.05% of the incoming funds
  address public chestVault;

  // address to send 80.95% of the incoming funds
  address public beneficiary;

  // available (not yet used) coupons
  mapping(uint256 => Coupon) public coupons;

  // mapping for the geode owners, will be used to issue land plots
  mapping(uint16 => address) private _geodeOwners;

  // a mapping storing geode / land plot balances
  mapping(address => uint16) private _geodeBalances;

  // referral points mapping
  mapping(address => uint32) public referralPoints;

  // consumed referral points
  mapping(address => uint32) public referralPointsConsumed;

  // list of referral points holders
  address[] public referralPointsHolders;

  // list of geode holders
  address[] public geodeHolders;

  // fired in buyGeodes()
  event PurchaseComplete(
    address indexed _ref,
    address indexed _to,
    uint16 geodes,
    uint32 gems,
    uint64 price,
    uint16 geodesTotal,
    uint32 gemsTotal
  );

  // fired in buyGeodes()
  event PresaleStateChanged(uint16 sold, uint16 left, uint64 price, uint64 priceIncreaseIn);

  // fired in buyGeodes()
  event ReferralPointsIssued(address indexed _to, uint32 issued, uint32 left, uint32 total);

  // fired in useReferralPoints()
  event ReferralPointsConsumed(address indexed _by, uint32 used, uint32 left, uint32 total);

  // fired once coupon successfully added
  event CouponAdded(address indexed _by, uint256 indexed key, uint32 expires, uint8 freeGems, uint8 freePlots);

  // fired once coupon was removed
  event CouponRemoved(address indexed _by, uint256 indexed key);

  // fired once coupon was consumed
  event CouponConsumed(address indexed _from, address indexed _to, uint256 indexed key, uint8 gems, uint8 plots);

  // fired in __openGeodes
  event GeodesOpened(address indexed _by, uint16 geodes, uint32 gems);

  // public getter for the geodeOwners
  function geodeOwners(uint16 n) public constant returns (address) {
    // taking into account geode number `n` delegate to parent sale or use current mapping
    return n <= GEODES_SOLD? parentSale.geodeOwners(n): _geodeOwners[n];
  }

  // public getter for land plot balances
  function geodeBalances(address addr) public constant returns (uint16) {
    // calculate the sum of current and parent sales
    return parentSale.geodeBalances(addr) + _geodeBalances[addr];
  }

  // creates a GeodeSale attached to previous presale and already deployed Gem smart contract
  constructor(address parentSaleAddress, address _chestVault, address _beneficiary) public {
    // validate inputs
    require(parentSaleAddress != address(0));
    require(_beneficiary != address(0));
    require(_chestVault != address(0));

    // bind the parent sale contract
    parentSale = Presale2(parentSaleAddress);

    // initialize parameters from the parent sale state
    geodesSold = parentSale.geodesSold();
    GEODES_SOLD = geodesSold;
    nextGeode = parentSale.nextGeode();
    nextGem = parentSale.nextGem();
    nextFreeGem = parentSale.nextFreeGem();
    address gemAddress = address(parentSale.gemContract());

    // validate parameters initialized
    require(geodesSold > 0);
    require(nextGeode > 1);
    require(nextGem > 0x11001);
    //require(nextFreeGem > 0x1101);
    require(gemAddress != address(0));

    // bind the Gem smart contract
    gemContract = GemERC721(gemAddress);

    // set the beneficiary
    beneficiary = _beneficiary;

    // set the chestVault
    chestVault = _chestVault;

    // initialize smart contract creation timestamp
    created = uint64(now);
  }

  // current geode price, implements price increase each 24 hours
  function currentPrice() public constant returns (uint64) {
    // determine how old presale is
    uint64 age = uint64(now) - created;

    // how many full intervals
    uint64 ageIntervals = age / PRICE_INCREASE_INTERVAL;

    // the geode price is 0.075 ETH + 0.001 ETH increase each interval
    return 75 finney + 1 finney * ageIntervals;
  }

  // time left until next price increase
  function priceIncreaseIn() public constant returns (uint64 sec) {
    // determine how old presale is
    uint64 age = uint64(now) - created;

    // determine how many seconds left till next price increase
    return PRICE_INCREASE_INTERVAL - age % PRICE_INCREASE_INTERVAL;
  }

  // number of geodes available for sale
  function geodesLeft() public constant returns (uint16) {
    // overflow check, should not happen by design
    assert(geodesSold <= GEODES_TO_SELL);

    // calculate based on `geodesSold` value
    return GEODES_TO_SELL - geodesSold;
  }

  // presale state data as a packed uint96 tuple structure
  function getPacked() public constant returns (uint160) {
    // pack and return
    return uint160(geodesSold) << 144 | uint144(geodesLeft()) << 128 | uint128(currentPrice()) << 64 | priceIncreaseIn();
  }

  // token balance, geodes balance, available referral points, total referral points earned as packed data structure
  function getPackedBalances(address player) public constant returns (uint112) {
    // pack and return
    return uint112(gemContract.balanceOf(player)) << 80 | uint80(geodeBalances(player)) << 64 | uint64(unusedReferralPoints(player)) << 32 | referralPoints[player];
  }

  // use referral points to get geode(s)
  function useReferralPoints() public {
    // call sender nicely - referral
    address referral = msg.sender;

    // how many unused points referral has
    uint32 unusedPoints = unusedReferralPoints(referral);

    // there should be at least 10 unused points
    require(unusedPoints >= 10);

    // how many geodes to issue
    uint32 geodesToIssue = unusedPoints / 20;

    // how many gems to issue
    uint32 gemsToIssue = (unusedPoints % 20) / 10;

    // how many referral points to consume
    uint32 pointsToConsume = geodesToIssue * 20 + gemsToIssue * 10;

    // update points consumed
    referralPointsConsumed[referral] += pointsToConsume;

    // open geodes
    if(geodesToIssue > 0) {
      __openGeodes(uint16(geodesToIssue), referral);
    }

    // issue gems
    if(gemsToIssue > 0) {
      __createGems(referral, uint8(gemsToIssue));
    }

    // emit an event
    emit ReferralPointsConsumed(referral, pointsToConsume, unusedReferralPoints(referral), referralPoints[referral]);
  }

  // how many referral points are available to consume
  function unusedReferralPoints(address referral) public constant returns (uint32) {
    // difference between total and consumed values
    return referralPoints[referral] - referralPointsConsumed[referral];
  }

  // checks if coupon is valid
  function isCouponValid(string code) public constant returns (bool) {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // fetch the coupon
    Coupon memory coupon = coupons[key];

    // coupon is valid if it didn't expire
    return coupon.expires > block.number;
  }

  // uses a coupon
  function useCoupon(string code) public {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // fetch the coupon
    Coupon memory coupon = coupons[key];

    // coupon is valid if it didn't expire
    require(coupon.expires > block.number);

    // how many gems to mint
    uint8 gems = coupon.freeGems;

    // does it contain a geode
    uint8 plots = coupon.freePlots;

    // there should be free gems to mint
    assert(gems > 0);

    // plots can be zero or one by design
    assert(plots <= 1);

    // update counters
    couponsConsumed++;
    freeGemsUsed += gems;
    freePlotsUsed += plots;

    // remove coupon from storage
    delete coupons[key];

    // call sender nicely - player
    address player = msg.sender;

    // mint free gems and send them to player
    if(plots > 0) {
      // open the geodes
      __openGeodes(plots, player);

      // emit a presale state changed event
      emit PresaleStateChanged(geodesSold, geodesLeft(), currentPrice(), priceIncreaseIn());
    }
    else {
      // plots == 0 doesn't issue a geode
      __createGems(player, gems);
    }

    // emit an event
    emit CouponConsumed(player, player, key, gems, plots);
  }

  // adds a coupon with a default expiration date – 1 million blocks (about half a year)
  function addCoupon(uint256 key, uint8 freeGems, uint8 freePlots) public {
    // delegate call to `addCouponWithExpiration`
    addCouponWithExpiration(key, uint32(block.number + 0x100000), freeGems, freePlots);
  }

  // adds a coupon with expiration date
  function addCouponWithExpiration(uint256 key, uint32 expires, uint8 freeGems, uint8 freePlots) public {
    // check appropriate sender permissions
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // validate inputs:
    // expiration date
    require(expires > block.number);
    // number of free gems in coupon: 1 or 3 (GEMS_IN_GEODE)
    require(freeGems == 1 && freePlots == 0 || freeGems == GEMS_IN_GEODE && freePlots <= 1);

    // update counters
    couponsCreated++;
    freeGemsAllocated += freeGems;
    freePlotsAllocated += freePlots;

    // create a coupon structure
    Coupon memory coupon = Coupon(uint32(block.number), expires, freeGems, freePlots);

    // put newly created coupon into the mapping
    coupons[key] = coupon;

    // emit an event
    emit CouponAdded(msg.sender, key, expires, freeGems, freePlots);
  }

  // removes a coupon
  function removeCoupon(uint256 key) public {
    // check appropriate sender permissions
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // coupon must exist
    require(coupons[key].created > 0);

    // update counter
    couponsRemoved++;

    // delete coupon from storage
    delete coupons[key];

    // emit an event
    emit CouponRemoved(msg.sender, key);
  }

  // calculates number of geodes to sell and sells them by
  // minting correspondent number of gems to the sender
  function getGeodes(uint8 minimumQuantity, address referral) public payable {
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

    // ensure minimum quantity constraint
    require(geodesToSell >= minimumQuantity);

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

    // referral bonus
    // check that a valid referral has been passed
    if(referral != address(0) && referral != player && geodeBalances(player) == 0 && geodeBalances(referral) > 0) {
      // add new referral points holders
      if(referralPoints[player] == 0) {
        referralPointsHolders.push(player);
      }
      if(referralPoints[referral] == 0) {
        referralPointsHolders.push(referral);
      }

      // player receives an amount of points equal to geodes to purchase
      referralPoints[player] += uint32(geodesToSell);

      // referral receives two times more bonus
      referralPoints[referral] += uint32(geodesToSell * 2);

      // update total referral points
      totalRefPoints += uint32(geodesToSell * 3);

      // emit events
      emit ReferralPointsIssued(player, uint32(geodesToSell), unusedReferralPoints(player), referralPoints[player]);
      emit ReferralPointsIssued(referral, uint32(geodesToSell * 2), unusedReferralPoints(referral), referralPoints[referral]);
    }

    // if player buys 10 geodes and there are still additional geodes to sell
    if(geodesToSell >= 10 && geodesSold + geodesToSell < GEODES_TO_SELL) {
      // - he receives one free geode
      geodesToSell++;
    }

    // open the geodes
    __openGeodes(uint16(geodesToSell), player);

    // 19.05% of the value
    uint256 value1905 = 381 * value / 2000;

    // send 19.05% of the value to the chest vault
    chestVault.transfer(value1905);

    // send the rest of the value to the beneficiary
    beneficiary.transfer(value - value1905);

    // send change back to player
    if(change > 0) {
      player.transfer(change);
    }

    // fire required events:
    // purchase complete (used to display success message to player)
    emit PurchaseComplete(
      referral,
      player,
      uint16(geodesToSell),
      uint32(GEMS_IN_GEODE * geodesToSell + (geodesToSell >= 5 ? 1 : 0)),
      uint64(value),
      geodeBalances(player),
      uint32(gemContract.balanceOf(player))
    );

    // presale state changed (used for UI updates)
    emit PresaleStateChanged(geodesSold, geodesLeft(), _currentPrice, priceIncreaseIn());
  }

  // allows to fix next gem pointer if it points to already existing gem
  function incrementNextGem() public {
    // check caller permissions
    require(__isSenderInRole(ROLE_DEVOPS_MANAGER));

    // ensure pointer is in bad state, ensure no overflow
    require(gemContract.exists(nextGem) && nextGem > 0x11001);

    // increment it
    nextGem++;
  }

  // allows to fix next free gem pointer if it points to already existing gem
  function incrementNextFreeGem() public {
    // check caller permissions
    require(__isSenderInRole(ROLE_DEVOPS_MANAGER));

    // ensure pointer is in bad state, ensure safe max limit
    require(gemContract.exists(nextFreeGem) && nextFreeGem < 0x11001);

    // increment it
    nextFreeGem++;
  }

  // private function to create several geodes and send all
  // the gems inside them to a player
  function __openGeodes(uint16 n, address player) private {
    // update geodes sold counter
    geodesSold += n;

    // save new geode holder if required
    if(_geodeBalances[player] == 0) {
      geodeHolders.push(player);
    }

    // update owner geode balance
    _geodeBalances[player] += n;

    // issued gems counter
    uint32 gemsCounter = 0;

    // create geodes – actually create gems
    for(uint16 i = 0; i < n; i++) {
      // how many gems do we have in this geode
      uint8 gems = GEMS_IN_GEODE + (i == 4? 1: 0);

      // open created geode + emit an event, geode number 5 (4) contains additional gem
      __openGeode(nextGeode + i, player, gems);

      // update counter
      gemsCounter += gems;
    }

    // update next geode to sell pointer
    nextGeode += n;

    // emit an event
    emit GeodesOpened(player, n, gemsCounter);
  }

  // private function to create geode and send all
  // the gems inside it to a player
  function __openGeode(uint16 geodeId, address player, uint8 n) private {
    // generate the gems (geode content)
    Gem[] memory gems = __randomGems(geodeId, n, true);

    // store geode owner
    _geodeOwners[geodeId] = player;

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

  // private function to create geode and send all
  // the gems inside it to a player
  function __createGems(address player, uint8 n) private {
    // generate the gems (geode content)
    Gem[] memory gems = __randomGems(0, n, n == GEMS_IN_GEODE);

    // iterate and mint gems required
    for(uint32 i = 0; i < gems.length; i++) {
      gemContract.mint(
        player,
        nextFreeGem++,
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

  // generates `n` gems for a given geode ID randomly
  function __randomGems(uint16 geodeId, uint8 n, bool enforceConstraints) internal constant returns (Gem[]) {
    // define an array of gems to return as a result of opening the geode specified
    Gem[] memory gems = new Gem[](n);

    // variable for randomness
    uint256 randomness;

    // create the gems
    for(uint8 i = 1; i <= n; i++) {
      // get some randomness to work with – 256 bits should be more then enough
      // and.. yeah! – this is heavily influenceable by miners!
      randomness = uint256(keccak256(block.number, gasleft(), msg.sender, tx.origin, geodeId, i));

      // add random gem into array (plotId, depth, gemNum, color, level, grade)
      gems[i - 1] = __randomGem(geodeId, 0, i, uint128(randomness));
    }

    // if geode presale mode - we need to enforce constraints for color and grade
    if(enforceConstraints) {
      // enforce 1 level 2 gem
      __enforceLevelConstraint(gems, 2, uint16(randomness >> 144));
      // enforce 1 gem of the grade A
      __enforceGradeConstraint(gems, 4, uint16(randomness >> 160));
    }

    // return created gems array back
    return gems;
  }

  // create a gem with defined plot ID, depth, number and random color and grade
  // level is set to one
  function __randomGem(uint16 plotId, uint8 depth, uint8 gemNum, uint128 randomness) private constant returns(Gem) {
    // use lower 16 bits to determine gem color
    uint8 colorId = __colorId(uint16(randomness));

    // use next 16 bits to determine grade value
    uint24 gradeValue = __gradeValue(uint48(randomness >> 16));

    // use next 32 bits to determine grade type
    uint8 gradeType = __gradeType(uint32(randomness >> 64));

    // create a gem and return
    return Gem(plotId, depth, gemNum, colorId, 1, gradeType, gradeValue);
  }

  // determines color ID randomly
  function __colorId(uint16 randomness) private constant returns (uint8) {
    // pick random color from array of available colors
    return colors[Random.__rndVal(randomness, 0xFFFF, 0, colors.length)];
  }

  // determines grade value randomly
  function __gradeValue(uint48 randomness) private pure returns (uint24) {
    // normalize 0x1000000000000 random range into 1000000
    return uint24(Random.__rndVal(randomness, 0xFFFFFFFFFFFF, 0, GRADE_VALUES));
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

  // enforce at least one gem of level `levelId`
  function __enforceLevelConstraint(Gem[] gems, uint8 levelId, uint16 randomness) private pure {
    // n must not be greater then number of gems in the array
    require(gems.length > 0);

    // generate a random index in range [0, length - n) to rewrite color
    uint8 index = uint8(Random.__rndVal(randomness, 0xFFFF, 0, gems.length - 1)); // use low 16 bits

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
      uint8 index = uint8(Random.__rndVal(randomness, 0xFFFF, 0, gems.length - 1)); // use low 16 bits

      // rewrite the grade type in the gems array - set the new grade type
      gems[index].gradeType = gradeType;
    }
  }

}

