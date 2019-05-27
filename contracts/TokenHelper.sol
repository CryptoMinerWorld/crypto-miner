pragma solidity 0.5.8;

/**
 * @dev Gem ERC721 v1 interface (old)
 */
interface GemV1 {
  /**
   * @notice Total number of existing tokens (tracked by this contract)
   * @return A count of valid tokens tracked by this contract,
   *    where each one of them has an assigned and
   *    queryable owner not equal to the zero address
   */
  function totalSupply() external view returns (uint256);

  /**
   * @notice Enumerate valid tokens
   * @dev Throws if `_index` >= `totalSupply()`.
   * @param _index a counter less than `totalSupply()`
   * @return The token ID for the `_index`th token, unsorted
   */
  function tokenByIndex(uint256 _index) external view returns (uint256);

  /**
   * @dev Gets a gem by ID, representing it as two integers.
   *      The two integers are tightly packed with a gem data:
   *      First integer (high bits) contains (from higher to lower bits order):
   *          coordinates:
   *            plotId,
   *            depth (block ID),
   *            gemNum (gem ID within a block)
   *          color,
   *          levelModified,
   *          level,
   *          gradeModified,
   *          grade,
   *          stateModified,
   *          state,
   *      Second integer (low bits) contains (from higher to lower bits order):
   *          creationTime,
   *          index,
   *          ownershipModified,
   *          owner
   * @dev Throws if gem doesn't exist
   * @param _tokenId ID of the gem to fetch
   * @return token data packed into a tuple
   */
  function getPacked(uint256 _tokenId) external view returns(uint256, uint256);
}

/**
 * @dev Country ERC721 v1 interface (old)
 */
interface CountryV1 {
  /**
   * @dev Token bitmap – bitmap of 192 elements indicating existing (minted) tokens
   * @dev For any i ∈ [0, 191] - tokenMap[i] (which is tokenMap >> i & 0x1)
   *      is equal to one if token with ID i exists and to zero if it doesn't
   * @return token bitmap of 192 elements
   */
  function tokenMap() external view returns(uint192);

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `countries` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param _tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint256 _tokenId) external view returns (address);
}

/**
 * @dev Helper smart contract to read Gem and Country ERC721 tokens
 */
contract TokenHelper {
  /**
   * @dev Reads Gem ERC721 token data, with pagination
   * @param gemAddress deployed Gem ERC721 v1 instance
   * @param offset an offset to read from, must be less than total token supply
   * @param length number of elements to read starting from offset, must not be zero
   */
  function readGemV1Data(address gemAddress, uint32 offset, uint32 length) public view returns(address[] memory, uint128[] memory) {
    // determine token total supply
    uint256 supply = GemV1(gemAddress).totalSupply();

    // ensure offset is not too big
    if(offset >= supply) {
      // just return an empty array in that case
      return (new address[](0), new uint128[](0));
    }

    // calculate the difference
    uint256 left = supply - offset;

    // the result will contain length elements at most
    // but no more than difference calculated
    address[] memory owners = new address[](left < length? left: length);
    uint128[] memory data = new uint128[](owners.length);

    // build the result element by element
    for(uint32 i = 0; i < owners.length; i++) {
      // read token ID
      uint256 id = uint32(GemV1(gemAddress).tokenByIndex(i + offset));
      // prepare tuple variables to read packed data into and read data
      uint256 high;
      uint256 low;
      (high, low) = GemV1(gemAddress).getPacked(id);

      // extract the variables of interest
      uint32 plotId = uint32(high >> 224);
      require(uint16(plotId) == plotId); // ensure plotId fits into uint16
      uint8 color = uint8(high >> 184);
      uint8 level = uint8(high >> 144);
      uint32 grade = uint32(high >> 80);
      // convert block number difference into minutes,
      // assuming average block size is 15 seconds
      uint32 age = uint32(block.number - uint32(low >> 224)) / 4;

      // save owner
      owners[i] = address(low);

      // pack token properties
      data[i] = uint128(id) << 96
              | uint96(uint16(plotId)) << 80
              | uint80(color) << 72
              | uint72(level) << 64
              | uint64(grade) << 32
              | age;
    }

    // return the result
    return (owners, data);
  }

  /**
   * @dev Reads all the Country ERC721 token data, entirely
   * @param countryAddress deployed Country ERC721 v1 instance
   * @return an array containing 192 elements,
   *      each element `i` representing a token ID = `i + 1`, containing:
   *      - token owner address, 160 bits
   */
  function readCountryV1Data(address countryAddress) public view returns(address[] memory) {
    // read the country map
    uint192 map = CountryV1(countryAddress).tokenMap();

    // the result will contain always 192 elements
    address[] memory result = new address[](192);

    // build the result element by element
    for(uint8 i = 0; i < 192; i++) {
      // verify if token at index i exists
      if(map >> i & 1 == 1) {
        // and save its owner into result
        result[i] = CountryV1(countryAddress).ownerOf(i + 1);
      }
    }

    // return the result
    return result;
  }

}
