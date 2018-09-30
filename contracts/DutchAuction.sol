pragma solidity 0.4.23;

import "./ERC721Receiver.sol";
import "./AccessControl.sol";
import "./GemERC721.sol";
import "./Fractions.sol";

/**
 * @notice Dutch auction represents a method of selling
 *      in which the price is reduced until a buyer is found
 *      or sale time has ended (item expired for sale).
 * @dev This implementation supports up to 65535 items listed for sale.
 * @dev For each item on sale the following parameters are defined:
 *      * sale start time - t0
 *      * sale start price - p0
 *      * sale end time - t1
 *      * sale end price - p1
 *      * item ID (ERC721 token ID)
 * @dev Current price `p` of each item is calculated linearly based
 *      on the sale parameters:
 *      `p = p0 - (now - t0) * (p0 - p1) / (t1 - t0)
 * @dev Following constraints when adding item for sale must be met:
 *      * t1 > t0: sale starts before it ends
 *      * p0 > p1: start price is higher then end price
 * @dev Following constraints when buying item on sale must be met:
 *      * now < t1: item has not expired
 *      * msg.value >= p: price constraint
 * @dev This implementation operates with a GemERC721 token as an item:
 *      token ID space is expected to be uint32
 */
contract DutchAuction is AccessControl, ERC721Receiver {
  /// @dev Using library Fractions for fraction math
  using Fractions for Fractions.Fraction;

  /// @dev Base structure representing an item for sale on the auction
  /// @dev 256 bits structure, occupies exactly one memory slot
  struct Item {
    // sale start time, seconds
    uint48 t0;
    // sale end time, seconds
    uint48 t1;
    // sale start price, wei, cannot exceed 10^6 ETH
    uint80 p0;
    // sale end price, wei, cannot exceed 10^6 ETH
    uint80 p1;
  }

  /// @dev Enables add(), addWith(), onERC721Received()
  uint32 public constant FEATURE_ADD = 0x00000001;

  /// @dev Enables buy()
  uint32 public constant FEATURE_BUY = 0x00000002;

  /// @notice Auction manager is responsible for removing items
  /// @dev Role ROLE_AUCTION_MANAGER allows executing removeItem
  uint32 public constant ROLE_AUCTION_MANAGER = 0x00010000;

  /// @notice Fee manager is responsible for setting sale fees on the smart contract
  /// @dev Role ROLE_FEE_MANAGER allows executing setFee, setBeneficiary, setFeeAndBeneficiary
  uint32 public constant ROLE_FEE_MANAGER = 0x00020000;

  /// @notice Maximum fee that can be set on the contract
  /// @dev This is an inverted value of the maximum fee:
  ///      `MAX_FEE = 1 / MAX_FEE_INV`
  uint8 public constant MAX_FEE_INV = 20; // 1/20 or 5%

  /// @dev 1 Gwei = 1000000000
  uint80 private constant GWEI = 1000000000;

  /// @dev This auction operates on GemERC721 instances
  GemERC721 public tokenInstance;

  /// @dev Transaction fee, defined by its nominator and denominator
  /// @dev Fee is guaranteed to be in a range between 0 and 5 percent
  Fractions.Fraction public fee;

  /// @dev Address which receives the transaction fee
  address beneficiary;

  /// @dev Auxiliary data structure to keep track of previous item owners
  /// @dev Used to be able to return items back to owners
  mapping(uint256 => address) public owners;

  /// @notice All the items available for sale with their sale parameters
  /// @dev Includes both expired and available items
  mapping(uint256 => Item) public items;

  /// @dev Fired in addItem()
  event ItemAdded(
    // who added this item for sale by calling addItem()
    address indexed _by,
    // who is the owner of this item for sale
    address indexed _from,
    // rest of the values correspond to addItem() signature and Item structure
    uint32 indexed tokenId,
    uint48 t0, // seconds
    uint48 t1, // seconds
    uint48 t,  // seconds
    uint80 p0, // wei
    uint80 p1, // wei
    uint80 p   // current price in wei
  );

  /// @dev Fired in removeItem()
  event ItemRemoved(
    // auction manager who sent a transaction (ROLE_AUCTION_MANAGER)
    address indexed _by,
    // unique item ID (token ID)
    uint32 indexed tokenId
  );

  /// @dev Fired in buyItem()
  event ItemBought(
    // previous item owner
    address indexed _from,
    // new item owner
    address indexed _to,
    // rest of the values correspond to addItem() signature and Item structure
    uint32 indexed tokenId,
    uint48 t0, // seconds
    uint48 t1, // seconds
    uint48 t,  // seconds
    uint80 p0, // wei
    uint80 p1, // wei
    uint80 p,  // current price in wei
    uint80 fee // fee payed
  );

  /// @dev Fired in setFee, setBeneficiary, setFeeAndBeneficiary
  event TransactionFeeUpdated(uint16 nominator, uint16 denominator, address beneficiary);

  /**
   * @dev Creates a dutch auction instance operating on GemERC721 tokens
   *      defined by the `tokenAddress` specified
   * @param tokenAddress deployed GemERC721 instance address
   */
  constructor(address tokenAddress) public {
    // check that we didn't forget to pass an address
    require(tokenAddress != address(0));

    // bind token instance to the address specified
    tokenInstance = GemERC721(tokenAddress);

    // validate ERC721 instance by checking required interfaces
    require(tokenInstance.supportsInterface(0x01ffc9a7)); // ERC165
    require(tokenInstance.supportsInterface(0x80ac58cd)); // ERC721
  }

  /**
   * @dev Adds an item to the auction, starting right now.
   * @dev Requires an item to be transferred on behalf of its owner.
   * @param tokenId token ID for sale
   * @param duration duration of the auction in seconds
   * @param p0 sale start price
   * @param p1 sale end price
   */
  function addNow(uint32 tokenId, uint32 duration, uint80 p0, uint80 p1) public {
    // derive missing parameters for `addWith`

    // t0 is now
    uint32 t0 = uint32(now);

    // t1 is t0 plus duration
    uint32 t1 = t0 + duration;

    // delegate call to `addWith`
    addWith(tokenId, t0, t1, p0, p1);
  }

  /**
   * @dev Adds an item to the auction. Allows to set auction start time.
   * @dev Requires an item to be transferred on behalf of its owner.
   * @param tokenId token ID for sale
   * @param t0 sale start time
   * @param t1 sale end time
   * @param p0 sale start price
   * @param p1 sale end price
   */
  function addWith(uint32 tokenId, uint32 t0, uint32 t1, uint80 p0, uint80 p1) public {
    // determine who is current owner of the token
    address tokenOwner = tokenInstance.ownerOf(tokenId);

    // since we set the auction prices and other parameters,
    // require token to be added only by its owner or
    // by the auction manager
    require(msg.sender == tokenOwner || __isSenderInRole(ROLE_AUCTION_MANAGER));

    // take the token away from the owner to an auction smart contract
    // do not use safe transfer - we're just transferring token into here
    tokenInstance.transferFrom(tokenOwner, address(this), tokenId);

    // delegate call to `__addWith`
    __addWith(msg.sender, tokenOwner, tokenId, t0, t1, p0, p1);
  }

  /**
   * @dev Lists an already transferred item on the auction.
   * @dev Requires an item to be already transferred.
   * @dev Unsafe. Internal use only!
   * @param from an address where on item originally was transferred from
   * @param tokenId token ID for sale
   * @param t0 sale start time
   * @param t1 sale end time
   * @param p0 sale start price
   * @param p1 sale end price
   */
  function __addWith(address operator, address from, uint32 tokenId, uint32 t0, uint32 t1, uint80 p0, uint80 p1) private {
    // check if adding items to sale is enabled
    require(__isFeatureEnabled(FEATURE_ADD));

    // validate sale parameters:
    // make sure caller didn't forget to set t0
    require(t0 > 0);
    // make sure t1 > t0 constraint is satisfied
    require(t1 > t0);
    // make sure we're not adding an already expired sale
    require(t1 > now);
    // p0 can be potentially zero
    // make sure p0 > p1 constraint is satisfied
    require(p0 > p1);

    // make sure both p0 and p1 are multiple of 1 Gwei
    require(ceil1000000000(p0) == p0);
    require(ceil1000000000(p1) == p1);

    // make sure p0 is at least 1 Szabo
    require(p0 >= 1 szabo);

    // require the token is already transferred
    // also ensures the token is a whitelisted GemERC721 instance
    require(tokenInstance.ownerOf(tokenId) == address(this));

    // save previous owner of the token
    owners[tokenId] = from;

    // create item sale parameters structure
    Item memory item = Item(t0, t1, p0, p1);

    // save newly created structure
    items[tokenId] = item;

    // current price
    uint80 p = priceNow(t0, t1, p0, p1);

    // emit an event
    emit ItemAdded(operator, from, tokenId, t0, t1, uint48(now), p0, p1, p);
  }

  /**
   * @dev Removes an item from the auction.
   * @dev Requires sender to be previous owner of the item
   *      or to have `ROLE_AUCTION_MANAGER` permission.
   * @param tokenId unique ID of the item, previously generated when item was added
   */
  function remove(uint32 tokenId) public {
    // call sender gracefully - operator
    address operator = msg.sender;

    // get previous token owner
    address owner = owners[tokenId];

    // check that previous owner is not zero (item is on sale)
    require(owner != address(0));

    // check transaction sender is previous owner or has appropriate permissions to remove item from sale
    require(operator == owner || __isSenderInRole(ROLE_AUCTION_MANAGER));

    // transfer item back to owner
    // do not use safe transfer - we're returning the token back to where it came from
    tokenInstance.transferFrom(address(this), owner, tokenId);

    // remove from previous owners mapping
    delete owners[tokenId];

    // remove item on sale properties
    delete items[tokenId];

    // emit an event
    emit ItemRemoved(operator, tokenId);
  }

  /**
   * @notice Allows to buy an item listed for sale.
   * @notice An item bought is sent back to `msg.sender`
   * @notice Requires that the sale for that item is not expired
   *      and that enough value is sent to the function
   * @dev Requires now < t1
   * @dev Requires msg.value >= p
   * @param tokenId unique ID of the item on sale (token ID)
   */
  function buy(uint32 tokenId) public payable {
    // delegate call to `buyTo`
    buyTo(tokenId, msg.sender);
  }

  /**
   * @notice Allows to buy an item listed for sale for someone else.
   * @notice An item bought is sent back to `buyer`
   * @notice Requires that the sale for that item is not expired
   *      and that enough value is sent to the function
   * @dev Requires now < t1
   * @dev Requires msg.value >= p
   * @param tokenId unique ID of the item on sale (token ID)
   * @param buyer an address to send the item bought to
   */
  function buyTo(uint32 tokenId, address buyer) public payable {
    // check if adding items to sale is enabled
    require(__isFeatureEnabled(FEATURE_BUY));

    // check address `_to` is valid
    require(buyer != address(0));

    // find previous owner of the item - seller
    address seller = owners[tokenId];

    // verify that previous owner exists
    require(seller != address(0));

    // get the item for sale data
    Item memory item = items[tokenId];
    
    // calculate current item price
    uint80 p = priceNow(item.t0, item.t1, item.p0, item.p1);

    // check that we have enough value to buy an item
    require(p <= msg.value);

    // transfer the item to the buyer
    // use safe transfer since we don't know if buyer supports receiving ERC721
    tokenInstance.safeTransferFrom(address(this), buyer, tokenId);

    // remove from previous owners mapping
    delete owners[tokenId];

    // remove item on sale properties
    delete items[tokenId];

    // transaction fee value
    uint256 feeValue = calculateFeeValue(p);

    // fee (if any) is extracted from the seller
    if(feeValue > 0) {
      // transfer the fee to beneficiary
      beneficiary.transfer(feeValue);
    }

    // fee cannot exceed MAX FEE limit by design
    assert(feeValue <= p / MAX_FEE_INV);

    // transfer value to the seller
    seller.transfer(p - feeValue);

    // if the incoming value is too big
    if(msg.value > p) {
      // transfer change back to buyer
      buyer.transfer(msg.value - p);
    }

    // emit an event
    emit ItemBought(seller, buyer, tokenId, item.t0, item.t1, uint48(now), item.p0, item.p1, p, uint80(feeValue));
  }

  /**
   * @notice Handle the receipt of an NFT: adds it into an auction
   * @dev The ERC721 smart contract calls this function on the recipient after a `transfer`.
   *      This function MAY throw to revert and reject the transfer.
   *      Return of other than the magic value MUST result in the transaction being reverted.
   * @notice The contract address is always the message sender.
   *      A wallet/broker/auction application MUST implement the wallet interface
   *      if it will accept safe transfers.
   * @param _operator The address which called `safeTransferFrom` function
   * @param _from The address which previously owned the token
   * @param _tokenId The NFT identifier which is being transferred
   * @param _data Additional data contains tokenId, t0, t1, p0, p1 (256 packed)
   * @return `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))` unless throwing
   */
  function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes _data) external returns(bytes4) {
    // check the data array is exactly 32 bytes (256 bits long)
    require(_data.length == 0x20);

    // define an integer variable to store the last bytes parameter `_data` value
    uint256 data;

    // it is possible to do only using inline assembly
    assembly {
      // calldata in our case consists of 164 bytes:
      // first 4 bytes represent Method ID - function selector,
      // followed by three elementary typed inputs which occupy exactly 1 slot (32 bytes) each:
      //    _operator address (only 20 bytes are really used, first 12 bytes are zeroes)
      //    _from address (only 20 bytes are really used, first 12 bytes are zeroes)
      //    _tokenId (only 4 bytes are really used, first 28 bytes are zeroes)
      // next slot (offset 0x64) contains _data (dynamic bytes array) offset (0x80 - exactly the size of the head part)
      // 64 bytes at position 0x80 contain _data (32 bytes contain length header and 32 bytes contain data itself)
      // therefore we are interested in the last 32 bytes of the calldata (offset 0x4 + 0x80 + 0x20 = 0xA4),
      // containing tokenId (4 bytes) + t0 (4 bytes) + t1 (4 bytes) + p0 (10 bytes) + p1 (10 bytes)

      // read the _data offset, increment it by method ID (0x4) and first data slot size (0x20) containing data length
      let offset := add(0x24, calldataload(0x64))

      // the real data in `_data` starts at offset now (0xA4)
      data := calldataload(offset)
    }

    // unpack all the required variables from data
    uint32 tokenId = uint32(data >> 224);
    uint32 t0 = uint32(data >> 192);
    uint32 t1 = uint32(data >> 160);
    uint80 p0 = uint80(data >> 80);
    uint80 p1 = uint80(data);

    // check the tokenId is consistent with what is passed as an explicit input parameter
    require(tokenId == _tokenId);

    // delegate call to `addWith`
    __addWith(_operator, _from, tokenId, t0, t1, p0, p1);

    // return "magic" number on success, see GemERC721.ERC721_RECEIVED
    return 0x150b7a02;
  }

  /**
   * @dev Allows to set the transaction fee less or equal to 5%
   * @dev Throws if fee exceeds 5%
   * @dev Requires sender to have `ROLE_FEE_MANAGER` permission
   * @param nominator fee fraction nominator
   * @param denominator fee fraction denominator, not zero
   */
  function setFee(uint16 nominator, uint16 denominator) public {
    // ensure sender has valid permissions
    require(__isSenderInRole(ROLE_FEE_MANAGER));

    // ensure fee cannot exceed the MAX FEE limit
    require(nominator <= denominator / MAX_FEE_INV);

    // create and assign the fee
    fee = Fractions.createProperFraction(nominator, denominator);

    // emit an event
    emit TransactionFeeUpdated(nominator, denominator, beneficiary);
  }

  /**
   * @dev Allows to set the transaction fee beneficiary
   * @dev Requires sender to have `ROLE_FEE_MANAGER` permission
   * @param _beneficiary transaction fee beneficiary
   */
  function setBeneficiary(address _beneficiary) public {
    // ensure sender has valid permissions
    require(__isSenderInRole(ROLE_FEE_MANAGER));

    // address can be zero as well, zero address disables transaction fees
    beneficiary = _beneficiary;

    // emit an event
    emit TransactionFeeUpdated(fee.getNominator(), fee.getDenominator(), beneficiary);
  }

  /**
   * @dev Allows to set the transaction fee and beneficiary
   * @dev Requires sender to have `ROLE_FEE_MANAGER` permission
   * @param nominator fee fraction nominator
   * @param denominator fee fraction denominator, not zero
   * @param _beneficiary transaction fee beneficiary
   */
  function setFeeAndBeneficiary(uint16 nominator, uint16 denominator, address _beneficiary) public {
    // ensure sender has valid permissions
    require(__isSenderInRole(ROLE_FEE_MANAGER));

    // ensure fee cannot exceed the MAX FEE limit
    require(nominator <= denominator / MAX_FEE_INV);

    // create and assign the fee, it can be zero in which case it disables transaction fees
    fee = Fractions.createProperFraction(nominator, denominator);

    // address can be zero as well, zero address disables transaction fees
    beneficiary = _beneficiary;

    // emit an event
    emit TransactionFeeUpdated(nominator, denominator, beneficiary);
  }

  /**
   * @dev Returns item sale status parameters as a packed 224 bits structure.
   * @dev The data returned:
   *      t0  auction start time (unix timestamp), 32 bits
   *      t1  auction end time (unix timestamp), 32 bits
   *      t   current time (unix timestamp), 32 bits
   *      p0  starting price (Gwei), 32 bits
   *      p1  final price (Gwei), 32 bits
   *      p   current price (Gwei), 32 bits
   *      fee estimated fee value (Gwei), 32 bits
   * @param tokenId id of the item
   * @return packed int data structure representing the item sale status,
   *      or zero – if item is not on sale
   */
  function getTokenSaleStatus(uint32 tokenId) constant public returns(uint224) {
    // read item into memory from storage
    Item memory item = items[tokenId];

    // if item is not on sale than t0 is zero
    if(item.t0 == 0) {
      // in such a case we just return zero
      return 0;
    }

    // read and calculate all the required data
    uint32 t0 = uint32(item.t0);
    uint32 t1 = uint32(item.t1);
    uint32 t = uint32(now);
    uint32 p0 = uint32(item.p0 / GWEI); // Gwei
    uint32 p1 = uint32(item.p1 / GWEI); // Gwei
    uint80 price = priceNow(item.t0, item.t1, item.p0, item.p1); // in wei
    uint32 p = uint32(price / GWEI); // Gwei
    uint32 feeValue = uint32(calculateFeeValue(price) / GWEI); // Gwei

    // pack the data and return
    return uint224(t0) << 192 | uint192(t1) << 160 | uint160(t) << 128 | uint128(p0) << 96 | uint96(p1) << 64 | uint64(p) << 32 | uint32(feeValue);
  }

  /**
   * @dev Checks if the item specified is listed for sale
   * @param tokenId id of the item
   * @return true of the item defined by its tokenId is for sale
   */
  function isTokenOnSale(uint32 tokenId) constant public returns(bool) {
    // check if token exists by checking its previous owner
    return owners[tokenId] != address(0);
  }

  /**
   * @dev Calculates current auction price for the item specified.
   * @dev Doesn't check the `_t0 < _t1` and `_p0 > _p1` constraints.
   *      It is in caller responsibility to ensure them otherwise result is not correct.
   * @param tokenId ID of item to query price for
   * @return current item price (at the time `now`)
   */
  function getCurrentPrice(uint32 tokenId) public constant returns(uint80) {
    // get the item for sale data
    Item memory item = items[tokenId];

    // check that the item is listed for sale
    require(owners[tokenId] != address(0));

    // calculate current item price by delegating to `priceNow` and return
    return priceNow(item.t0, item.t1, item.p0, item.p1);
  }

  /**
   * @dev Calculates current auction price for the sale parameters given.
   * @dev Doesn't check the `_t0 < _t1` and `_p0 > _p1` constraints.
   *      It is in caller responsibility to ensure them otherwise result is not correct.
   * @param t0 auction start time
   * @param t1 auction end time
   * @param p0 initial price
   * @param p1 final price
   * @return price in time `now` according to formula `p = p0 - (now - t0) * (p0 - p1) / (t1 - t0)`
   */
  function priceNow(uint48 t0, uint48 t1, uint80 p0, uint80 p1) private constant returns(uint80) {
    // delegate call to `p`
    return price(t0, t1, uint48(now), p0, p1);
  }

  /**
   * @dev Calculates fee value based on the fee percent set in the smart contract,
   *      taking into account also if beneficiary address is set
   * @param price selling price to calculate fee for
   * @return calculated fee value, zero if either beneficiary address or fee is zero
   */
  function calculateFeeValue(uint80 price) private constant returns(uint256) {
    // fee is applied only when it is not zero and when beneficiary is defined
    if(beneficiary != address(0) && !fee.isZero()) {
      // calculate the fee and return
      return fee.multiplyByInteger(price);
    }

    // no fee / beneficiary is set - return 0
    return 0;
  }

  /**
   * @dev Calculates auction price in the given moment for the sale parameters given.
   * @dev Doesn't check the `_t0 < _t1` and `_p0 > _p1` constraints.
   *      It is in caller responsibility to ensure them otherwise result is not correct.
   * @dev The result is rounded down to be a multiple of 1 Gwei
   * @param _t0 auction start time
   * @param _t1 auction end time
   * @param _t time of interest / time to query the price for
   * @param _p0 initial price
   * @param _p1 final price
   * @return price in time `t` according to formula `p = p0 - (t - t0) * (p0 - p1) / (t1 - t0)`
   */
  function price(uint48 _t0, uint48 _t1, uint48 _t, uint80 _p0, uint80 _p1) private pure returns(uint80) {
    // if current time `t` is lower then start time `t0`
    if(_t < _t0) {
      // return initial price `p0`
      return _p0;
    }
    // if current time `t` is greater then end time `t1`
    if(_t > _t1) {
      // return the final price `p0`
      return _p1;
    }

    // otherwise calculate the price

    // convert all numbers into uint128 to get rid of possible arithmetic overflow
    uint128 t0 = uint128(_t0);
    uint128 t1 = uint128(_t1);
    uint128 t = uint128(_t);
    uint128 p0 = uint128(_p0);
    uint128 p1 = uint128(_p1);

    // apply formula, round down to be multiple of 1 Gwei and return
    return ceil1000000000(uint80(p0 - (t - t0) * (p0 - p1) / (t1 - t0)));
  }

  /**
   * @dev Auxiliary function to round down price to be multiple of 1 Gwei (1000000000)
   * @param p price in wei
   * @return price in wei, rounded down to be multiple of 1 Gwei (1000000000)
   */
  function ceil1000000000(uint80 p) private pure returns(uint80) {
    return p / GWEI * GWEI;
  }
}
