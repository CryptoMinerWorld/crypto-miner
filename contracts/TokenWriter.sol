pragma solidity 0.5.8;

import "./AccessControl.sol";

/**
 * @dev Gem ERC721 v2 interface (current)
 */
interface GemV2 {
  /**
   * @dev Creates new token with token ID specified
   *      and assigns an ownership `_to` for this token
   * @dev Allows setting initial tokens' properties
   * @dev Requires caller to be token creator (have `ROLE_TOKEN_CREATOR` permission)
   * @dev Requires caller to be bulk token creator (have `ROLE_BULK_CREATOR` permission)
   *      if creating more than one token in a single transaction
   * @dev Requires caller to be age provider (have `ROLE_AGE_PROVIDER` permission) -
   *      if setting initial energetic age for the token
   * @param _to an address to mint token to (first owner of the token)
   * @param _tokenId ID of the token to mint
   * @param _plotId ID of the plot that gem "belongs to" (was found in)
   * @param _color gem color
   * @param _level gem level
   * @param _grade grade of the gem,
   *      high 8 bits represent grade type,
   *      low 24 bits - grade value
   * @param _age energetic age of the gem
   */
  function mintWith(address _to, uint32 _tokenId, uint24 _plotId, uint8 _color, uint8 _level, uint32 _grade, uint32 _age) external;
}

/**
 * @dev Country ERC721 v2 interface (current)
 */
interface CountryV2 {
  /**
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Initial token's properties are predefined by its ID
   * @param _to an address to assign created token ownership to
   * @param _tokenId ID of the token to create
   */
  function mint(address _to, uint8 _tokenId) external;
}

/**
 * @dev Helper smart contract to read Gem and Country ERC721 tokens
 */
contract TokenWriter is AccessControl {
  /**
   * @dev Save the deployment time of the smart contract
   */
  uint64 public deployed = uint64(now);

  /**
   * @dev For security reasons allow write operations only
   *      for one week after contract deployment
   */
  uint64 public constant SECURITY_TIMEOUT = 7 days;

  /**
   * @dev Gem writer is responsible for gem minting
   */
  uint32 public constant ROLE_GEM_WRITER = 0x00000001;

  /**
   * @dev Country writer is responsible for country minting
   */
  uint32 public constant ROLE_COUNTRY_WRITER = 0x00000002;

  /**
   * @dev Creates several gems in single transaction
   * @dev Requires sender to have `ROLE_GEM_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @param gemAddress deployed Gem ERC721 v2 instance
   * @param _to an address to mint tokens to
   * @param _data an array of packed gem data
   */
  function writeOwnerGemV2Data(address gemAddress, address _to, uint128[] memory _data) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_GEM_WRITER));

    // ensure _to address is not empty
    require(_to != address(0));

    // ensure data array contains some elements
    require(_data.length != 0);

    // iterate over data array
    for(uint16 i = 0; i < _data.length; i++) {
      // mint the gem while unpacking the data
      GemV2(gemAddress).mintWith(
        _to,                      // to
        uint24(_data[i] >> 104),  // gem ID
        uint24(_data[i] >> 80),   // plot ID
        uint8(_data[i] >> 72),    // color
        uint8(_data[i] >> 64),    // level
        uint32(_data[i] >> 32),   // grade
        uint32(_data[i])          // energetic age
      );
    }
  }

  /**
   * @dev Creates several gems in single transaction
   * @dev Requires sender to have `ROLE_GEM_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @param gemAddress deployed Gem ERC721 v2 instance
   * @param owners an array of addresses to mint tokens to
   * @param _data an array of packed gem data
   */
  function writeBulkGemV2Data(address gemAddress, address[] memory owners, uint128[] memory _data) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_GEM_WRITER));

    // ensure arrays are equal in length - data consistency
    require(owners.length == _data.length);

    // ensure data array contains some elements
    require(_data.length != 0);

    // iterate over both arrays
    for(uint16 i = 0; i < owners.length; i++) {
      // mint the gem while unpacking the data
      GemV2(gemAddress).mintWith(
        owners[i],                // to
        uint24(_data[i] >> 104),  // gem ID
        uint24(_data[i] >> 80),   // plot ID
        uint8(_data[i] >> 72),    // color
        uint8(_data[i] >> 64),    // level
        uint32(_data[i] >> 32),   // grade
        uint32(_data[i])          // energetic age
      );
    }
  }

  /**
   * @dev Creates several countries in single transaction
   * @dev Requires sender to have `ROLE_COUNTRY_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @param countryAddress deployed Gem ERC721 v2 instance
   * @param idOffset token ID offset to be used to, the token ID for
   *      an address at index `i` in `addresses` array is `offset + i + 1`
   * @param owners an array of addresses to mint tokens to
   */
  function writeCountryV2Data(address countryAddress, uint8 idOffset, address[] memory owners) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_COUNTRY_WRITER));

    // ensure owners array contains some elements
    require(owners.length != 0);

    // iterate and mint
    for(uint8 i = 0; i < owners.length; i++) {
      CountryV2(countryAddress).mint(owners[i], idOffset + i + 1);
    }
  }
}
