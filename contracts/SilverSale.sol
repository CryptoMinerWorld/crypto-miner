pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./GoldERC20.sol";
import "./SilverERC20.sol";
import "./RefPointsTracker.sol";
import "./Random.sol";

/**
 * @title Silver Box Sale
 *
 * @notice Silver Box Sale is responsible for selling Silver and Gold ERC20
 *      tokens to the players
 *
 * @notice The sale already took place from 02/21/2019 @ 6:00pm UTC (unix 1550772000)
 *      till 03/13/2019 @ 6:00pm UTC (unix 1552500000) and this smart contract
 *      is designed to sell all the boxes which were not sold in the original version.
 *      This version is required to start in already finished state when the price
 *      doesn't increase over time.
 *
 * @notice Sale prices are not fixed and increase over time:
 *      the price goes up by 1.25% every 24 hours
 *
 * @notice The sale happens in an open time frame with a strict start
 *      but no strict end, it is impossible to buy a box before the sale starts
 *
 * @notice Sale lasts for 20 days (480 hours). During this time the price decreases.
 *
 * @notice Sell mechanism is implemented through the loot box mechanism:
 *      there are three kinds of boxes which can be bought:
 *        1. Silver Box
 *        2. Rotund Silver Box
 *        3. Goldish Silver Box
 * @notice Silver Box contains only silver, amount of silver in the box
 *      is randomized and varies in a range from 20 to 30 pieces
 * @notice Silver Box initial price is 0.096 ETH, final price is 0.12 ETH
 *
 * @notice Rotund Silver Box contains only silver, amount of silver in the box
 *      is randomized and varies in a range from 70 to 90 pieces
 * @notice Rotund Silver Box initial price is 0.32 ETH, final price is 0.4 ETH
 *
 * @notice Goldish Silver Box contains 100-200 pieces of silver,
 *      and in contrast to the silver box, it may also contain one gold piece
 * @notice Goldish Silver Box initial price is 0.76ETH, final price is 0.95 ETH
 *
 * @notice The chance of getting gold piece in Goldish Silver Box is 42%
 * @notice Goldish Silver Box with a piece of gold in it contains 100-120 pieces of silver,
 *      while the box without gold piece contains 150-200 pieces of silver
 *
 * @dev Sale start timestamp (offset) and sale duration (length) are set in
 *      the smart contract on deployment
 * @dev Sale is active during the time frame [offset, offset + length),
 *      where `offset` is a unix timestamp of the sale start and `length`
 *      is length of the sale in seconds
 * @dev Silver Sale acts as `ROLE_TOKEN_CREATOR` for both
 *    Silver (SilverERC20) and Gold (GoldERC20) ERC20 tokens
 * @dev All the random distributions used in sale are uniform
 *
 * @author Basil Gorin
 */
contract SilverSale is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant SALE_VERSION = 0xf935bcd014f6db926a4e57d87b63fda90a2719834f554e160b68818403b5da87;

  /**
   * @dev Expected version (UID) of the deployed RefPointsTracker instance
   *      this smart contract is designed to work with
   */
  uint256 public constant REF_TRACKER_UID_REQUIRED = 0xe2e757604d700ca3a2a49e36a752c3974a10fd4fea31f1fe3ee944eaa535513c;

  /**
   * @dev Expected version (UID) of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant SILVER_UID_REQUIRED = 0xd2ed13751444fdd75b1916ee718753f38af6537fca083868a151de23e07751af;

  /**
   * @dev Expected version (UID) of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GOLD_UID_REQUIRED = 0xfaa04f5eafa80e0f8b560c49d4dffb3ca7e34fd289606af21700ba5685db87bc;


  /**
   * @notice Enables the silver / gold sale
   * @dev Feature FEATURE_SALE_ENABLED must be enabled to
   *      call the `buy()` and `bulkBuy()` functions
   */
  uint32 public constant FEATURE_SALE_ENABLED = 0x00000001;

  /**
   * @notice Enables getting silver / gold for referral points
   * @dev Feature FEATURE_GET_ENABLED must be enabled to
   *      call the `get()` and `bulkGet()` functions
   */
  uint32 public constant FEATURE_GET_ENABLED = 0x00000002;

  /**
   * @notice Duration of the sale.
   *      Sale price reaches its maximum when the sale ends.
   *      Buying silver/gold is still possible after the sale ends.
   * @dev Sale end date is determined as offset + LENGTH
   */
  uint32 public constant LENGTH = 20 days;

  /**
   * @notice Price increase time interval: price increases every 24 hours
   * @dev This constant is used as `dt` in `linearStepwise` auxiliary function
   */
  uint32 public constant PRICE_INCREASE_EVERY = 1 days;

  /**
   * @notice Defines Silver Box type to be used
   *      when buying boxes or estimating box price
   */
  //uint8 public constant BOX_TYPE_SILVER = 0;

  /**
   * @notice Defines Rotund Silver Box type to be used
   *      when buying boxes or estimating box price
   */
  //uint8 public constant BOX_TYPE_ROTUND_SILVER = 1;

  /**
   * @notice Defines Goldish Silver Box type to be used
   *      when buying boxes or estimating box price
   * @dev Internally it is also used to denote Goldish Silver Box
   *      without gold
   */
  uint8 public constant BOX_TYPE_GOLDISH_SILVER = 2;

  /**
   * @dev Used internally only to denote Goldish Silver Box
   *      with one piece of gold
   */
  //uint8 public constant BOX_TYPE_GOLDISH_SILVER_1 = 3;

  /**
   * @dev Chances of getting one piece of gold in
   *      Goldish Silver Box, percent
   */
  uint8 public constant GOLD_PROBABILITY = 42; // 42%

  /**
   * @dev Number of box types defined in smart contract (3)
   */
  //uint8 public constant BOX_TYPES = 3;

  /**
   * @dev Minimum amounts of silver each box type can have:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box (without gold)
   *      [3] - Goldish Silver Box (with gold)
   */
  uint8[] public SILVER_MIN = [20, 70, 150, 100];

  /**
   * @dev Maximum amounts of silver each box type can have:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box (without gold)
   *      [3] - Goldish Silver Box (with gold)
   */
  uint8[] public SILVER_MAX = [30, 90, 200, 120];

  /**
   * @dev Initial prices of the boxes by type:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box
   */
  uint64[] public INITIAL_PRICES = [96 finney, 320 finney, 760 finney];

  /**
   * @dev Final prices of the boxes by type:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box
   */
  uint64[] public FINAL_PRICES  = [120 finney, 400 finney, 950 finney];

  /**
   * @dev Referral prices of the boxes by type:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box
   * @dev For example, if referred player buys 20 Silver Boxes
   *      he gains 20 points (see `REF_POINTS`) and can get
   *      one additional Silver Box for free (using points)
   */
  uint8[] public REF_PRICES = [20, 80, 200];

  /**
   * @dev How many referral points are issued to the referred player
   *      for one box of each type
   * @dev The referring address gets twice bigger amount of points
   */
  uint8[] public REF_POINTS = [1, 4, 10];

  /**
   * @dev Number of boxes of each type available for sale
   */
  uint16[] public BOXES_TO_SELL = [500, 300, 150];

  /**
   * @dev Number of boxes of each type already sold
   */
  // TODO: this should be updated to be equal to current mainnet version
  uint16[] public boxesSold = [0, 0, 0];

  /**
   * @dev RefPointsTracker deployed instance to issue referral points to
   *      and to consume referral points from
   */
  RefPointsTracker public refPointsTracker;

  /**
   * @dev SilverERC20 deployed instance to mint silver
   */
  SilverERC20 public silverInstance;

  /**
   * @dev GoldERC20 deployed instance to mint gold
   */
  GoldERC20 public goldInstance;

  /**
   * @notice An address to send 5% of the incoming funds
   */
  address payable public chest;

  /**
   * @notice An address to send 95% of the incoming funds
   */
  address payable public beneficiary;

  /**
   * @notice Sale start date, buying silver/gold boxes is not possible
   *      before the sale begins
   * @dev Sale start date is stored as a unix timestamp
   * @dev Sale is active during the time frame: [offset, offset + LENGTH)
   */
  uint32 public offset;

  /**
   * @dev Fired in buy(), bulkBuy(), get() and bulkGet()
   * @param by address which sent the transaction, spent some value
   *      and got some silver or/and gold in return
   * @param silver amount of silver obtained
   * @param gold amount of gold obtained (zero or one)
   */
  event Unboxed(address indexed by, uint32 silver, uint24 gold);

  /**
   * @dev Fired in buy(), bulkBuy(), get() and bulkGet()
   * @param state packed sale state structure as in `getState()`
   */
  event SaleStateChanged(uint192[] state);

  /**
   * @dev Creates a Silver/Gold Sale instance, binding it to
   *      referral points tracker, chest, beneficiary,
   *      silver (ERC20 token) and gold (ERC20 token) instances specified
   * @param _silver address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_TOKEN_VERSION_REQUIRED`
   * @param _gold address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_TOKEN_VERSION_REQUIRED`
   * @param _ref address of the deployed RefPointsTracker instance with
   *      the `TRACKER_VERSION` equal to `REF_POINTS_TRACKER_VERSION_REQUIRED`
   * @param _chest an address to send 5% of incoming funds to
   * @param _beneficiary an address to send 95% of incoming funds to
   * @param _offset sale start date as a unix timestamp, the sale lasts
   *      from `offset` (inclusive) to `offset + LENGTH` (exclusive)
   */
  constructor(
    address _silver,
    address _gold,
    address _ref,
    address payable _chest,
    address payable _beneficiary,
    uint32 _offset
  ) public {
    // verify the inputs: mistakes in addresses
    require(_silver != address(0));
    require(_gold != address(0));
    require(_ref != address(0));
    require(_chest != address(0));
    require(_beneficiary != address(0));

    // bind smart contract instances
    silverInstance = SilverERC20(_silver);
    goldInstance = GoldERC20(_gold);
    refPointsTracker = RefPointsTracker(_ref);

    // verify smart contract versions
    require(silverInstance.TOKEN_UID() == SILVER_UID_REQUIRED);
    require(goldInstance.TOKEN_UID() == GOLD_UID_REQUIRED);
    require(refPointsTracker.TRACKER_UID() == REF_TRACKER_UID_REQUIRED);

    // set up chest vault, beneficiary and sale start
    chest = _chest;
    beneficiary = _beneficiary;
    offset = _offset;

    // this sale has already ended on 03/13/2019 @ 6:00pm UTC (unix 1552500000)
    // no need to verify we do not deploy the sale which already ended
    // require(saleEndsIn() > 0);
  }

  /**
   * @notice Provides a convenient way to get sale related information
   *      in a single function call
   * @dev Constructs an array, containing info for each box type:
   *      * Header (8 bits), containing:
   *          one - if an element contains box-specific info
   *          two - if an element contains general sale info
   *      For box-specific elements following box-specific information is packed:
   *        * Box Type ID (8 bits), containing:
   *            [0] - Silver Box
   *            [1] - Rotund Silver Box
   *            [2] - Goldish Silver Box
   *        * Boxes Available (16 bits), initially equal to `BOXES_TO_SELL`,
   *            and going down to zero as sale progresses
   *        * Boxes Sold (16 bits), initially zero and going up to,
   *            `BOXES_TO_SELL` as sale progresses, may exceed `BOXES_TO_SELL`
   *        * Boxes Initially Available (16 bits), equal to `BOXES_TO_SELL`
   *        * Current Box Price (64 bits), initially equal to `INITIAL_PRICES`
   *            and going up as sale progresses to `FINAL_PRICES`
   *        * Next Box Price (64 bits), initially equal to `INITIAL_PRICES`
   *            and going up as sale progresses to `FINAL_PRICES`
   *      For general sale info element following information is packed:
   *        * Sparse Space, zeros, (24 bits)
   *        * Sale Start, unix timestamp (32 bits)
   *        * Sale End, unix timestamp (32 bits)
   *        * Current Time, unix timestamp (32 bits)
   *        * Next Price Increase Time, unix timestamp (32 bits)
   *        * Price Increase In, seconds (32 bits)
   * @return sale state as an array of packed data structures
   */
  function getState() public view returns(uint192[] memory) {
    // save number of box types into local variable for convenience
    uint8 n = boxTypesNum();

    // create in-memory an array container to store the result
    uint192[] memory result = new uint192[](n + 1);

    // first add all boxes-specific info into resulting array
    // iterate over all the box types
    for(uint8 i = 0; i < n; i++) {
      // and pack all corresponding info to the box type `i`
      result[i] = uint192(0x01) << 184              // header - one (8 bits)
                | uint184(i) << 176                 // box type: 0, 1, 2 (8 bits)
                | uint176(boxesAvailable(i)) << 160 // boxes available on sale (16 bits)
                | uint160(boxesSold[i]) << 144      // boxes already sold (16 bits)
                | uint144(BOXES_TO_SELL[i]) << 128  // boxes initially available (16 bits)
                | uint128(getBoxPrice(i)) << 64     // current box price (64 bits)
                | getNextPrice(i);                  // next price (64 bits)
    }

    // now add all general sale info into the last element of the array
    result[n]   = uint192(0x02000000) << 160        // header - two (8 bits)
                // sparse 24 bits
                | uint160(offset) << 128            // sale start (32 bits)
                | uint128(saleEndTime()) << 96      // sale end (32 bits)
                | uint96(now) << 64                 // current time (32 bits)
                | uint64(nextPriceIncrease()) << 32 // next price increase time (32 bits)
                | priceIncreaseIn();                // price increase in (32 bits)

    // return the result
    return result;
  }

  /**
   * @notice Number of different box types available on sale (3):
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box
   * @dev Deduces number of box types from `BOXES_TO_SELL` array
   * @return number of different box types available on sale
   */
  function boxTypesNum() public view returns(uint8) {
    // deduce number of box types from `BOXES_TO_SELL`
    // array and return the result
    return uint8(BOXES_TO_SELL.length);
  }

  /**
   * @notice Calculates boxes available on sale
   * @dev For a given box type determines amount of boxes available
   *      on sale based on initial `BOXES_TO_SELL` value and
   *      current amount of boxes sold `boxesSold` value
   * @dev If boxes sold exceeds initially available amount - returns zero
   * @param boxType type of the box to calculate ref points for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @return amount of boxes available on sale
   */
  function boxesAvailable(uint8 boxType) public view returns(uint16) {
    // return difference between `BOXES_TO_SELL` and `boxesSold` safely,
    // checking possible arithmetic overflow first
    return boxesSold[boxType] > BOXES_TO_SELL[boxType]? 0: BOXES_TO_SELL[boxType] - boxesSold[boxType];
  }

  /**
   * @dev Convenient way to get information on all the boxes available
   *      in a single function call
   * @return an array of available boxes quantities by type
   */
  function boxesAvailableArray() public view returns(uint16[] memory) {
    // save number of box types into local variable for convenience
    uint8 n = boxTypesNum();

    // since there is no required array prepared already, create one
    uint16[] memory result = new uint16[](n);

    // iterate over each box type
    for(uint8 i = 0; i < n; i++) {
      // and fill in the available data based on calculation in `boxesAvailable`
      result[i] = boxesAvailable(i);
    }

    // return resulting array from memory
    return result;
  }

  /**
   * @dev Convenient way to get information on all the boxes sold
   *      in a single function call
   * @return an array of sold boxes quantities by type
   */
  function boxesSoldArray() public view returns(uint16[] memory) {
    // just return internal contract array
    return boxesSold;
  }

  /**
   * @dev Convenient way to get referral points, silver and gold balances
   *      of a particular address
   * @param owner an address to query balances for
   * @return tuple of three elements, containing balances for a given address:
   *      1. number of available referral points
   *      2. amount of silver tokens on the balance
   *      3. amount of gold tokens on the balance
   */
  function balanceOf(address owner) public view returns(uint256, uint256, uint256) {
    // delegate call to `balanceOf` in RefPointsTracker
    // to obtain number of available referral points
    uint256 points = refPointsTracker.balanceOf(owner);

    // delegate call to `balanceOf` in SilverERC20
    // to obtain amount of silver tokens on the balance
    uint256 silver = silverInstance.balanceOf(owner);

    // delegate call to `balanceOf` in GoldERC20
    // to obtain amount of gold tokens on the balance
    uint256 gold = goldInstance.balanceOf(owner);

    // return balances obtained as a tuple
    return (points, silver, gold);
  }

  /**
   * @notice Calculates how many referral points is needed to get
   *      few boxes of the type (Silver, Rotund Silver or Goldish Silver)
   *      and quantity specified
   * @dev Throws if the box type specified is invalid
   * @dev Throws if quantity (amount of boxes) is zero
   * @param boxType type of the box to calculate ref points for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes of that type
   * @return amount of referral points required to get the boxes requested
   */
  function getBoxesPriceRef(uint8 boxType, uint16 quantity) public view returns(uint24) {
    // verify quantity is not zero
    require(quantity != 0);

    // multiply ref price of a single box by the quantity and return
    return uint24(quantity) * REF_PRICES[boxType];
  }

  /**
   * @notice Calculates how many referral points is needed to get
   *      different boxes of different types (Silver, Rotund Silver
   *      or Goldish Silver) and quantities specified
   * @dev Throws if input arrays have different length
   * @dev Throws if any of the input arrays are empty
   * @dev Throws if input arrays size is bigger than three (3)
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is zero
   * @param boxTypes array of box to calculate ref points for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities array of amounts of boxes for each of corresponding types
   * @return amount of referral points required to get the boxes requested
   */
  function bulkPriceRef(uint8[] memory boxTypes, uint16[] memory quantities) public view returns(uint32) {
    // verify input arrays have same lengths
    require(boxTypes.length == quantities.length);

    // verify input arrays contain some data (non-zero length)
    require(boxTypes.length != 0);

    // verify input arrays are not too big in length
    require(boxTypes.length <= REF_PRICES.length);

    // define variable to accumulate the ref price
    uint32 refPrice = 0;

    // iterate over arrays
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // and increase the ref price for pair `i`
      refPrice += getBoxesPriceRef(boxTypes[i], quantities[i]);
    }

    // return accumulated price
    return refPrice;
  }

  /**
   * @notice Buys several boxes of a single type
   *      (Silver, Rotund Silver, Goldish Silver)
   * @dev Throws if box type is invalid
   * @dev Throws if quantity is invalid (zero)
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxType box type, must be one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes to buy
   */
  function buy(uint8 boxType, uint16 quantity) public payable {
    // delegate call to `buyRef` setting `referrer` to zero
    buyRef(boxType, quantity, address(0));
  }

  /**
   * @notice Buys several boxes of a single type
   *      (Silver, Rotund Silver, Goldish Silver) and allows
   *      to specify a referrer address of the existing buyer
   * @notice If referrer address is correct (specifies existing buyer)
   *      and if new buyer is indeed new one (is not an existing buyer)
   *      then both referrer and referred will get referral points
   * @dev Throws if box type is invalid
   * @dev Throws if quantity is invalid (zero)
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxType box type, must be one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes to buy
   * @param referrer [optional] referrer address of the player
   *      who already bought some silver boxes,
   *      set to zero to specify no referral
   */
  function buyRef(uint8 boxType, uint16 quantity, address referrer) public payable {
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price
    uint256 price = getBoxesPrice(boxType, quantity);

    // verify there is enough value in the message to buy boxes
    require(msg.value >= price);

    // perform hard cap validations and update boxes sold counter
    // delegate call to `__updateBoxesSold`
    __updateBoxesSold(boxType, quantity);

    // to assign tuple return value from `unbox`
    // we need to define the variables first
    // maximum value of silver is 255 * 200 = 51000,
    // which fits into uint16
    uint24 silver;
    uint16 gold;

    // evaluate cumulative silver and gold values for all the boxes
    (silver, gold) = unbox(boxType, quantity);

    // if referrer address was specified
    if(referrer != address(0)) {
      // calculate how many referral points to issue
      uint16 refPoints = __calcRefPoints(boxType, quantity);

      // issue referral points if applicable - delegate call to `__issueRefPoints`
      __issueRefPoints(refPoints, referrer);
    }

    // delegate call to `__mint` to perform token minting,
    // chest and beneficiary funds transfer, change transfer back to sender
    __mint(price, 0, silver, gold);
  }

  /**
   * @notice Gets several boxes of a single type
   *      (Silver, Rotund Silver, Goldish Silver)
   *      by spending referral points
   * @dev Throws if box type is invalid
   * @dev Throws if quantity is invalid (zero)
   * @dev Throws if sender has not enough referral points
   *      to get the boxes requested, see `REF_PRICES`
   * @param boxType box type, must be one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes to buy
   */
  function get(uint8 boxType, uint16 quantity) public {
    // verify that get feature is enabled
    require(isFeatureEnabled(FEATURE_GET_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price in referral points
    uint24 refs = getBoxesPriceRef(boxType, quantity);

    // verify sender (player) has enough points to spend
    require(refPointsTracker.balanceOf(msg.sender) >= refs);

    // perform hard cap validations and update boxes sold counter
    // delegate call to `__updateBoxesSold`
    __updateBoxesSold(boxType, quantity);

    // to assign tuple return value from `unbox`
    // we need to define the variables first
    // maximum value of silver is 255 * 200 = 51000,
    // which fits into uint16
    uint24 silver;
    uint16 gold;

    // evaluate cumulative silver and gold values for all the boxes
    (silver, gold) = unbox(boxType, quantity);

    // delegate call to `__mint` to perform actual token minting,
    // specifying "referral spending mode"
    __mint(0, refs, silver, gold);
  }

  /**
   * @notice Buys boxes of different types in single transaction
   *      (Silver, Rotund Silver, Goldish Silver)
   * @dev Throws if input arrays have different length
   * @dev Throws if any of the input arrays are empty
   * @dev Throws if input arrays size is bigger than three (3)
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is zero
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxTypes an array of box types, each box type is one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities an array of amounts of boxes for each
   *      corresponding type to buy
   */
  function bulkBuy(uint8[] memory boxTypes, uint16[] memory quantities) public payable {
    // delegate call to `bulkBuyRef` setting `referral` to zero
    bulkBuyRef(boxTypes, quantities, address(0));
  }

  /**
   * @notice Buys boxes of different types in single transaction
   *      (Silver, Rotund Silver, Goldish Silver) and allows
   *      specify a referrer address of the existing buyer
   * @notice If referrer address is correct (specifies existing buyer)
   *      and if new buyer is indeed new one (is not an existing buyer)
   *      then both referrer and referred will get referral points
   * @dev Throws if input arrays have different length
   * @dev Throws if any of the input arrays are empty
   * @dev Throws if input arrays size is bigger than three (3)
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is zero
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxTypes an array of box types, each box type is one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities an array of amounts of boxes for each
   *      corresponding type to buy
   * @param referrer [optional] referral address of the player
   *      who already bought some silver boxes,
   *      set to zero to specify no referral
   */
  function bulkBuyRef(uint8[] memory boxTypes, uint16[] memory quantities, address referrer) public payable {
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price
    // it also validates the input arrays lengths
    uint256 price = bulkPrice(boxTypes, quantities);

    // verify there is enough value in the message to buy boxes
    require(msg.value >= price);

    // for each type of the box requested
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // perform hard cap validations and update boxes sold counter
      // delegate call to `__updateBoxesSold`
      __updateBoxesSold(boxTypes[i], quantities[i]);
    }

    // define variables to accumulate silver and gold counters
    // maximum value of silver is 3 * 255 * 200 = 153000,
    // which doesn't fit into uint16
    uint32 silver;
    uint24 gold;

    // evaluate total cumulative silver and gold values for all the boxes
    (silver, gold) = bulkUnbox(boxTypes, quantities);

    // if referrer address was specified
    if(referrer != address(0)) {
      // calculate how many referral points to issue
      uint32 refPoints = __bulkCalcRefPoints(boxTypes, quantities);

      // issue referral points if applicable - delegate call to `__issueRefPoints`
      __issueRefPoints(refPoints, referrer);
    }

    // delegate call to `__mint` to perform token minting,
    // chest and beneficiary funds transfer, change transfer back to sender
    __mint(price, 0, silver, gold);
  }

  /**
   * @notice Gets boxes of different types in single transaction
   *      (Silver, Rotund Silver, Goldish Silver)
   *      by spending referral points
   * @dev Throws if input arrays have different length
   * @dev Throws if any of the input arrays are empty
   * @dev Throws if input arrays size is bigger than three (3)
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is zero
   * @dev Throws if sender has not enough referral points
   *      to get the boxes requested, see `REF_PRICES`
   * @param boxTypes an array of box types, each box type is one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities an array of amounts of boxes for each
   *      corresponding type to buy
   */
  function bulkGet(uint8[] memory boxTypes, uint16[] memory quantities) public {
    // verify that get feature is enabled
    require(isFeatureEnabled(FEATURE_GET_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price in referral points
    uint32 refs = bulkPriceRef(boxTypes, quantities);

    // verify sender (player) has enough points to spend
    require(refPointsTracker.balanceOf(msg.sender) >= refs);

    // for each type of the box requested
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // perform hard cap validations and update boxes sold counter
      // delegate call to `__updateBoxesSold`
      __updateBoxesSold(boxTypes[i], quantities[i]);
    }

    // define variables to accumulate silver and gold counters
    // maximum value of silver is 3 * 255 * 200 = 153000,
    // which doesn't fit into uint16
    uint32 silver;
    uint24 gold;

    // evaluate total cumulative silver and gold values for all the boxes
    (silver, gold) = bulkUnbox(boxTypes, quantities);

    // delegate call to `__mint` to perform token minting,
    // specifying "referral spending mode"
    __mint(0, refs, silver, gold);
  }


  /**
   * @dev Auxiliary function to evaluate random amount of silver and gold
   *      in the box of the given type
   * @dev Doesn't modify storage, left public to be easily tested
   *      and verified by third parties for random distribution
   * @param boxType box type to generate amounts for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes of that type to unbox
   * @return tuple containing random silver and gold amounts
   *      for the given box type and amount
   */
  function unbox(uint8 boxType, uint16 quantity) public view returns(uint24 silver, uint16 gold) {
    // delegate call to `__unbox` using zero seed offset
    return __unbox(0, boxType, quantity);
  }

  /**
   * @dev Auxiliary function to evaluate random amount of silver and gold
   *      in the box of the given type
   * @dev Doesn't modify storage, left public to be easily tested
   *      and verified by third parties for random distribution
   * @param seedOffset seed offset to be used for random generation, there
   *      will be `quantity / 8` of seeds used [seedOffset, seedOffset + quantity / 8)
   * @param boxType box type to generate amounts for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes of that type to unbox
   * @return tuple containing random silver and gold amounts
   *      for the given box type and amount
   */
  function __unbox(uint256 seedOffset, uint8 boxType, uint16 quantity) private view returns(uint24 silver, uint16 gold) {
    // `silver` and `gold` counters to store cumulative
    // amounts of silver and gold are already defined in
    // function returns signature, their initial values are zeros

    // variable to store some randomness to work with
    uint256 rnd;

    // each box will be generated randomly
    for(uint16 i = 0; i < quantity; i++) {
      // each 8 iterations starting from iteration 0
      if(i % 8 == 0) {
        // generate new randomness to work with
        rnd = Random.generate256(seedOffset + i / 8);
      }

      // effective box type will depend on random
      // if box contains gold the box type will be adjusted
      uint8 _boxType = boxType;

      // use 16 bits of randomness to extract a uniform random in range [0, 100)
      // there is a 42% chance of getting gold in Goldish Silver Box
      if(boxType == BOX_TYPE_GOLDISH_SILVER && Random.uniform(rnd >> 16 * (i % 8), 16, 100) < GOLD_PROBABILITY) {
        // uniform random in range [0, 100) is lower than 42, we've got gold!
        // increment gold counter
        gold++;

        // update box type to `BOX_TYPE_GOLD_SILVER` box type to be used
        // to access `SILVER_MIN` and `SILVER_MAX` arrays properly (on index 3)
        _boxType++;
      }

      // calculate amount of silver based on box type using next 16 bits of randomness
      // upper bound in `Random.uniform()` is exclusive, add 1 to it
      // to make `SILVER_MAX[boxType]` maximum inclusive
      // and increment silver counter
      silver += SILVER_MIN[_boxType] + uint8(
        Random.uniform(
          rnd >> 16 + 16 * (i % 8),
          16,
          1 + SILVER_MAX[_boxType] - SILVER_MIN[_boxType]
        )
      );
    }

    // return the values calculated
    return (silver, gold);
  }

  /**
   * @dev Auxiliary function to evaluate random amount of silver and gold
   *      in the array of boxes of the given types
   * @dev Doesn't modify storage, left public to be easily tested
   *      and verified by third parties for random distribution
   * @param boxTypes array of box types to generate amounts for, containing:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities array of amounts of boxes of these types to unbox
   * @return tuple containing random silver and gold amounts
   *      for the given box types and amounts
   */
  function bulkUnbox(uint8[] memory boxTypes, uint16[] memory quantities) public view returns(uint32 silver, uint24 gold) {
    // `silver` and `gold` counters to store cumulative
    // amounts of silver and gold are already defined in
    // function returns signature, their initial values are zeros

    // iterate the input arrays and accumulate silver and gold amounts
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // to assign tuple return value from `unbox`
      // we need to define the variables first
      // maximum value of silver is 255 * 200 = 51000,
      // which fits into uint16
      uint24 _silver;
      uint16 _gold;

      // evaluate cumulative random based silver and gold values for all the boxes
      // taking into account the maximum amount of boxes (quantities[i]) is 500,
      // maximum seed offsets to be used in one unboxing is 63
      (_silver, _gold) = __unbox(i * 64, boxTypes[i], quantities[i]);

      // increment bulk cumulative values
      silver += _silver;
      gold += _gold;
    }

    // return the values accumulated
    return (silver, gold);
  }

  /**
   * @notice Calculates time before next price increase
   * @dev Price increases every day (`PRICE_INCREASE_EVERY`)
   * @dev Sale starts on `offset` timestamp and lasts
   *      for `LENGTH + 1` days (21 days)
   * @dev Price increases 20 times during this period,
   *      first price increase happens 24 hours sale starts, and
   *      the last price increase happens 24 hours before sale ends
   * @dev See also `saleEndsIn()`
   * @return number of seconds left before next price increase
   */
  function priceIncreaseIn() public view returns(uint32) {
    // get 32-bit `now`, and yes - it will be affected by year 2039 problem
    uint32 now32 = uint32(now);

    int64 delta = int64(now32) - offset;

    // calculate based on current timestamp and contract settings
    return uint32(PRICE_INCREASE_EVERY - (delta < 0? delta: delta % PRICE_INCREASE_EVERY));
  }

  /**
   * @notice Calculates the next time increase timestamp
   * @dev Price increases every day (`PRICE_INCREASE_EVERY`)
   * @dev Sale starts on `offset` timestamp and lasts
   *      for `LENGTH + 1` days (21 days)
   * @dev Price increases 20 times during this period,
   *      first price increase happens 24 hours sale starts, and
   *      the last price increase happens 24 hours before sale ends
   * @dev See also `priceIncreaseIn()`, `saleEndsIn()`
   * @return next price increase date and time as unix timestamp
   */
  function nextPriceIncrease() public view returns(uint32) {
    // get price increase in value, delegate call to `priceIncreaseIn`,
    // calculate the resulting timestamp and return
    return uint32(now) + priceIncreaseIn();
  }

  /**
   * @notice Calculates time before the sale ends
   * @dev Sale starts on `offset` timestamp and lasts
   *      for `LENGTH + 1` days (21 days)
   * @dev Price increases 20 times during this period,
   *      first price increase happens 24 hours sale starts, and
   *      the last price increase happens 24 hours before sale ends
   * @dev See also `priceIncreaseIn()`
   * @return number of seconds left before sale ends
   */
  function saleEndsIn() public view returns(uint32) {
    // get 32-bit `now`
    uint32 now32 = uint32(now);

    // get sale end unix timestamp
    uint32 saleEnd = saleEndTime();

    // calculate based on current timestamp and contract settings
    return now32 > saleEnd? 0: saleEnd - now32;
  }

  /**
   * @notice Calculates sale end time as unix timestamp
   * @dev Sale goes on for `LENGTH + 1` days from the beginning (`offset`)
   * @return sale end date and time as a unix timestamp
   */
  function saleEndTime() public view returns(uint32) {
    // calculate the result based on `offset`, `LENGTH`,
    // adding one day to the sale length since
    // final price will be active during last day
    // and return
    return offset + LENGTH + 1 days;
  }

  /**
   * @notice Calculates current box price of the type specified
   *      (Silver, Rotund Silver or Goldish Silver)
   * @dev Calculates silver box price based on the initial,
   *      final prices and current timestamp (`now`)
   * @dev Returns initial price if sale didn't start
   * @dev Returns final price if the sale has already ended
   * @dev Throws if the box type specified is invalid
   * @param boxType type of the box to query price for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @return current price (in moment `now`) of the box type requested
   */
  function getBoxPrice(uint8 boxType) public view returns(uint64) {
    // delegate call to `getBoxPriceAt` supplying current timestamp
    return getBoxPriceAt(boxType, uint32(now));
  }

  /**
   * @notice Calculates next box price of the type specified
   *      (Silver, Rotund Silver or Goldish Silver)
   * @dev Calculates silver box price based on the initial,
   *      final prices and timestamp one day ('PRICE_INCREASE_EVERY')
   *      after current (`now`)
   * @dev Returns initial price if sale didn't start
   * @dev Returns final price if the sale has already ended
   * @dev Throws if the box type specified is invalid
   * @param boxType type of the box to query price for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @return next price (in one day (`PRICE_INCREASE_EVERY`) after `now`)
   *      of the box type requested
   */
  function getNextPrice(uint8 boxType) public view returns(uint64) {
    // delegate call to `getBoxPriceAt` specifying timestamp at
    // `PRICE_INCREASE_EVERY` (1 day) in the future from `now`
    return getBoxPriceAt(boxType, uint32(now) + PRICE_INCREASE_EVERY);
  }

  /**
   * @notice Calculates box price of the type specified
   *      (Silver, Rotund Silver or Goldish Silver)
   *      at some given moment
   * @dev Calculates silver box price based on the initial,
   *      final prices and given unix timestamp (`t`)
   * @dev Returns initial price if `t` is before sale starts
   * @dev Returns final price if `t` is after sale ends
   * @dev Throws if the box type specified is invalid
   * @param boxType type of the box to query price for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param t unix timestamp of interest
   * @return current price (in moment `now`) of the box type requested
   */
  function getBoxPriceAt(uint8 boxType, uint32 t) public view returns(uint64) {
    // box type validation will be performed automatically
    // when accessing INITIAL_PRICES and FINAL_PRICES arrays

    // verify time constraints, otherwise the result of `linearStepwise`
    // will be confusing:
    // if sale didn't start yet
    if(t <= offset) {
      // return initial price
      return INITIAL_PRICES[boxType];
    }
    // if sale has already ended
    if(t >= offset + LENGTH) {
      // return final price
      return FINAL_PRICES[boxType];
    }

    // delegate call to `linearStepwise` and return
    return linearStepwise(
      offset,
      INITIAL_PRICES[boxType],
      offset + LENGTH,
      FINAL_PRICES[boxType],
      PRICE_INCREASE_EVERY,
      t
    );
  }

  /**
   * @notice Calculates current prices for all box types
   *      (Silver, Rotund Silver or Goldish Silver)
   * @dev Calculates all the prices based on the initial,
   *      final prices and current timestamp (`now`)
   * @dev Returns initial prices if sale didn't start
   * @dev Returns final prices if the sale has already ended
   * @return an array of current prices (in moment `now`)
   *      for each box type
   */
  function getBoxPrices() public view returns(uint64[] memory) {
    // save number of box types into local variable for convenience
    uint8 n = boxTypesNum();

    // create in-memory array to store box prices for each type
    uint64[] memory prices = new uint64[](n);

    // iterate over box types
    for(uint8 i = 0; i < n; i++) {
      // and set the price of each box by type into resulting array
      prices[i] = getBoxPrice(i);
    }

    // return the result
    return prices;
  }

  /**
   * @notice Calculates current box price of the type
   *      (Silver, Rotund Silver or Goldish Silver) and quantity specified
   * @dev Calculates price of several silver boxes based on the initial,
   *      final prices and current timestamp (`now`)
   * @dev Returns initial price of the boxes if sale didn't start
   * @dev Returns final price of the boxes if the sale has already ended
   * @dev Throws if the box type specified is invalid
   * @dev Throws if quantity (amount of boxes) is zero
   * @param boxType type of the box to query price for:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity amount of boxes of that type
   * @return current price (in moment `now`) of the boxes requested
   */
  function getBoxesPrice(uint8 boxType, uint16 quantity) public view returns(uint256) {
    // verify quantity is not zero
    require(quantity != 0);

    // delegate call to `getBoxPrice` and multiply by `quantity`
    return uint256(quantity) * getBoxPrice(boxType);
  }

  /**
   * @notice Calculates current price of different boxes of different types
   *      (Silver, Rotund Silver or Goldish Silver) and quantities specified
   * @dev Calculates price of different silver boxes based on the initial,
   *      final prices and current timestamp (`now`)
   * @dev Returns initial price of the boxes if sale didn't start
   * @dev Returns final price of the boxes if the sale has already ended
   * @dev Throws if input arrays have different length
   * @dev Throws if any of the input arrays are empty
   * @dev Throws if input arrays size is bigger than three (3)
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is zero
   * @param boxTypes array of box types to query price for, containing:
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities array of amounts of boxes for each of corresponding types
   * @return current price (in moment `now`) of the box type requested
   */
  function bulkPrice(uint8[] memory boxTypes, uint16[] memory quantities) public view returns(uint256) {
    // verify input arrays have same lengths
    require(boxTypes.length == quantities.length);

    // verify input arrays contain some data (non-zero length)
    require(boxTypes.length != 0);

    // verify input arrays are not too big in length
    require(boxTypes.length <= INITIAL_PRICES.length);

    // define variable to accumulate the price
    uint256 price = 0;

    // iterate over arrays
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // and increase the price for pair `i`
      price += getBoxesPrice(boxTypes[i], quantities[i]);
    }

    // return accumulated price
    return price;
  }

  /**
   * @dev Calculates value `v` at the given point in time `t`,
   *      given that the initial value at the moment 't0' is `v0`
   *      and the final value at the moment `t1` is `v1`
   * @dev The value is changed stepwise linearly in time,
   *      step size is defined by `_dt` (seconds)
   * @param t0 initial moment (unix timestamp)
   * @param v0 initial value
   * @param t1 final moment (unix timestamp)
   * @param v1 final value
   * @param dt time step size (seconds)
   * @param t moment of interest (unix timestamp)
   * @return value in the moment of interest `t`
   */
  function linearStepwise(uint32 t0, uint64 v0, uint32 t1, uint64 v1, uint32 dt, uint32 t) public pure returns(uint64 v) {
    /*
     * calculate the result according to formula
     *                      t - t0
     *                   dt ______
     *                        dt
     * v = v0 + (v1 - v0) _________
     *                     t1 - t0
     *
     */
    return uint64(v0 + uint128(t - t0) / dt * dt * (v1 - v0) / (t1 - t0));
  }


  /**
   * @dev Auxiliary function to verify hard cap status and increase
   *      `boxesSold` counter based on box type and quantity
   * @dev Throws if quantity exceeds total initial amount of boxes on sale
   * @dev Throws if quantity exceeds 10% of total initial amount of boxes
   *      on sale if hard cap is already reached
   */
  function __updateBoxesSold(uint8 boxType, uint16 quantity) private {
    // verify there is enough boxes of the requested type on sale (hard cap)
    // hard cap is removed in smart contract, will be presented in UI only
    // require(boxesSold[boxType] + quantity <= BOXES_TO_SELL[boxType]);

    // however, to protect from unnoticed unlimited sale, we still
    // limit the quantity not to exceed 10% of hard cap in case
    // when it is already reached
    require(
      // in any case we limit maximum buying amount not to exceed the hard cap
      quantity <= BOXES_TO_SELL[boxType] && boxesSold[boxType] < BOXES_TO_SELL[boxType]
      // if it is reached we allow transactions not exceeding 10% of hard cap
      || quantity <= BOXES_TO_SELL[boxType] / 10
    );

    // update sold boxes counter
    boxesSold[boxType] += quantity;
  }

  /**
   * @dev Auxiliary function to perform silver and gold minting,
   *      value transfer to chest and  beneficiary and change back to sender
   *      or/and referral points consuming from the balance of the sender
   * @dev Unsafe, internal use only, must be kept private at all times
   * @param price amount of ETH to be transferred from player (transaction sender)
   *      to beneficiary and chest accounts
   * @param refs amount of referral points to consume
   * @param silver amount of silver to be minted to player, cannot be zero
   * @param gold amount of gold to be minted to player, can be zero
   */
  function __mint(uint256 price, uint32 refs, uint32 silver, uint24 gold) private {
    // call sender gracefully - player
    address payable player = msg.sender;

    // any box contains silver, no need to check if silver
    // is not zero – just mint silver required
    silverInstance.mint(player, silver);

    // box may not contain gold, check if it does
    if(gold != 0) {
      // mint gold required
      goldInstance.mint(player, gold);
    }

    // if price is not zero (if this is not referral points spending)
    if(price != 0) {
      // calculate the change to send back to player
      uint256 change = msg.value - price;

      // transfer 5% to the chest vault
      // no need to care about rounding since division by 20
      // doesn't produce continued fractions
      chest.transfer(price / 20);

      // transfer 95% to the beneficiary
      // no need to care about rounding since division by 20
      // doesn't produce continued fractions
      beneficiary.transfer(price * 19 / 20);

      // if sender sent more than value required
      if(change > 0) {
        // transfer the change back to sender
        player.transfer(change);
      }
    }

    // if refs is not zero (if this is referral points spending)
    if(refs != 0) {
      // consume referral points from the player
      refPointsTracker.consumeFrom(player, refs);
    }

    // player (sender) becomes known to the ref points tracker
    refPointsTracker.addKnownAddress(player);

    // emit an player specific unbox event
    emit Unboxed(player, silver, gold);

    // emit general purpose sale state changed event
    emit SaleStateChanged(getState());
  }

  /**
   * @dev Auxiliary function to issue referral points both to
   *      referral and player (transaction sender)
   * @dev Unsafe, doesn't perform caller validations, must be kept private
   * @param refPoints how many referral points to issue (to each of the parties)
   * @param referrer referral address specified by the player
   */
  function __issueRefPoints(uint32 refPoints, address referrer) private {
    // call sender gracefully – referred
    address referred = msg.sender;

    // verify that referrer address specified is known to ref points tracker
    // and that the sender address (player) is not known to ref points tracker
    // it also ensures that referrer is not referred
    if(refPointsTracker.isKnown(referrer) && !refPointsTracker.isKnown(referred)) {
      // referral conditions are met, both addresses earn referral points
      // issue referral points to referrer
      refPointsTracker.issueTo(referrer, 2 * refPoints);

      // issue referral points to referred player
      refPointsTracker.issueTo(referred, refPoints);
    }
  }

  /**
   * @dev Calculates the referral points the referred player gets based on
   *      the box type and quantity of the boxes he buys
   * @dev Unsafe, doesn't check data consistency, must be kept private
   * @param boxType type of the box the player (transaction sender) buys
   * @param quantity amount of boxes of that type a buyer buys
   * @return an amount of referral points to issue to referred player
   */
  function __calcRefPoints(uint8 boxType, uint16 quantity) private view returns(uint16) {
    // read the ref points data, apply quantity and return
    return REF_POINTS[boxType] * quantity;
  }

  /**
   * @dev Calculates the referral points the referred player gets based on
   *      the box types and quantities of the boxes he buys
   * @dev Unsafe, doesn't check data consistency, must be kept private
   * @param boxTypes array of box types the player (transaction sender) buys
   * @param quantities array of amounts of boxes of corresponding types
   * @return an amount of referral points to issue to referred player
   */
  function __bulkCalcRefPoints(uint8[] memory boxTypes, uint16[] memory quantities) private view returns(uint32) {
    // variable to accumulate ref points for each of the box types
    uint32 refPoints = 0;

    // iterate over all the box types and quantities
    for(uint8 i = 0; i < boxTypes.length; i++) {
      // and accumulate the ref points value (delegate call to `__calcRefPoints`)
      refPoints += __calcRefPoints(boxTypes[i], quantities[i]);
    }

    // return the accumulated value
    return refPoints;
  }

}
