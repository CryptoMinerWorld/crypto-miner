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
 *        2. Goldish Silver Box
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
   * @dev Minimum and maximum amounts of silver each box type can have:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box (with gold)
   *      [3] - Goldish Silver Box (without gold)
   */
  uint8[] public SILVER_MIN = [20, 70, 100, 150];
  uint8[] public SILVER_MAX = [30, 90, 120, 200];

  /**
   * @dev Initial prices of the boxes by type:
   *      [0] - Silver Box
   *      [1] - Rotund Silver Box
   *      [2] - Goldish Silver Box
   */
  uint16[] public INITIAL_PRICES_FINNEY = [96, 320, 760];

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

  address public beneficiary;

  /**
   * @dev Creates a Silver/Gold Sale instance, binding it to
   *      silver (ERC20 token) and gold (ERC20 token) instances specified
   * @param silverAddress address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_TOKEN_VERSION_REQUIRED`
   * @param goldAddress address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_TOKEN_VERSION_REQUIRED`
   * @param _offset sale start date as a unix timestamp, the sale lasts
   *      from `offset` (inclusive) to `offset + LENGTH` (exclusive)
   */
  constructor(address silverAddress, address goldAddress, address _beneficiary, uint32 _offset) public {
    // verify the inputs: mistakes in addresses
    require(silverAddress != address(0));
    require(goldAddress != address(0));
    require(silverAddress != goldAddress);

    // verify the sale length is not zero
    require(_offset + LENGTH > now);

    // bind smart contract instances
    silverInstance = SilverERC20(silverAddress);
    goldInstance = GoldERC20(goldAddress);

    // verify smart contract versions
    require(silverInstance.TOKEN_VERSION() == SILVER_TOKEN_VERSION_REQUIRED);
    require(goldInstance.TOKEN_VERSION() == GOLD_TOKEN_VERSION_REQUIRED);

    // set up beneficiary and  sale start
    offset = _offset;
    beneficiary = _beneficiary;
  }

  /**
   * @notice Allows buying several boxes of a single type
   *      (Silver, Rotund Silver, Goldish Silver)
   * @dev Throws if box type is invalid
   * @dev Throws if quantity is invalid (zero)
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxType defines a box type, must be one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantity defines amount of boxes to buy
   */
  function buy(uint8 boxType, uint8 quantity) public payable {
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));


  }

  /**
   * @notice Allows buying boxes of different types in single transaction
   *      (Silver, Rotund Silver, Goldish Silver)
   * @dev Throws if `boxTypes` and `quantities` arrays are different in size
   * @dev Throws if any of the box types specified is invalid
   * @dev Throws if any of the quantities specified is invalid (zero)
   * @dev Throws if transaction has not enough value (ETH)
   *      to buy the boxes requested
   * @param boxTypes defines an array of box types, each box type is one of
   *      0 – Silver Box
   *      1 - Rotund Silver Box
   *      2 - Goldish Silver Box
   * @param quantities defines an array of amount of boxes of each corresponding
   *      type to buy
   */
  function bulkBuy(uint8[] boxTypes, uint8[] quantities) public payable {
    // verify that sale feature is enabled (sale is active)
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

  }

  function getBoxPrice(uint8 boxType) {

  }

  /**
   * @dev Calculates value `v` at the given point in time `t`,
   *      given that the initial value at the moment 't0' is `v0`
   *      and the final value at the moment `t1` is `v1`
   * @dev The value is changed stepwise linearly in time,
   *      step size is defined by `_dt` (seconds)
   * @param t0 defines initial moment (unix timestamp)
   * @param v0 defines initial value
   * @param t1 defines final moment (unix timestamp)
   * @param v1 defines final value
   * @param dt defines time step size (seconds)
   * @param t defines moment of interest (unix timestamp)
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
