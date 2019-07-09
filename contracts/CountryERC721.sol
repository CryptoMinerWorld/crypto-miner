pragma solidity 0.5.8;

import "./AddressUtils.sol";
import "./StringUtils.sol";
import "./Fractions8.sol";
import "./ERC721Receiver.sol";
import "./ERC721Core.sol";

/**
 * @title Country ERC721 Token
 *
 * @notice Country is unique tradable entity. Non-fungible.
 * @dev A country is an ERC721 non-fungible token, which maps Token ID,
 *      a 8 bit number in range [1, 192] to a set of country properties -
 *      number of plots and owner's tax rate.
 * @dev Country token supports only minting of predefined countries,
 *      its not possible to destroy a country.
 * @dev Up to 192 countries are defined during contract deployment and initialization.
 */
contract CountryERC721 is ERC721Core {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x7a47eb77998c6d5e94cf0c762ddf7c6afaeee3b1565bd9955f5bbd392cb2b298;

  /**
   * @dev ERC20 compliant token symbol
   */
  string public constant symbol = "CTY";

  /**
   * @dev ERC20 compliant token name
   */
  string public constant name = "Country – CryptoMiner World";

  /**
   * @dev ERC20 compliant token decimals
   * @dev Equal to zero – since ERC721 token is non-fungible
   *      and therefore non-divisible
   */
  uint8 public constant decimals = 0;

  /**
   * @dev Token data structure (Country Data Structure)
   * @dev Occupies 1 storage slot (256 bits)
   */
  struct Country {
    /**
     * @dev Number of land plots country has,
     *      proportional to the country area
     * @dev Immutable
     */
    uint16 plots;

    /**
     * @dev Percentage country owner receives from
     *      initial plot sale in owned country
     * @dev Mutable
     */
    uint8 tax;

    /**
     * @dev Initially zero, changes when tax changes
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 taxModified;

    /**
     * @dev Token index within an owner's collection of tokens
     * @dev Changes when token is being transferred (token ownership changes)
     * @dev May change if some other token of the same owner is transferred
     */
    uint8 index;

    /**
     * @dev Initially zero, changes when token ownership changes
     *      (that is token is transferred)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 ownershipModified;

    /**
     * @dev Token owner, initialized upon token creation, cannot be zero
     * @dev Changes when token is being transferred to a new owner
     */
    address owner;
  }

  /**
   * @dev Country data array contains number of plots each country contains
   */
  uint16[] public countryData;

  /**
   * @notice All the emitted tokens
   * @dev Core of the Country as ERC721 token
   * @dev Maps Token ID => Country Data Structure
   */
  mapping(uint256 => Country) public tokens;

  /**
   * @notice Storage for a collections of tokens
   * @notice A collection of tokens is an ordered list of token IDs,
   *      owned by a particular address (owner)
   * @dev A mapping from owner to a collection of his tokens (IDs)
   * @dev ERC20 compliant structure for balances can be derived
   *      as a length of each collection in the mapping
   * @dev ERC20 balances[owner] is equal to collections[owner].length
   */
  mapping(address => uint8[]) public collections;

  /**
   * @dev Array with all token ids, used for enumeration
   * @dev ERC20 compliant structure for totalSupply can be derived
   *      as a length of this collection
   * @dev ERC20 totalSupply() is equal to allTokens.length
   */
  uint8[] public allTokens;

  /**
   * @dev Token bitmap – bitmap of 192 elements indicating existing (minted) tokens
   * @dev For any i ∈ [0, 191] - tokenMap[i] (which is tokenMap >> i & 0x1)
   *      is equal to one if token with ID i exists and to zero if it doesn't
   */
  uint192 public tokenMap;

  /**
   * @notice The maximum frequency at which tax rate for a token can be changed
   * @dev Tax rate cannot be changed more frequently than once per `MAX_TAX_CHANGE_FREQ` seconds
   */
  uint32 public maxTaxChangeFreq = 86400; // seconds

  /**
   * @dev Maximum tokens allowed should comply with the `tokenMap` type
   * @dev This setting is used only in contract constructor, actual
   *      maximum supply is defined by `countryData` array length
   */
  uint8 public constant TOTAL_SUPPLY_MAX = 192;

  /**
   * @notice Maximum tax rate that can be set on the country
   * @dev This is an inverted value of the maximum tax:
   *      `MAX_TAX_RATE = 1 / MAX_TAX_INV`
   */
  uint8 public constant MAX_TAX_INV = 5; // 1/5 or 20%

  /**
   * @notice Default tax rate that is assigned to each country
   * @dev This tax rate is set on each country when minting its token
   * @dev 0x4A = binary 01001010,
   *      high 2 bits = binary 01 = 1,
   *      low 6 bits = binary 001010 = 10
   */
  uint8 public constant DEFAULT_TAX_RATE = 0x4A; // 1/10 or 10%

  /**
   * @dev Allows owners to update tax value
   */
  uint32 public constant FEATURE_ALLOW_TAX_UPDATE = 0x00000010;

  /**
   * @notice Tax manager is responsible for updating maximum
   *     allowed frequency of tax rate change
   * @dev Role ROLE_TAX_MANAGER allows updating `maxTaxChangeFreq`
   */
  uint32 public constant ROLE_TAX_MANAGER = 0x00000010;


  /**
   * @dev Fired in updateTaxRate()
   * @param _by address which updated the tax (token owner)
   * @param _tokenId token ID the tax was updated for
   * @param _from old tax value
   * @param _to new tax value
   */
  event TaxRateUpdated(address indexed _by, uint256 indexed _tokenId, uint8 _from, uint8 _to);

  /**
   * @dev Fired in updateMaxTaxChangeFreq()
   * @param _by tax manager (an address having `ROLE_TAX_MANAGER` permission)
   *      which changed the `maxTaxChangeFreq` value on the smart contract
   * @param _from old maxTaxChangeFreq value
   * @param _to new maxTaxChangeFreq value
   */
  event MaxTaxChangeFreqUpdated(address indexed _by, uint32 _from, uint32 _to);

  /**
   * @dev Creates a Country ERC721 instance,
   * @dev Registers a ERC721 interface using ERC165
   * @dev Initializes the contract with the country data provided
   * @param _countryData array of packed data structures containing
   *        number of plots for each country
   */
  constructor(uint16[] memory _countryData) public {
    // register the supported interfaces to conform to ERC721 via ERC165
    _registerInterface(InterfaceId_ERC721);
    _registerInterface(InterfaceId_ERC721Exists);
    _registerInterface(InterfaceId_ERC721Enumerable);
    _registerInterface(InterfaceId_ERC721Metadata);

    // maximum of 192 countries allowed
    require(_countryData.length <= TOTAL_SUPPLY_MAX);

    // init country data array
    countryData = _countryData;
  }

  /**
   * @dev Iterates over all 192 (max) possible countries defined in
   *      CountryERC721 instance this smart contract is bound to,
   *      fetching country owner, number of plots, tax and tax modified date,
   *      and assembled result of the iteration into array
   * @dev The resulting array is ordered by country id, meaning element at
   *      index `i` contains country with an ID `i + 1`
   * @dev The resulting array contains packed data structures for each country, containing:
   *      * number of plots as an integer, 16 bits
   *      * tax rate as a 8 bit fraction, 8 bits
   *      * country owner address as an integer, 160 bits
   * @dev note: country owner address may be zero meaning country is not owned
   * @return an ordered array of countries as packed data structures
   */
  function getAllCountriesPacked() public view returns(uint184[] memory) {
    // determine how many countries we may have minted
    // and define resulting array in memory
    uint184[] memory result = new uint184[](countryData.length);

    // iterate over all possible countries we may have minted
    for(uint8 i = 0; i < countryData.length; i++) {
      // if country is already minted and belongs to someone
      if(exists(i + 1)) {
        // build the result from actual country data
        result[i] = uint184(getPacked(i + 1)) << 160 | uint160(ownerOf(i + 1));
      }
      // otherwise, if country was not yet minted
      else {
        // build the result from country initialization data
        result[i] = uint184(countryData[i]) << 168 | uint168(DEFAULT_TAX_RATE) << 160;
      }
    }

    // return the resulting array
    return result;
  }

  /**
   * @notice Number of countries this contract can have
   * @dev Maximum number of tokens that contract can mint
   * @return length of country data array
   */
  function getNumberOfCountries() public view returns(uint8) {
    // read country data array length and return
    return uint8(countryData.length);
  }

  /**
   * @dev Calculates cumulative number of plots all the countries have in total
   * @return sum of the countries number of plots
   */
  function getTotalNumberOfPlots() public view returns(uint32) {
    // variable to accumulate result into
    uint32 result = 0;

    // iterate over all the tokens and accumulate the result
    for(uint i = 0; i < countryData.length; i++) {
      // accumulate the result
      result += countryData[i];
    }

    // return the result
    return result;
  }

  /**
   * @dev Calculates cumulative number of plots
   *      all the countries belonging to given owner have in total
   * @param owner address of the owner to query countries for
   * @return sum of the countries number of plots owned by given address
   */
  function getNumberOfPlotsByCountryOwner(address owner) public view returns(uint32) {
    // variable to accumulate result into
    uint32 result = 0;

    // iterate over all owner's tokens and accumulate the result
    for(uint i = 0; i < collections[owner].length; i++) {
      // accumulate the result
      result += tokens[collections[owner][i]].plots;
    }

    // return the result
    return result;
  }

  /**
   * @dev Gets a country by ID, representing it as a single 32-bit integer.
   *      The integer is tightly packed with the country data:
   *        number of plots
   *        tax nominator
   *        tax denominator
   * @dev Throws if country doesn't exist
   * @param _tokenId ID of the country to fetch
   * @return country as 32-bit unsigned integer
   */
  function getPacked(uint256 _tokenId) public view returns(uint24) {
    // validate country existence
    require(exists(_tokenId));

    // load country from storage
    Country memory country = tokens[_tokenId];

    // pack the data and return
    return uint24(country.plots) << 8 | country.tax;
  }

  /**
   * @notice Retrieves a collection of tokens owned by a particular address
   * @notice An order of token IDs is not guaranteed and may change
   *      when a token from the list is transferred
   * @param owner an address to query a collection for
   * @return an unordered list of token IDs owned by given address
   */
  function getCollection(address owner) public view returns(uint8[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *      in a single function, useful when connecting to external node like INFURA
   * @dev Each element of the array returned is a tightly packed integer, containing
   *        token ID
   *        number of plots
   *        tax nominator
   *        tax denominator
   * @param owner an address to query a collection for
   * @return an unordered list of country packed data owned by give address
   */
  function getPackedCollection(address owner) public view returns(uint32[] memory) {
    // get the list of token IDs the owner owns
    uint8[] memory ids = getCollection(owner);

    // allocate correspondent array for packed data
    uint32[] memory packedCollection = new uint32[](ids.length);

    // fetch token info one by one and pack it into the structure
    for(uint i = 0; i < ids.length; i++) {
      // pack the data and save it into result array
      packedCollection[i] = uint32(getPacked(ids[i])) << 8 | ids[i];
    }

    // return the result (it can be empty array as well)
    return packedCollection;
  }

  /**
   * @dev Gets the ownership modified time of a token
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get ownership modified time for
   * @return a token ownership modified time as a unix timestamp
   */
  function getOwnershipModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's ownership modified time from storage and return
    return tokens[_tokenId].ownershipModified;
  }

  /**
   * @notice Returns number of plots for the given country, defined by `_tokenId`
   * @param _tokenId country id to query number of plots for
   * @return number of plots given country has
   */
  function getNumberOfPlots(uint256 _tokenId) public view returns(uint16) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's number of plots from storage and return
    return tokens[_tokenId].plots;
  }

  /**
   * @dev Gets the tax modified time of a token
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get tax modified time for
   * @return a token tax modified time as a unix timestamp
   */
  function getTaxModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax modified time from storage and return
    return tokens[_tokenId].taxModified;
  }

  /**
   * @notice Returns tax as a proper fraction for the given country, defined by `_tokenId`
   * @param _tokenId country id to query tax for
   * @return tax as a proper fraction (tuple containing nominator and denominator)
   */
  function getTax(uint256 _tokenId) public view returns(uint8, uint8) {
    // obtain token's tax as packed fraction
    uint8 tax = getTaxPacked(_tokenId);

    // return tax as a proper fraction
    return (Fractions8.getNominator(tax), Fractions8.getDenominator(tax));
  }

  /**
   * @notice Returns tax as a proper fraction for the given country, defined by `_tokenId`
   * @param _tokenId country id to query tax for
   * @return tax as a proper fraction packed into uint16
   */
  function getTaxPacked(uint256 _tokenId) public view returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax from storage and return tax
    return tokens[_tokenId].tax;
  }

  /**
   * @notice Returns tax percent for the given country, defined by `_tokenId`
   * @dev Converts 16-bit fraction structure into 8-bit [0, 100] percent value
   * @param _tokenId country id to query tax for
   * @return tax percent value, [0, 100]
   */
  function getTaxPercent(uint256 _tokenId) public view returns (uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax percent from storage and return
    return Fractions8.toPercent(tokens[_tokenId].tax);
  }

  /**
   * @notice Calculates tax value for the given token and value
   * @param _tokenId token id to use tax rate from
   * @param _value an amount to apply tax to
   * @return calculated tax value based on the tokens tax rate and value
   */
  function calculateTaxValueFor(uint256 _tokenId, uint256 _value) public view returns (uint256) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax percent from storage, multiply by value and return
    return Fractions8.multiplyByInteger(tokens[_tokenId].tax, _value);
  }

  /**
   * @notice Allows token owner to update tax rate of the country this token represents
   * @dev Requires tax update feature to be enabled on the contract
   * @dev Requires message sender to be owner of the token
   * @dev Requires previous tax change to be more then `maxTaxChangeFreq` blocks ago
   * @param _tokenId country id to update tax for
   * @param nominator tax rate nominator, 4 bits unsigned integer [0, 32)
   * @param denominator tax rate denominator, 4 bits unsigned integer (0, 32)
   */
  function updateTaxRate(uint256 _tokenId, uint8 nominator, uint8 denominator) public {
    // check if tax updating is enabled
    require(isFeatureEnabled(FEATURE_ALLOW_TAX_UPDATE));

    // check that sender is token owner, ensures also that token exists
    require(msg.sender == ownerOf(_tokenId));

    // check that tax rate doesn't exceed MAX_TAX_RATE
    require(nominator <= denominator / MAX_TAX_INV);

    // check that enough time has passed since last tax update
    require(tokens[_tokenId].taxModified + maxTaxChangeFreq <= now);

    // save old tax value to log
    uint8 oldTax = tokens[_tokenId].tax;

    // update the tax rate
    tokens[_tokenId].tax = Fractions8.createProperFraction8(nominator, denominator);

    // update tax rate updated timestamp
    tokens[_tokenId].taxModified = uint32(now);

    // emit an event
    emit TaxRateUpdated(msg.sender, _tokenId, oldTax, tokens[_tokenId].tax);
  }

  /**
   * @dev Allows setting the `maxTaxChangeFreq` parameter of the contract,
   *      which specifies how frequently the tax rate can be changed
   * @dev Requires sender to have `ROLE_TAX_MANAGER` permission.
   * @param _maxTaxChangeFreq a value to set `maxTaxChangeFreq` to
   */
  function updateMaxTaxChangeFreq(uint32 _maxTaxChangeFreq) public {
    // check if caller has sufficient permissions to update tax change frequency
    require(isSenderInRole(ROLE_TAX_MANAGER));

    // perform the update only in case of frequency change
    if(maxTaxChangeFreq != _maxTaxChangeFreq) {
      // emit an event first not to use additional variable to store old frequency
      emit MaxTaxChangeFreqUpdated(msg.sender, maxTaxChangeFreq, _maxTaxChangeFreq);

      // update the tax change frequency
      maxTaxChangeFreq = _maxTaxChangeFreq;
    }
  }


  /**
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Initial token's properties are predefined by its ID
   * @dev Requires caller to be token creator (have `ROLE_TOKEN_CREATOR` permission)
   * @param _to an address to assign created token ownership to
   * @param _tokenId ID of the token to create
   */
  function mint(address _to, uint8 _tokenId) public {
    // validate destination address
    require(_to != address(0));
    require(_to != address(this));

    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(_to, _tokenId);

    // fire Minted event
    emit Minted(msg.sender, _to, _tokenId);

    // fire ERC721 transfer event
    emit Transfer(address(0), _to, _tokenId);
  }


  /**
   * @notice Total number of existing tokens (tracked by this contract)
   * @return A count of valid tokens tracked by this contract,
   *    where each one of them has an assigned and
   *    queryable owner not equal to the zero address
   */
  function totalSupply() public view returns (uint256) {
    // read the length of the `allTokens` collection
    return allTokens.length;
  }

  /**
   * @notice Enumerate valid tokens
   * @dev Throws if `_index` >= `totalSupply()`.
   * @param _index a counter less than `totalSupply()`
   * @return The token ID for the `_index`th token, unsorted
   */
  function tokenByIndex(uint256 _index) public view returns (uint256) {
    // out of bounds check
    require(_index < allTokens.length);

    // get the token ID and return
    return allTokens[_index];
  }

  /**
   * @notice Enumerate tokens assigned to an owner
   * @dev Throws if `_index` >= `balanceOf(_owner)`.
   * @param _owner an address of the owner to query token from
   * @param _index a counter less than `balanceOf(_owner)`
   * @return the token ID for the `_index`th token assigned to `_owner`, unsorted
   */
  function tokenOfOwnerByIndex(address _owner, uint256 _index) public view returns (uint256) {
    // out of bounds check
    require(_index < collections[_owner].length);

    // get the token ID from owner collection and return
    return collections[_owner][_index];
  }

  /**
   * @notice Gets an amount of token owned by the given address
   * @dev Gets the balance of the specified address
   * @param _owner address to query the balance for
   * @return an amount owned by the address passed as an input parameter
   */
  function balanceOf(address _owner) public view returns (uint256) {
    // validate an owner address
    require(_owner != address(0));

    // read the length of the `who`s collection of tokens
    return collections[_owner].length;
  }

  /**
   * @notice Checks if specified token exists
   * @dev Returns whether the specified token ID exists
   * @param _tokenId ID of the token to query the existence for
   * @return whether the token exists (true - exists)
   */
  function exists(uint256 _tokenId) public view returns (bool) {
    // check if this token exists (owner is not zero)
    return tokens[_tokenId].owner != address(0);
  }

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `countries` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param _tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint256 _tokenId) public view returns (address) {
    // check if this token exists
    require(exists(_tokenId));

    // return owner's address
    return tokens[_tokenId].owner;
  }

  /**
   * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
   * @dev Throws if `_tokenId` is not a valid token ID.
   *      URIs are defined in RFC 3986.
   * @param _tokenId uint256 ID of the token to query
   * @return token URI
   */
  function tokenURI(uint256 _tokenId) public view returns (string memory) {
    // validate token existence
    require(exists(_tokenId));

    // token URL consists of base URL part (domain) and token ID
    return StringUtils.concat("http://cryptominerworld.com/country/", StringUtils.itoa(_tokenId, 10));
  }

  /**
   * @dev Moves token from owner `_from` to a new owner `_to`:
   *      modifies token owner, moves token ID from `_from` collection
   *      to `_to` collection
   * @dev Unsafe, doesn't check for data structures consistency
   *      (token existence, token ID presence in `collections`, etc.)
   * @dev Must be kept private at all times
   * @param _from an address to take token from
   * @param _to an address to put token into
   * @param _tokenId ID of the token to move
   */
  function __move(address _from, address _to, uint256 _tokenId) internal {
    // cast token ID to uint8 space
    uint8 tokenId = uint8(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the token structure pointer to the storage
    Country storage token = tokens[tokenId];

    // get a reference to the collection where token is now
    uint8[] storage source = collections[_from];

    // get a reference to the collection where token goes to
    uint8[] storage destination = collections[_to];

    // collection `source` cannot be empty, by design of transfer functions
    assert(source.length != 0);

    // index of the token within collection `source`
    uint8 i = uint8(token.index);

    // we put the last token in the collection `source` to the position released
    // get an ID of the last token in `source`
    uint8 sourceId = source[source.length - 1];

    // update last token index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position `i` within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update token index according to position in new collection `destination`
    token.index = uint8(destination.length);

    // update token owner
    token.owner = _to;

    // update token ownership transfer date
    token.ownershipModified = now32();

    // push token into destination collection
    destination.push(tokenId);
  }

  /**
   * @dev Creates new token with token ID specified and
   *      and assigns an ownership `_to` for this token
   * @dev Unsafe: doesn't check if caller has enough permissions to execute the call,
   *      checks only that the token doesn't exist yet
   * @dev Must be kept private at all times
   * @param _to an address to mint token to (first owner of the token)
   * @param _tokenId ID of the token to mint
   */
  function __mint(address _to, uint8 _tokenId) private {
    // check that `tokenId` is inside valid bounds
    require(_tokenId > 0 && _tokenId <= countryData.length);

    // ensure that token with such ID doesn't exist
    require(!exists(_tokenId));

    // create new country in memory
    Country memory country = Country({
      plots: countryData[_tokenId - 1],
      tax: DEFAULT_TAX_RATE,
      taxModified: 0,
      index: uint8(collections[_to].length),
      ownershipModified: 0,
      owner: _to
    });

    // push newly created `tokenId` to the owner's collection of tokens
    collections[_to].push(_tokenId);

    // persist country to the storage
    tokens[_tokenId] = country;

    // add token ID to the `allTokens` collection,
    // automatically updates total supply
    allTokens.push(_tokenId);

    // update token bitmap
    tokenMap |= uint192(1 << uint256(_tokenId - 1));
  }

}
