pragma solidity 0.4.23;

import "./GemERC721.sol";

/// @dev A proxy smart contract to get bulk gem data
///      in a single transaction to reduce amount of queries to INFURA
contract GemHelper {
  /// @dev Allows to fetch collection of gems, including internal gems data
  ///      in a single function, useful when connecting to external node like INFURA
  function getPackedCollection(address instanceAddress, address owner) public constant returns (uint64[]) {
    // connect to a GemERC721 instance
    GemERC721 instance = GemERC721(instanceAddress);

    // get an array of Gem IDs owned by an `owner` address
    uint32[] memory tokenIds = instance.getCollection(owner);

    // how many gems are there in a collection
    uint32 balance = uint32(tokenIds.length);

    // data container to store the result
    uint64[] memory result = new uint64[](balance);

    // fetch gem info one by one and pack into structure
    for(uint32 i = 0; i < balance; i++) {
      // gem ID to work with
      uint32 tokenId = tokenIds[i];
      // TODO: optimize using GemERC721.getProperties
      // get the gem properties and pack them together
      uint8 color = instance.getColor(tokenId);
      uint8 level = instance.getLevel(tokenId);
      uint16 grade = instance.getGrade(tokenId);

      // pack the data
      result[i] = uint64(tokenId) | uint32(color) << 24 | uint24(level) << 16 | grade;
    }

    // return the packed data structure
    return result;
  }
}
