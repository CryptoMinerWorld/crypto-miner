pragma solidity 0.4.23;

import "./DutchAuction.sol";
import "./GemERC721.sol";
import "./CountryERC721.sol";

/**
 * @title Dutch Auction Helper
 *
 * @notice Dutch Auction Helper addresses some issues with currently active
 *      Dutch Auction smart contract, providing support for
 *      the next CryptoMiner World release on February 21, 2019
 *
 * @dev Resolves an issue with getting tokens information of a particular user
 *      in case when the tokens of interest are listed on the auction
 *
 * @author Basil Gorin
 */
contract DutchAuctionHelper {
  /// @dev 1 Gwei = 1000000000
  uint32 private constant GWEI = 1000000000;

  /**
   * @dev Similarly to `GemERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token GemERC721 instance, providing `getPackedCollection(owner) => uint80` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, containing:
   *      gem id, 24 bits (truncated)
   *      gem color, 8 bits
   *      gem level, 8 bits
   *      gem grade type, 8 bits
   *      gem grade value, 24 bits
   *      auction start time (unix timestamp), 32 bits
   *      auction end time (unix timestamp), 32 bits
   *      starting price (Gwei), 40 bits
   *      final price (Gwei), 40 bits
   *      current price (Gwei), 40 bits
   */
  function getGemCollectionByOwner(address auction, address token, address owner) public constant returns(uint256[]) {
    // get all the tokens available on the auction
    uint80[] memory packed = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint256[] memory extended = new uint256[](packed.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint80 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint32 tokenId = uint32(packed[i] >> 48);

      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, tokenId) == owner) {
        // construct packed result item
        extended[k++] = uint256(packed[i]) << 184 | getSaleStatusPacked(auction, token, tokenId);
      }
    }

    // at this point array `ownerTokens` contains `k` elements,
    // which is in most cases less than `ownerTokens.length`

    // if `k`, however, is equal to `ownerTokens.length` - we're fine
    if(k == extended.length) {
      // and just return what we have - `ownerTokens`
      return extended;
    }

    // to cleanup the destination array - create a new one of length `k`
    uint256[] memory result = new uint256[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint80 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = extended[j];
    }

    // we're done, return the result
    return result;
  }

  /**
   * @dev Similarly to `GemERC721.getPackedCollection`, returns packed collection
   *      of all the tokens being sold currently on the auction
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token GemERC721 instance, providing `getPackedCollection(owner) => uint80` interface
   * @return packed tokens collection structure, containing:
   *      if array index is even:
   *        gem id, 24 bits (truncated)
   *        gem color, 8 bits
   *        gem level, 8 bits
   *        gem grade type, 8 bits
   *        gem grade value, 24 bits
   *        auction start time (unix timestamp), 32 bits
   *        auction end time (unix timestamp), 32 bits
   *        starting price (Gwei), 40 bits
   *        final price (Gwei), 40 bits
   *        current price (Gwei), 40 bits
   *      if an array index is odd:
   *        gem owner address
   */
  function getAllGems(address auction, address token) public constant returns(uint256[]) {
    // get all the tokens available on the auction
    uint80[] memory packed = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens extending the properties
    uint256[] memory extended = new uint256[](2 * packed.length);

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint32 tokenId = uint32(packed[i] >> 48);
      // construct packed result item
      extended[2 * i] = uint256(packed[i]) << 184 | getSaleStatusPacked(auction, token, tokenId);
      // add previous owner address to the resulting array
      extended[2 * i + 1] = uint160(DutchAuction(auction).owners(token, tokenId));
    }

    // return the result
    return extended;
  }


  /**
   * @dev Similarly to `CountryERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token CountryERC721 instance, providing `getPackedCollection(owner) => uint40` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, containing:
   *      country id, 8 bits
   *      number of plots, 16 bits,
   *      country tax rate, 16 bits
   *      auction start time (unix timestamp), 32 bits
   *      auction end time (unix timestamp), 32 bits
   *      starting price (Gwei), 40 bits
   *      final price (Gwei), 40 bits
   *      current price (Gwei), 40 bits
   */
  function getCountryCollectionByOwner(address auction, address token, address owner) public constant returns(uint224[]) {
    // get all the tokens available on the auction
    uint40[] memory packed = CountryERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint224[] memory extended = new uint224[](packed.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint40 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint8 tokenId = uint8(packed[i] >> 32);

      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, tokenId) == owner) {
        // construct packed result item
        extended[k++] = uint224(packed[i]) << 184 | getSaleStatusPacked(auction, token, tokenId);
      }
    }

    // at this point array `ownerTokens` contains `k` elements,
    // which is in most cases less than `ownerTokens.length`

    // if `k`, however, is equal to `ownerTokens.length` - we're fine
    if(k == extended.length) {
      // and just return what we have - `ownerTokens`
      return extended;
    }

    // to cleanup the destination array - create a new one of length `k`
    uint224[] memory result = new uint224[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint40 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = extended[j];
    }

    // we're done, return the result
    return result;
  }

  /**
   * @dev Similarly to `CountryERC721.getPackedCollection`, returns packed collection
   *      of all the tokens being sold currently on the auction
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token CountryERC721 instance, providing `getPackedCollection(owner) => uint40` interface
   * @return packed tokens collection structure, containing:
   *      if array index is even:
   *        country id, 8 bits
   *        number of plots, 16 bits,
   *        country tax rate, 16 bits
   *        auction start time (unix timestamp), 32 bits
   *        auction end time (unix timestamp), 32 bits
   *        starting price (Gwei), 40 bits
   *        final price (Gwei), 40 bits
   *        current price (Gwei), 40 bits
   *      if an array index is odd:
   *        country owner address
   */
  function getAllCountries(address auction, address token) public constant returns(uint224[]) {
    // get all the tokens available on the auction
    uint40[] memory packed = CountryERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens extending the properties
    uint224[] memory extended = new uint224[](2 * packed.length);

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint8 tokenId = uint8(packed[i] >> 32);
      // construct packed result item
      extended[2 * i] = uint224(packed[i]) << 184 | getSaleStatusPacked(auction, token, tokenId);
      // add previous owner address to the resulting array
      extended[2 * i + 1] = uint160(DutchAuction(auction).owners(token, tokenId));
    }

    // return the result
    return extended;
  }


  /**
   * @dev Returns item sale status parameters as a tuple of seven elements
   * @dev Arithmetic overflow fixed version of `DutchAuction.getTokenSaleStatus` function
   * @dev The data returned:
   *      [0] t0  auction start time (unix timestamp)
   *      [1] t1  auction end time (unix timestamp)
   *      [2] t   current time (unix timestamp)
   *      [3] p0  starting price (wei)
   *      [4] p1  final price (wei)
   *      [5] p   current price (wei)
   *      [6] owner token owner (previous)
   * @param auction DutchAuction instance, providing `items(address, uint32)` interface
   * @param token ERC721 deployed instance address
   * @param tokenId id of the item
   * @return a tuple containing all auction status for a particular ERC721 item
   */
  function getTokenSaleStatus(
    address auction,
    address token,
    uint32 tokenId
  ) constant public returns(
    uint32 t0,
    uint32 t1,
    uint32 t,
    uint128 p0,
    uint128 p1,
    uint128 p,
    address owner
  ) {
    // get the link to deployed DutchAuction instance
    DutchAuction auctionInstance = DutchAuction(auction);

    // check if token is on sale,
    if(!auctionInstance.isTokenOnSale(token, tokenId)) {
      // return zeros if token is not on sale
      return (0, 0, 0, 0, 0, 0, address(0));
    }

    // read item into memory from the auction
    // prepare the variables to be used in tuple
    // p0 and p1 are already defined in function return declaration
    // while _t0 and _t1 are new 48 bits temporary integers
    uint48 _t0;
    uint48 _t1;
    // delegate call to `auctionInstance.items`
    (_t0, _t1, p0, p1) = auctionInstance.items(token, tokenId);

    // truncate t0 and t1 to fit into 32 bits
    t0 = uint32(_t0);
    t1 = uint32(_t1);

    // calculate and assign the rest of the data required
    t = uint32(now);
    p = price(t0, t1, t, p0, p1); // in wei

    // finally, get the owner
    owner = auctionInstance.owners(token, tokenId);

    // return the data calculated as a tuple
    return (t0, t1, t, p0, p1, p, owner);
  }

  /**
   * @dev Returns item sale status parameters as a packed structure
   * @dev Arithmetic overflow fixed version of `DutchAuction.getTokenSaleStatus` function
   * @dev The data returned:
   *      [0] t0  auction start time (unix timestamp), 32 bits
   *      [1] t1  auction end time (unix timestamp), 32 bits
   *      [2] t   current time (unix timestamp), 32 bits
   *      [3] p0  starting price (Gwei), 40 bits
   *      [4] p1  final price (Gwei), 40 bits
   *      [5] p   current price (Gwei), 40 bits
   * @param auction DutchAuction instance, providing `items(address, uint32)` interface
   * @param token ERC721 deployed instance address
   * @param tokenId id of the item
   * @return a packed structure containing all auction status for a particular ERC721 item
   */
  function getSaleStatusPacked(address auction, address token, uint32 tokenId) constant public returns(uint184) {
    // prepare local variables to call `getTokenSaleStatus`
    uint32 t0;
    uint32 t1;
    uint32 t;
    uint128 p0;
    uint128 p1;
    uint128 p;

    // delegate call to `getTokenSaleStatus` and get the status as a tuple
    (t0, t1, t, p0, p1, p, ) = getTokenSaleStatus(auction, token, tokenId);

    // pack variables and return
    return uint184(t0) << 152 | uint152(t1) << 120 | uint120(p0 / GWEI) << 80 | uint80(p1 / GWEI) << 40 | uint40(p / GWEI);
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
  function price(uint32 _t0, uint32 _t1, uint32 _t, uint128 _p0, uint128 _p1) public pure returns(uint128) {
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

    // convert all numbers into uint256 to get rid of possible arithmetic overflow
    uint256 t0 = uint256(_t0);
    uint256 t1 = uint256(_t1);
    uint256 t  = uint256(_t);
    uint256 p0 = uint256(_p0);
    uint256 p1 = uint256(_p1);

    // apply formula, round down to be multiple of 1 Gwei and return
    return ceil1000000000(uint128(p0 - (t - t0) * (p0 - p1) / (t1 - t0)));
  }

  /**
   * @dev Auxiliary function to round down price to be multiple of 1 Gwei (1000000000)
   * @param p price in wei
   * @return price in wei, rounded down to be multiple of 1 Gwei (1000000000)
   */
  function ceil1000000000(uint128 p) public pure returns(uint128) {
    return p / GWEI * GWEI;
  }
}
