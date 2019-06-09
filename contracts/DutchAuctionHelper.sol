pragma solidity 0.5.8;

import "./DutchAuction.sol";
import "./GemERC721.sol";

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
  /**
   * @dev Similarly to `GemERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint256) => address` interface
   * @param token GemERC721 instance, providing `getPackedCollection(owner) => uint200` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, containing:
   *      index 3i - 200 low bits
   *        gem ID (24 bits)
   *        gem color (8 bits)
   *        gem level (8 bits)
   *        gem grade (32 bits)
   *        gem plots mined (24 bits)
   *        gem blocks mined (32 bits)
   *        gem energetic age (32 bits)
   *        gem state (8 low bits)
   *      index 3i + 1 – 256 bits
   *        auction start time, t0, 32 bits
   *        auction end time, t1, 32 bits
   *        starting price, p0, 96 bits
   *        final price, p1, 96 bits
   *      index 3i + 2
   *        current price, p, 96 bits
   *        token owner, 160 bits
   */
  function getGemCollectionByOwner(address auction, address token, address owner) public view returns(uint256[] memory) {
    // get all the tokens available on the auction
    uint200[] memory packed = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint256[] memory extended = new uint256[](3 * packed.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint24 k = 0;

    // iterate over all the tokens on the auction
    for(uint24 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint24 tokenId = uint24(packed[i] >> 176);

      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, tokenId) == owner) {
        // construct packed result items:
        // 3i
        extended[3 * k] = packed[i];
        // 3i + 1 and 3i + 2
        (extended[3 * k + 1], extended[3 * k + 2]) = DutchAuction(auction).getTokenSaleStatusPacked(token, tokenId);
        // increment counter
        k++;
      }
    }

    // at this point array `ownerTokens` contains `3k` elements,
    // which is in most cases less than `ownerTokens.length`

    // if `k`, however, is equal to `ownerTokens.length` - we're fine
    if(3 * k == extended.length) {
      // and just return what we have - `ownerTokens`
      return extended;
    }

    // to cleanup the destination array - create a new one of length `k`
    uint256[] memory result = new uint256[](3 * k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint24 j = 0; j < 3 * k; j++) {
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
   *      index 3i - 200 low bits
   *        gem ID (24 bits)
   *        gem color (8 bits)
   *        gem level (8 bits)
   *        gem grade (32 bits)
   *        gem plots mined (24 bits)
   *        gem blocks mined (32 bits)
   *        gem energetic age (32 bits)
   *        gem state (8 low bits)
   *      index 3i + 1 – 256 bits
   *        auction start time, t0, 32 bits
   *        auction end time, t1, 32 bits
   *        starting price, p0, 96 bits
   *        final price, p1, 96 bits
   *      index 3i + 2
   *        current price, p, 96 bits
   *        token owner, 160 bits
   */
  function getAllGems(address auction, address token) public view returns(uint256[] memory) {
    // get all the tokens available on the auction
    uint200[] memory packed = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens extending the properties
    uint256[] memory extended = new uint256[](3 * packed.length);

    // iterate over all the tokens on the auction
    for(uint24 i = 0; i < packed.length; i++) {
      // extract tokenId
      uint24 tokenId = uint24(packed[i] >> 176);

      // construct packed result items:
      // 3i
      extended[3 * i] = packed[i];
      // 3i + 1 and 3i + 2
      (extended[3 * i + 1], extended[3 * i + 2]) = DutchAuction(auction).getTokenSaleStatusPacked(token, tokenId);
    }

    // return the result
    return extended;
  }

}
