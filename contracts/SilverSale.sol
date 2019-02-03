pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./GoldERC20.sol";
import "./SilverERC20.sol";
import "./Random.sol";

/**
 * @title Silver Box Sale
 *
 * @notice Silver Box Sale is responsible for selling Silver and Gold ERC20
 *      tokens to the players
 *
 * @notice Sale prices are not fixed and increase over time:
 *      the price goes up by 1.25% every 24 hours
 *
 * @notice The sale happens in strict time frame, it is impossible to buy a
 *      box before the sale starts and after it ends
 *
 * @notice Sale lasts for 20 days (480 hours)
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
contract SilverSale is AccessControlLight {
  /**
   * @dev Smart contract version
   * @dev Should be incremented manually in this source code
   *      each time smart contact source code is changed and deployed
   * @dev To distinguish from other sale must be multiple of 0x10
   */
  uint32 public constant SALE_VERSION = 0x10;

  /**
   * @dev Expected version of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant SILVER_TOKEN_VERSION_REQUIRED = 0x10;

  /**
   * @dev Expected version of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant GOLD_TOKEN_VERSION_REQUIRED = 0x100;

  /**
   * @notice Enables the silver / gold sale
   * @dev Feature FEATURE_SALE_ENABLED must be enabled to
   *      call the `buy()` and `bulkBuy()` functions
   */
  uint32 public constant FEATURE_SALE_ENABLED = 0x00000001;

  /**
   * @notice Duration of the sale;
   *      buying silver/gold is not possible after the sale ends
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
   * @dev Number of boxes of each type available for sale
   */
  uint16[] public BOXES_TO_SELL = [500, 300, 150];

  /**
   * @dev Number of boxes of each type already sold
   */
  uint16[] public boxesSold = [0, 0, 0];

  /**
   * @notice Sale start date, buying silver/gold boxes is not possible
   *      before the sale begins
   * @dev Sale start date is stored as a unix timestamp
   * @dev Sale is active during the time frame: [offset, offset + LENGTH)
   */
  uint32 public offset;

  /**
   * @dev GoldERC20 deployed instance to consume silver from, silver of that instance
   *      may be consumed (burnt) from a player in order to level up a gem
   */
  SilverERC20 public silverInstance;

  /**
   * @dev GoldERC20 deployed instance to consume gold from, gold of that instance
   *      may be consumed (burnt) from a player in order to upgrade a gem
   */
  GoldERC20 public goldInstance;

  /**
   * @notice An address to send 5% of the incoming funds
   */
  address public chest;

  /**
   * @notice An address to send 95% of the incoming funds
   */
  address public beneficiary;

  /**
   * @dev Fired in buy() and bulkBuy()
   * @param by address which sent the transaction, spent some value
   *      and got some silver or/and gold in return
   * @param silver amount of silver obtained
   * @param gold amount of gold obtained (zero or one)
   */
  event Unboxed(address indexed by, uint32 silver, uint24 gold);

  /**
   * @dev Creates a Silver/Gold Sale instance, binding it to
   *      silver (ERC20 token) and gold (ERC20 token) instances specified
   * @param _silver address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_TOKEN_VERSION_REQUIRED`
   * @param _gold address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_TOKEN_VERSION_REQUIRED`
   * @param _chest an address to send 5% of incoming funds to
   * @param _beneficiary an address to send 95% of incoming funds to
   * @param _offset sale start date as a unix timestamp, the sale lasts
   *      from `offset` (inclusive) to `offset + LENGTH` (exclusive)
   */
  constructor(address _silver, address _gold, address _chest, address _beneficiary, uint32 _offset) public {
    // verify the inputs: mistakes in addresses
    require(_silver != address(0));
    require(_gold != address(0));
    require(_chest != address(0));
    require(_beneficiary != address(0));

    // verify we do not deploy already ended sale
    // adding one day to the sale length since
    // final price will be active during last day
    require(_offset + LENGTH + 1 days > now);

    // bind smart contract instances
    silverInstance = SilverERC20(_silver);
    goldInstance = GoldERC20(_gold);

    // verify smart contract versions
    require(silverInstance.TOKEN_VERSION() == SILVER_TOKEN_VERSION_REQUIRED);
    require(goldInstance.TOKEN_VERSION() == GOLD_TOKEN_VERSION_REQUIRED);

    // set up chest vault, beneficiary and sale start
    chest = _chest;
    beneficiary = _beneficiary;
    offset = _offset;
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
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price
    uint256 price = getBoxesPrice(boxType, quantity);

    // verify there is enough value in the message to buy the box
    require(msg.value >= price);

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

    // to assign tuple return value from `unbox`
    // we need to define the variables first
    // maximum value of silver is 255 * 200 = 51000,
    // which fits into uint16
    uint24 silver;
    uint16 gold;

    // evaluate cumulative silver and gold values for all the boxes
    (silver, gold) = unbox(boxType, quantity);

    // delegate call to `__mint` to perform actual token minting
    // beneficiary funds transfer and change transfer back to sender
    __mint(price, silver, gold);
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
  function bulkBuy(uint8[] boxTypes, uint16[] quantities) public payable {
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

    // verify that the sale has already started
    require(now >= offset);

    // determine box price
    // it also validates the input arrays lengths
    uint256 price = bulkPrice(boxTypes, quantities);

    // define variables to accumulate silver and gold counters
    // maximum value of silver is 3 * 255 * 200 = 153000,
    // which doesn't fit into uint16
    uint32 silver;
    uint24 gold;

    // evaluate total cumulative silver and gold values for all the boxes
    (silver, gold) = bulkUnbox(boxTypes, quantities);

    // delegate call to `__mint` to perform token minting
    __mint(price, silver, gold);
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
  function unbox(uint8 boxType, uint16 quantity) public constant returns(uint24 silver, uint16 gold) {
    // `silver` and `gold` counters to store cumulative
    // amounts of silver and gold are already defined in
    // function returns signature, their initial values are zeros

    // each box will be generated randomly
    for(uint16 i = 0; i < quantity; i++) {
      // generate some random number based on the given seed
      uint256 rnd = Random.__rawRandom(i);

      // effective box type will depend on random
      // if box contains gold the box type will be adjusted
      uint8 _boxType = boxType;

      // use 32 bits of random to extract a uniform random in range [0, 100)
      // there is a 42% chance of getting gold in Goldish Silver Box
      if(boxType == BOX_TYPE_GOLDISH_SILVER && Random.__rndVal(rnd, 0xFFFFFFFFFFFFFFFF, 0, 100) < GOLD_PROBABILITY) {
        // uniform random in range [0, 100) is lower than 42, we've got gold!
        // increment gold counter
        gold++;

        // update box type to `BOX_TYPE_GOLD_SILVER` box type to be used
        // to access `SILVER_MIN` and `SILVER_MAX` arrays properly (on index 3)
        _boxType++;
      }

      // calculate amount of silver based on box type using next 32 bits of random
      // upper bound in `__rndVal` is exclusive, add 1 to it
      // to make `SILVER_MAX[boxType]` maximum inclusive
      // and increment silver counter
      silver += uint8(
        Random.__rndVal(
          rnd >> 64,
          0xFFFFFFFFFFFFFFFF,
          SILVER_MIN[_boxType],
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
  function bulkUnbox(uint8[] boxTypes, uint16[] quantities) public constant returns(uint32 silver, uint24 gold) {
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
      (_silver, _gold) = unbox(boxTypes[i], quantities[i]);

      // increment bulk cumulative values
      silver += _silver;
      gold += _gold;
    }

    // return the values accumulated
    return (silver, gold);
  }

  /**
   * @dev Auxiliary function to perform silver and gold minting,
   *      value transfer to beneficiary and change transfer back to sender
   * @dev Unsafe, internal use only, must be kept private at all times
   */
  function __mint(uint256 price, uint32 silver, uint24 gold) private {
    // verify message has enough value
    require(price <= msg.value);

    // call sender gracefully - player
    address player = msg.sender;

    // calculate the change to send back to player
    uint256 change = msg.value - price;

    // any box contains silver, no need to check if silver
    // is not zero – just mint silver required
    silverInstance.mint(player, silver);

    // box may not contain gold, check if it does
    if(gold != 0) {
      // mint gold required
      goldInstance.mint(player, gold);
    }

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

    // emit an event
    emit Unboxed(player, silver, gold);
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
  function getBoxPrice(uint8 boxType) public constant returns(uint64) {
    // box type validation will be performed automatically
    // when accessing INITIAL_PRICES and FINAL_PRICES arrays

    // verify time constraints, otherwise the result of `linearStepwise`
    // will be confusing:
    // if sale didn't start yet
    if(now <= offset) {
      // return initial price
      return INITIAL_PRICES[boxType];
    }
    // if sale has already ended
    if(now >= offset + LENGTH) {
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
      uint32(now)
    );
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
   * @return current price (in moment `now`) of the box type requested
   */
  function getBoxesPrice(uint8 boxType, uint16 quantity) public constant returns(uint256) {
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
  function bulkPrice(uint8[] boxTypes, uint16[] quantities) public constant returns(uint256) {
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
  function linearStepwise(
    uint32 t0,
    uint64 v0,
    uint32 t1,
    uint64 v1,
    uint32 dt,
    uint32 t
  ) public pure returns(uint64 v) {
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


}
