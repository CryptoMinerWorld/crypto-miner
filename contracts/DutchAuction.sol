pragma solidity 0.4.23;

import "./AccessControl.sol";
import "./GemERC721.sol";

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
contract DutchAuction is AccessControl {

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
  
  /// @notice Auction manager is responsible for removing items
  /// @dev Role ROLE_AUCTION_MANAGER allows executing removeItem
  uint32 public constant ROLE_AUCTION_MANAGER = 0x00000002;

  /// @dev This auction operates on GemERC721 instances
  GemERC721 public tokenInstance;

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
    // rest of the values correspond to addItem() signature and Item structure
    uint32 indexed tokenId,
    uint48 t0, // seconds
    uint48 t1, // seconds
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
    uint80 p0, // wei
    uint80 p1, // wei
    uint80 p   // current price in wei
  );

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

    // validate GemERC721 instance by requiring all supported interfaces
    require(tokenInstance.supportsInterface(0x01ffc9a7)); // ERC165
    require(tokenInstance.supportsInterface(0x80ac58cd)); // ERC721
    require(tokenInstance.supportsInterface(0x4f558e79)); // ERC721 exists
    require(tokenInstance.supportsInterface(0x780e9d63)); // ERC721 enumerable
    require(tokenInstance.supportsInterface(0x5b5e139f)); // ERC721 metadata
  }

  /**
   * @dev Adds an item to the auction, starting right now.
   * @dev Requires an item to be transferred on behalf of its owner.
   * @param tokenId token ID for sale
   * @param duration duration of the auction in seconds
   * @param p0 sale start price
   * @param p1 sale end price
   */
  function add(uint32 tokenId, uint32 duration, uint80 p0, uint80 p1) public {
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
    // validate sale parameters:
    // make sure caller didn't forget to set t0
    require(t0 > 0);
    // make sure t1 > t0 constraint is satisfied
    require(t1 > t0);
    // make sure we're no adding an already expired sale
    require(t1 > now);
    // p0 can be potentially zero
    // make sure p0 > p1 constraint is satisfied
    require(p0 > p1);

    // determine who is current owner of the token
    address tokenOwner = tokenInstance.ownerOf(tokenId);

    // take the token away from the owner here, to an auction smart contract
    tokenInstance.transferFrom(tokenOwner, address(this), tokenId);

    // save previous owner of the token
    owners[tokenId] = tokenOwner;

    // create item sale parameters structure
    Item memory item = Item(t0, t1, p0, p1);

    // save newly created structure
    items[tokenId] = item;

    // current price
    uint80 p = priceNow(t0, t1, p0, p1);

    // emit an event
    emit ItemAdded(msg.sender, tokenId, t0, t1, p0, p1, p);
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
    tokenInstance.transfer(owner, tokenId);

    // remove from previous owners mapping
    delete owners[tokenId];

    // remove item on sale properties
    delete items[tokenId];

    // emit an event
    emit ItemRemoved(operator, tokenId);
  }

  /**
   * @notice Allows to buy an item listed for sale.
   * @notice Requires that the sale for that item is not expired
   *      and that enough value is sent to the function
   * @dev Requires now < t1
   * @dev Requires msg.value >= p
   * @param tokenId unique ID of the item on sale (token ID)
   */
  function buy(uint32 tokenId) public payable {
    // call sender gracefully - buyer
    address buyer = msg.sender;

    // find previous owner of the item - seller
    address seller = owners[tokenId];

    // verify that previous owner exists
    require(seller != address(0));

    // get the item for sale data
    Item memory item = items[tokenId];
    
    // check that the sale has already started
    require(item.t0 <= now);

    // calculate current item price
    uint80 p = priceNow(item.t0, item.t1, item.p0, item.p1);

    // check that we have enough value to buy an item
    require(p <= msg.value);

    // transfer the item to the buyer
    tokenInstance.transfer(buyer, tokenId);

    // remove from previous owners mapping
    delete owners[tokenId];

    // remove item on sale properties
    delete items[tokenId];

    // transfer value to the seller
    seller.transfer(p);

    // if the incoming value is too big
    if(msg.value > p) {
      // transfer change back to buyer
      buyer.transfer(msg.value - p);
    }

    // emit an event
    emit ItemBought(seller, buyer, tokenId, item.t0, item.t1, item.p0, item.p1, p);
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
  function priceNow(uint48 t0, uint48 t1, uint80 p0, uint80 p1) public constant returns(uint80) {
    // delegate call to `p`
    return price(t0, t1, uint48(now), p0, p1);
  }

  /**
   * @dev Calculates auction price in the given moment for the sale parameters given.
   * @dev Doesn't check the `_t0 < _t1` and `_p0 > _p1` constraints.
   *      It is in caller responsibility to ensure them otherwise result is not correct.
   * @param _t0 auction start time
   * @param _t1 auction end time
   * @param _t time of interest / time to query the price for
   * @param _p0 initial price
   * @param _p1 final price
   * @return price in time `t` according to formula `p = p0 - (t - t0) * (p0 - p1) / (t1 - t0)`
   */
  function price(uint48 _t0, uint48 _t1, uint48 _t, uint80 _p0, uint80 _p1) public pure returns(uint80) {
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

    // apply formula and return
    return uint80(p0 - (t - t0) * (p0 - p1) / (t1 - t0));
  }

}
