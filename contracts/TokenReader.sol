pragma solidity 0.5.8;

import "./AddressUtils.sol";

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
 * @dev Dutch Auction V1 interface
 */
interface AuctionV1 {
  /**
   * @dev Gets an owner of a token
   * @param _token deployed token instance address
   * @param _tokenId ID of the token listed on the auction
   * @return address of the owner of the token
   */
  function owners(address _token, uint256 _tokenId) external view returns(address);
}

/**
 * @dev RefPointsTracker v1 interface (old)
 */
interface RefV1 {
  /**
   * @notice Lists all referral points holders addresses
   * @return an array of referral points holders addresses,
   *      doesn't contain duplicates
   */
  function getAllHolders() external view returns (address[] memory);

  /**
   * @notice Lists all known addresses as an array
   * @return an array of known addresses,
   *      doesn't contain duplicates
   */
  function getKnownAddresses() external view returns(address[] memory);

  /**
   * @notice Issued referral points counter, tracks how much points
   *      a particular address earned over the entire time
   * @dev Initially zero, may only increase over time, must be equal to
   *      or greater than `consumed` - consumed referral points counter
   */
  function issued(address) external view returns(uint256);

  /**
   * @notice Consumed referral points counter, tracks how much points
   *      a particular address consumed (spent) over the entire time
   * @dev Initially zero, may only increase over time, must be equal to
   *      or less than `issued` - issued referral points counter
   */
  function consumed(address) external view returns(uint256);

  /**
   * @notice ERC20-compatible alias for `available` referral points counter
   * @param owner address of the player address to get available referral points for
   * @return available referral points counter for address specified
   */
  function balanceOf(address owner) external view returns (uint256);
}

/**
 * @dev Helper smart contract to read Gem and Country ERC721 tokens
 */
contract TokenReader {
  /**
   * @dev Reads Gem ERC721 token data, with pagination
   * @param gemAddress deployed Gem ERC721 v1 instance
   * @param auctionAddress deployed Dutch Auction instance which may own token
   * @param offset an offset to read from, must be less than total token supply
   * @param length number of elements to read starting from offset, must not be zero
   */
  function readGemV1Data(
    address gemAddress,
    address auctionAddress,
    uint32 offset,
    uint32 length
  ) public view returns(address[] memory, uint128[] memory) {
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
      uint256 tokenId = uint32(GemV1(gemAddress).tokenByIndex(i + offset));
      // prepare tuple variables to read packed data into and read data
      uint256 high;
      uint256 low;
      (high, low) = GemV1(gemAddress).getPacked(tokenId);

      // ensure plotId fits into uint16
      require(uint16(high >> 224) == uint32(high >> 224));

      // save owner
      owners[i] = address(low);

      // in case when owner is an auction
      if(owners[i] == auctionAddress) {
        // fix the owner address by fetching the real owner
        owners[i] = AuctionV1(auctionAddress).owners(gemAddress, tokenId);
      }

      // pack token properties
      data[i] = uint128(tokenId) << 96
              | uint96(uint16(high >> 224)) << 80
              | uint80(uint8(high >> 184)) << 72
              | uint72(uint8(high >> 144)) << 64
              | uint64(uint32(high >> 80)) << 32
              // convert block number difference into minutes,
              // assuming average block size is 15 seconds
              | uint32(block.number - uint32(low >> 224)) / 4;
    }

    // return the result
    return (owners, data);
  }

  /**
   * @dev Reads all the Country ERC721 token data, entirely
   * @param countryAddress deployed Country ERC721 v1 instance
   * @param auctionAddress deployed Dutch Auction instance which may own token
   * @return an array containing 192 elements,
   *      each element `i` representing a token ID = `i + 1`, containing:
   *      - token owner address, 160 bits
   */
  function readCountryV1Data(address countryAddress, address auctionAddress) public view returns(address[] memory) {
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

        // in case when owner is an auction
        if(result[i] == auctionAddress) {
          // fix the owner address by fetching the real owner
          result[i] = AuctionV1(auctionAddress).owners(countryAddress, i + 1);
        }
      }
    }

    // return the result
    return result;
  }

  /**
   * @dev Reads referral points data - points issued and consumed
   * @param refAddress deployed RefPointsTracker v1 instance
   * @return ref points holders array
   */
  function readRefPointsData(address refAddress) public view returns(uint256[] memory) {
    // get pointer to the instance
    RefV1 refV1 = RefV1(refAddress);

    // read all ref points holders addresses
    address[] memory addr = refV1.getAllHolders();

    // allocate memory for result
    uint256[] memory result = new uint256[](addr.length);

    // fill in the result array, pack the data
    for(uint256 i = 0; i < addr.length; i++) {
      // pack and assign the result data entry
      result[i] = uint256(refV1.issued(addr[i])) << 224
                | uint224(refV1.consumed(addr[i])) << 192
                | uint192(refV1.balanceOf(addr[i])) << 160
                | uint160(addr[i]);
    }

    // return the result
    return result;
  }

  /**
   * @dev Reads referral points data - known addresses
   * @param refAddress deployed RefPointsTracker v1 instance
   * @return known addresses packed structure containing also ref points if any
   */
  function readKnownAddresses(address refAddress) public view returns(uint256[] memory) {
    // get pointer to the instance
    RefV1 refV1 = RefV1(refAddress);

    // read all known addresses data
    address[] memory addr = refV1.getKnownAddresses();

    // allocate memory for result
    uint256[] memory result = new uint256[](addr.length);

    // fill in the result array, pack the data
    for(uint256 i = 0; i < addr.length; i++) {
      // pack and assign the result data entry
      result[i] = uint256(refV1.issued(addr[i])) << 224
                | uint224(refV1.consumed(addr[i])) << 192
                | uint192(refV1.balanceOf(addr[i])) << 160
                | uint160(addr[i]);
    }

    // return the result
    return result;
  }

  /**
   * @dev A function to check if an array of addresses contains smart contracts
   * @param addresses an array of input addresses
   * @return a boolean array indicating if an address is a smart contract, true - YES
   */
  function isContract(address[] memory addresses) public view returns(bool[] memory) {
    // allocate memory for the result
    bool[] memory result = new bool[](addresses.length);

    // iterate the array and fill in the result
    for(uint256 i = 0; i < addresses.length; i++) {
      // by determining if the address is a contract
      result[i] = AddressUtils.isContract(addresses[i]);
    }

    // return the result
    return result;
  }
}
