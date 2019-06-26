pragma solidity 0.5.8;

import "./AccessMultiSig.sol";

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
  function mintWith(address _to, uint24 _tokenId, uint24 _plotId, uint8 _color, uint8 _level, uint32 _grade, uint32 _age) external;
}

/**
 * @dev Country ERC721 v2 interface (current)
 */
interface CountryV2 {
  /**
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Initial token's properties are predefined by its ID
   * @dev Requires caller to be token creator (have `ROLE_TOKEN_CREATOR` permission)
   * @param _to an address to assign created token ownership to
   * @param _tokenId ID of the token to create
   */
  function mint(address _to, uint8 _tokenId) external;
}

/**
 * @dev RefPointsTracker V2 interface (current)
 */
interface RefV2 {
  /**
   * @notice Verifies if an address is known to the tracker
   * @dev Address is known if it was added as known by `ROLE_SELLER`
   *      or was issued some referral points by `ROLE_REF_POINTS_ISSUER`
   * @param _address address to query known status for
   * @return true if address is known (added ot has some ref points issued)
   */
  function isKnown(address _address) external view returns(bool);

  /**
   * @notice Issues referral points to a player address
   * @dev Requires sender to have `ROLE_REF_POINTS_ISSUER` permission
   * @param _to an address to issue referral points to
   * @param _amount number of referral points to issue
   */
  function issueTo(address _to, uint256 _amount) external;

  /**
   * @notice Consumes referral points from a player address
   * @dev Requires sender to have `ROLE_REF_POINTS_CONSUMER` permission
   * @param _from an address to consume referral points from
   * @param _amount number of referral points to consume
   */
  function consumeFrom(address _from, uint256 _amount) external;

  /**
   * @dev A callback function called by seller on successful sale
   *      and some wei being spent by the player
   * @dev Adds address specified to `knownAddresses` mapping
   * @dev Requires sender to have `ROLE_SELLER` permission
   * @param _address an address which spent some wei (bought something)
   */
  function addKnownAddress(address _address) external;
}

/**
 * @dev Silver/Gold V2 interface (current),
 *      works for any kind of mintable ERC20 token
 */
interface MintV2 {
  /**
   * @dev Mints (creates) some tokens to address specified
   * @dev Requires sender to have `ROLE_TOKEN_CREATOR` permission
   * @param _to an address to mint tokens to
   * @param _value an amount of tokens to mint (create)
   */
  function mint(address _to, uint256 _value) external;
}

/**
 * @dev Helper smart contract to read Gem and Country ERC721 tokens
 */
contract TokenWriter is AccessMultiSig {
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
   * @dev Ref Points writer is responsible for referral points issuing
   */
  uint32 public constant ROLE_REF_WRITER = 0x00000004;

  /**
   * @dev ERC20 writer is responsible for issuing ERC20 tokens (Silver, Gold)
   */
  uint32 public constant ROLE_ERC20_WRITER = 0x00000008;

  /**
   * @dev Creates several gems in single transaction
   * @dev Requires sender to have `ROLE_GEM_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @dev Throws if input array is empty
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
   * @dev Throws if input array is empty
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
   * @dev Throws if input array is empty
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
      // if owner address passed is zero no need to mint it - skip it
      if(owners[i] != address(0)) {
        // this is required since an array index keeps track of country ID
        CountryV2(countryAddress).mint(owners[i], idOffset + i + 1);
      }
    }
  }

  /**
   * @dev Issues referral points to players addresses
   * @dev Requires sender to have `ROLE_REF_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @dev Throws if input array is empty
   * @param trackerAddress deployed RefPointsTracker v2 instance
   * @param _data array of packed data structures containing
   *      issued, 32 bits
   *      consumed, 32 bits
   *      issued - consumed, 32 bits
   *      address, 160 bits
   */
  function writeRefPointsData(address trackerAddress, uint256[] memory _data) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_REF_WRITER));

    // verify input arrays are not empty
    require(_data.length != 0);

    // iterate over both arrays (they have same size)
    for(uint256 i = 0; i < _data.length; i++) {
      // verify issued, consumed and balance match (data integrity check)
      require(uint32(_data[i] >> 224) == uint32(_data[i] >> 192) + uint32(_data[i] >> 160));

      // verify issued is not zero
      require(_data[i] >> 160 != 0);

      // ensure not to write twice – verify address is not yet known
      require(!RefV2(trackerAddress).isKnown(address(_data[i])));

      // issue referral points for each element
      // delegate call to `__issueTo`
      RefV2(trackerAddress).issueTo(address(_data[i]), uint32(_data[i] >> 224));

      // consume referral points for each element - if not zero
      if(uint32(_data[i] >> 192) != 0) {
        // delegate call to `__consumeFrom`
        RefV2(trackerAddress).consumeFrom(address(_data[i]), uint32(_data[i] >> 192));
      }
    }
  }

  /**
   * @dev Adds addresses specified to `knownAddresses` mapping
   * @dev Requires sender to have `ROLE_REF_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @dev Throws if input array is empty
   * @param trackerAddress deployed RefPointsTracker v2 instance
   * @param _data array of packed data structures containing
   *      issued, 32 bits
   *      consumed, 32 bits
   *      issued - consumed, 32 bits
   *      address, 160 bits
   */
  function writeKnownAddrData(address trackerAddress, uint256[] memory _data) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_REF_WRITER));

    // verify input array is not empty
    require(_data.length != 0);

    // iterate over the array
    for(uint256 i = 0; i < _data.length; i++) {
      // verify issued, consumed and balance are all zeros (data integrity check)
      require(_data[i] >> 160 == 0);

      // and each one to the `knownAddresses` mapping
      RefV2(trackerAddress).addKnownAddress(address(_data[i]));
    }
  }

  /**
   *
   * @dev Requires sender to have `ROLE_GEM_WRITER` permission
   * @dev Works only for 1 week after deployment (`SECURITY_TIMEOUT`)
   * @dev Throws if input array is empty
   * @param tokenAddress deployed ERC20 instance with mint() interface
   * @param _data array of packed data structures containing
   *      amount of tokens owned, 96 bits
   *      owner address, 160
   */
  function writeERC20Data(address tokenAddress, uint256[] memory _data) public {
    // ensure smart contract is fresh (security constraint)
    require(now - deployed < SECURITY_TIMEOUT);

    // verify sender permissions
    require(isSenderInRole(ROLE_REF_WRITER));

    // verify input array is not empty
    require(_data.length != 0);

    // iterate over the array
    for(uint256 i = 0; i < _data.length; i++) {
      // verify balance is not zero (amount of tokens owned)
      require(_data[i] >> 160 != 0);

      // verify the address itself is not zero, the data comes from
      // external source and parsed so additional check would be good
      require(uint160(_data[i]) != 0);

      // mint required amount of ERC20 tokens
      MintV2(tokenAddress).mint(address(_data[i]), _data[i] >> 160);
    }

  }

}
