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
  /**
   * @dev Similarly to `GemERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token GemERC721 instance, providing `getPackedCollection(owner) => uint80` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, equal to `GemERC721.getPackedCollection`
   */
  function getGemCollection(address auction, address token, address owner) public constant returns(uint80[]) {
    // get all the tokens available on the auction
    uint80[] memory allAuctionTokens = GemERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint80[] memory ownerTokens = new uint80[](allAuctionTokens.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint80 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < allAuctionTokens.length; i++) {
      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, uint32(allAuctionTokens[i] >> 48)) == owner) {
        // copy it to a destination array - `ownerTokens`
        ownerTokens[k++] = allAuctionTokens[i];
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
    uint80[] memory result = new uint80[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint80 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = ownerTokens[j];
    }

    // we're done, return the result
    return result;
  }


  /**
   * @dev Similarly to `CountryERC721.getPackedCollection`, returns packed collection
   *      of tokens for a particular owner
   * @param auction DutchAuction instance, providing `owner(address, uint32) => address` interface
   * @param token CountryERC721 instance, providing `getPackedCollection(owner) => uint40` interface
   * @param owner address to query tokens for
   * @return packed tokens collection structure, equal to `CountryERC721.getPackedCollection`
   */
  function getCountryCollection(address auction, address token, address owner) public constant returns(uint40[]) {
    // get all the tokens available on the auction
    uint40[] memory allAuctionTokens = CountryERC721(token).getPackedCollection(auction);

    // create an empty array to copy tokens owned by `owner`
    uint40[] memory ownerTokens = new uint40[](allAuctionTokens.length);

    // counter `k` counts number of the tokens owned by `owner`
    uint40 k = 0;

    // iterate over all the tokens on the auction
    for(uint80 i = 0; i < allAuctionTokens.length; i++) {
      // and if the token belongs to `owner` (previous ownership technically)
      if(DutchAuction(auction).owners(token, uint8(allAuctionTokens[i] >> 32)) == owner) {
        // copy it to a destination array - `ownerTokens`
        ownerTokens[k++] = allAuctionTokens[i];
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
    uint40[] memory result = new uint40[](k);

    // iterate over first `k` (non-empty) elements of `ownerTokens`
    for(uint40 j = 0; j < k; j++) {
      // and copy elements one by one into resulting array
      result[j] = ownerTokens[j];
    }

    // we're done, return the result
    return result;
  }

}
