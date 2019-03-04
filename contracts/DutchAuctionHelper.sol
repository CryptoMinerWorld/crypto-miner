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
  uint80 private constant GWEI = 1000000000;

  /**
   * @dev Similarly to `GemERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token GemERC721 instance, providing `getPackedCollection(owner) => uint80` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, containing:
   *      gem id, 32 bits
   *      gem color, 8 bits
   *      gem level, 8 bits
   *      gem grade type, 8 bits
   *      gem grade value, 24 bits
   *      auction start time (unix timestamp), 32 bits
   *      auction end time (unix timestamp), 32 bits
   *      starting price (Gwei), 32 bits
   *      final price (Gwei), 32 bits
   *      current price (Gwei), 32 bits
   */
  function getGemCollectionByOwner(address auction, address token, address owner) public constant returns(uint240[]) {
    // get all the tokens available on the auction
    uint80[] memory allAuctionTokens = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint240[] memory ownerTokens = new uint240[](allAuctionTokens.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint80 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < allAuctionTokens.length; i++) {
      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, uint32(allAuctionTokens[i] >> 48)) == owner) {
        // feed token packed structure with additional auction data
        uint224 status = DutchAuction(auction).getTokenSaleStatus(token, uint32(allAuctionTokens[i] >> 48));
        // drop `t` and `fee` from the packed structure
        // and copy it to a destination array - `ownerTokens`
        ownerTokens[k++] = uint240(allAuctionTokens[i]) << 160 | uint160((status >> 160) << 96) | uint96(status >> 32);
      }
    }

    // at this point array `ownerTokens` contains `k` elements,
    // which is in most cases less than `ownerTokens.length`

    // if `k`, however, is equal to `ownerTokens.length` - we're fine
    if(k == ownerTokens.length) {
      // and just return what we have - `ownerTokens`
      return ownerTokens;
    }

    // to cleanup the destination array - create a new one of length `k`
    uint240[] memory result = new uint240[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint80 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = ownerTokens[j];
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
   *        gem id, 32 bits
   *        gem color, 8 bits
   *        gem level, 8 bits
   *        gem grade type, 8 bits
   *        gem grade value, 24 bits
   *        auction start time (unix timestamp), 32 bits
   *        auction end time (unix timestamp), 32 bits
   *        starting price (Gwei), 32 bits
   *        final price (Gwei), 32 bits
   *        current price (Gwei), 32 bits
   *      if an array index is odd:
   *        gem owner address
   */
  function getAllGems(address auction, address token) public constant returns(uint240[]) {
    // get all the tokens available on the auction
    uint80[] memory packed = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens extending the properties
    uint240[] memory extended = new uint240[](2 * packed.length);

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint32 tokenId = uint32(packed[i] >> 48);
      // feed token packed structure with additional auction data
      uint224 status = DutchAuction(auction).getTokenSaleStatus(token, tokenId);
      // drop `t` and `fee` from the packed structure
      // and copy it to a destination array - `ownerTokens`
      extended[2 * i] = uint240(packed[i]) << 160 | uint160((status >> 160) << 96) | uint96(status >> 32);
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
   *      starting price (Gwei), 32 bits
   *      final price (Gwei), 32 bits
   *      current price (Gwei), 32 bits
   */
  function getCountryCollectionByOwner(address auction, address token, address owner) public constant returns(uint200[]) {
    // get all the tokens available on the auction
    uint40[] memory allAuctionTokens = CountryERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint200[] memory ownerTokens = new uint200[](allAuctionTokens.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint40 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < allAuctionTokens.length; i++) {
      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, uint8(allAuctionTokens[i] >> 32)) == owner) {
        // feed token packed structure with additional auction data
        uint224 status = DutchAuction(auction).getTokenSaleStatus(token, uint8(allAuctionTokens[i] >> 32));
        // drop `t` and `fee` from the packed structure
        // and copy it to a destination array - `ownerTokens`
        ownerTokens[k++] = uint200(allAuctionTokens[i]) << 160 | uint160((status >> 160) << 96) | uint96(status >> 32);
      }
    }

    // at this point array `ownerTokens` contains `k` elements,
    // which is in most cases less than `ownerTokens.length`

    // if `k`, however, is equal to `ownerTokens.length` - we're fine
    if(k == ownerTokens.length) {
      // and just return what we have - `ownerTokens`
      return ownerTokens;
    }

    // to cleanup the destination array - create a new one of length `k`
    uint200[] memory result = new uint200[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint40 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = ownerTokens[j];
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
   *        starting price (Gwei), 32 bits
   *        final price (Gwei), 32 bits
   *        current price (Gwei), 32 bits
   *      if an array index is odd:
   *        country owner address
   */
  function getAllCountries(address auction, address token) public constant returns(uint200[]) {
    // get all the tokens available on the auction
    uint40[] memory packed = CountryERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens extending the properties
    uint200[] memory extended = new uint200[](2 * packed.length);

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint8 tokenId = uint8(packed[i] >> 32);
      // feed token packed structure with additional auction data
      uint224 status = DutchAuction(auction).getTokenSaleStatus(token, uint8(packed[i] >> 32));
      // drop `t` and `fee` from the packed structure
      // and copy it to a destination array - `ownerTokens`
      extended[2 * i] = uint200(packed[i]) << 160 | uint160((status >> 160) << 96) | uint96(status >> 32);
      // add previous owner address to the resulting array
      extended[2 * i + 1] = uint160(DutchAuction(auction).owners(token, tokenId));
    }

    // return the result
    return extended;
  }


  /**
   * @dev Returns item sale status parameters as a tupple of six elements
   * @dev Arithmetic overflow fixed version of `DutchAuction.getTokenSaleStatus` function
   * @dev The data returned:
   *      [0] t0  auction start time (unix timestamp)
   *      [1] t1  auction end time (unix timestamp)
   *      [2] t   current time (unix timestamp)
   *      [3] p0  starting price (wei)
   *      [4] p1  final price (wei)
   *      [5] p   current price (wei)
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
