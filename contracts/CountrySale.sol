pragma solidity 0.4.23;

import "./CountryERC721.sol";
import "./AccessControl.sol";

/**
 * @notice Country sale smart contract is responsible for selling CountryERC721 tokens
 */
contract CountrySale is AccessControl {
  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant SALE_VERSION = 0x1;

  /// @dev Version of the Token smart contract to work with
  /// @dev See `CountryERC721.TOKEN_VERSION`
  uint32 public constant TOKEN_VERSION_REQUIRED = 0x1;

  /// @dev Country smart contract to sell, should be set in constructor
  CountryERC721 public countryContract;

  /// @dev Address to send all the incoming funds
  address public beneficiary;

  /// @dev Country price data array contains price of each country
  uint64[] public priceData;

  /// @dev Coupon storage stores a mapping coupon hash -> token ID
  mapping(uint256 => uint8) coupons;

  // a role required to create/add coupons
  uint32 public constant ROLE_COUPON_MANAGER = 0x00000100;

  /// @dev Fired in buy(), buyTo()
  event PurchaseComplete(address indexed _by, address indexed _to, uint8 indexed _tokenId, uint16 plots, uint64 price);

  /// @dev Fired in bulkBuy(), bulkNuyTo()
  event BulkPurchaseComplete(address indexed _by, address indexed _to, uint8[] ids, uint32 totalPlots, uint128 totalPrice);

  /// @dev Fired in addCoupon()
  event CouponAdded(address indexed _by, uint256 indexed key, uint8 _tokenId);

  /// @dev Fired in removeCoupon()
  event CouponRemoved(address indexed _by, uint256 indexed key);

  /// @dev Fired in useCoupon()
  event CouponConsumed(address indexed _by, uint256 indexed key, uint8 _tokenId, uint16 plots);

  /**
   * @dev Creates a Country Sale instance,
   * @dev Initializes the contract with the country data price provided
   * @param tokenAddress address of the deployed CountryERC721 instance to sell tokens of
   * @param _beneficiary sale beneficiary, an address where the sale funds go to
   * @param _priceData array of packed data structures containing
   *        price value for each country
   */
  constructor(address tokenAddress, address _beneficiary, uint64[] _priceData) public {
    // validate inputs
    require(tokenAddress != address(0));
    require(_beneficiary != address(0));
    require(tokenAddress != _beneficiary);

    // bind the Gem smart contract
    countryContract = CountryERC721(tokenAddress);

    // validate if character card instance is valid
    // by validating smart contract version
    require(TOKEN_VERSION_REQUIRED == countryContract.TOKEN_VERSION());

    // check that price data length matches with the country data length
    require(_priceData.length == countryContract.getNumberOfCountries());

    // set the beneficiary
    beneficiary = _beneficiary;

    // init country price data array
    priceData = _priceData;
  }

  /**
   * @notice Allows to buy a country.
   * @notice The country bought is sent back to `msg.sender`
   * @notice Requires enough funds (value) to be sent inside the transaction
   * @param _tokenId unique ID of the item on sale (token ID)
   */
  function buy(uint8 _tokenId) public payable {
    // delegate call to `buyTo`
    buyTo(_tokenId, msg.sender);
  }

  /**
   * @notice Allows to buy a country listed for sale for someone else.
   * @notice The country bought is sent to address '_to'
   * @param _tokenId unique ID of the item on sale (token ID)
   * @param _to an address to send the item bought to
   */
  function buyTo(uint8 _tokenId, address _to) public payable {
    // checks provided by mint function (used later in this function):
    // * non-zero `_to` address, not pointing to token smart contract itself
    // * valid, non existent `_tokenId`

    // check we're not sending token to sale smart contract itself
    require(_to != address(this));

    // get token sale price value
    uint64 price = getPrice(_tokenId);

    // ensure message contains enough value to buy this token
    require(msg.value >= price);

    // calculate the change
    uint256 change = msg.value - price;

    // transfer the funds to beneficiary
    beneficiary.transfer(price);

    // if there is any change to transfer back
    if(change > 0) {
      // transfer the change back to sender (not to `_to`!)
      msg.sender.transfer(change);
    }

    // mint the token (token ID validation is delegated to `mint` function)
    countryContract.mint(_to, _tokenId);

    // emit an event
    emit PurchaseComplete(msg.sender, _to, _tokenId, countryContract.getNumberOfPlots(_tokenId), price);
  }

  /**
   * @notice Allows to buy several countries in a single transaction.
   * @notice The countries bought are sent back to `msg.sender`
   * @notice Requires enough funds (value) to be sent inside the transaction
   * @param ids array of unique IDs of the items on sale (token IDs)
   */
  function bulkBuy(uint8[] ids) public payable {
    // delegate call to `bulkBuyTo`
    bulkBuyTo(msg.sender, ids);
  }

  /**
   * @notice Allows to buy several countries in a single transaction for someone else.
   * @notice The countries bought are sent to address '_to'
   * @param _to an address to send the item bought to
   * @param ids array of unique IDs of the items on sale (token IDs)
   */
  function bulkBuyTo(address _to, uint8[] ids) public payable {
    // checks provided by mint function (used later in this function):
    // * non-zero `_to` address, not pointing to token smart contract itself
    // * valid, non existent `_tokenId`

    // check we're not sending token to sale smart contract itself
    require(_to != address(this));

    // variable to accumulate total price for the countries requested
    uint128 totalPrice = 0;

    // variable to accumulate total number of plots requested countries contain
    uint32 totalPlots = 0;

    // iterate over tokens requested, calculate total price
    for(uint i = 0; i < ids.length; i++) {
      // accumulate total price
      totalPrice += getPrice(ids[i]);

      // mint the token (in case of any further error this action will be reverted)
      countryContract.mint(_to, ids[i]);

      // accumulate total plots value
      totalPlots += countryContract.getNumberOfPlots(ids[i]);
    }

    // ensure message contains enough value to buy tokens requested
    // if that fails all previous actions (minting + event) are discarded
    require(msg.value >= totalPrice);

    // calculate the change
    uint256 change = msg.value - totalPrice;

    // transfer the funds to beneficiary
    beneficiary.transfer(totalPrice);

    // if there is any change to transfer back
    if(change > 0) {
      // transfer the change back to sender (not to `_to`!)
      msg.sender.transfer(change);
    }

    // emit bulk purchase event
    emit BulkPurchaseComplete(msg.sender, _to, ids, totalPlots, totalPrice);
  }

  /**
   * @notice Gets token price this smart contract sells token with.
   * @param _tokenId token ID to query price for
   * @return token price in wei
   */
  function getPrice(uint16 _tokenId) public constant returns(uint64) {
    // verify that token ID is not zero
    require(_tokenId != 0);

    // get country price data from the config and return
    return priceData[_tokenId - 1];
  }

  /**
   * @notice Allows validating a coupon, returns non-zero value if its valid
   * @param code coupon code to validate
   * @return token ID corresponding to this coupon or zero if coupon is not valid
   */
  function isCouponValid(string code) public constant returns(uint8) {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // get token ID corresponding to this coupon
    uint8 _tokenId = coupons[key];

    // check if token ID is valid and if this token doesn't exist
    if(_tokenId != 0 && !countryContract.exists(_tokenId)) {
      // coupon is valid, return token ID
      return _tokenId;
    }

    // coupon is not valid, return zero
    return 0;
  }

  /**
   * @notice Allows using a coupon, emits corresponding token to sender if coupon is valid
   * @dev Throws if coupon is invalid or if corresponding country already exists
   * @param code coupon code to use
   */
  function useCoupon(string code) public {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // get token ID corresponding to this coupon
    uint8 _tokenId = coupons[key];

    // mint the token (token ID validation is delegated to `mint` function)
    countryContract.mint(msg.sender, _tokenId);

    // emit an event
    emit CouponConsumed(msg.sender, key, _tokenId, countryContract.getNumberOfPlots(_tokenId));
  }

  /**
   * @notice Allows adding coupons for free token retrieval
   * @notice Requires a sender to have a permission to add a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @param key coupon code hash
   * @param _tokenId token ID to be given freely for this coupon
   */
  function addCoupon(uint256 key, uint8 _tokenId) public {
    // check sender has permissions to create a coupon
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // ensure coupon doesn't exist yet
    require(coupons[key] == 0);

    // add a coupon
    coupons[key] = _tokenId;

    // emit an event
    emit CouponAdded(msg.sender, key, _tokenId);
  }

  /**
   * @notice Allows removing previously added coupons
   * @notice Requires a sender to have a permission to remove a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @param key coupon code hash
   */
  function removeCoupon(uint256 key) public {
    // check sender has permissions to create a coupon
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // ensure coupon exists
    require(coupons[key] != 0);

    // remove the coupon
    delete coupons[key];

    // emit an event
    emit CouponRemoved(msg.sender, key);
  }

}
