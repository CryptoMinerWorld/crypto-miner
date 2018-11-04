pragma solidity 0.4.23;

import "./AddressUtils.sol";
import "./StringUtils.sol";
import "./AccessControl.sol";
import "./ERC721Receiver.sol";
import "./ERC165.sol";
import "./Fractions16.sol";

/**
 * @notice Country is unique tradable entity. Non-fungible.
 * @dev A country is an ERC721 non-fungible token, which maps Token ID,
 *      a 8 bit number in range [1, 192] to a set of country properties -
 *      number of plots and owner's tax rate.
 * @dev Country token supports only minting of predefined countries,
 *      its not possible to destroy a country.
 * @dev Up to 192 countries are defined during contract deployment and initialization.
 */
contract CountryERC721 is AccessControl, ERC165 {
  /// @dev Using library Fractions for fraction math
  using Fractions16 for uint16;

  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant TOKEN_VERSION = 0x1;

  /// @dev ERC20 compliant token symbol
  string public constant symbol = "CTY";
  /// @dev ERC20 compliant token name
  string public constant name = "Country – CryptoMiner World";
  /// @dev ERC20 compliant token decimals
  /// @dev this can be only zero, since ERC721 token is non-fungible
  uint8 public constant decimals = 0;

  /// @dev Country data structure
  /// @dev Occupies 1 storage slot (240 bits)
  struct Country {
    /// @dev Unique country ID ∈ [1, 192]
    uint8 id;

    /// @dev Number of land plots country has,
    ///      proportional to the country area
    uint16 plots;

    /// @dev Percentage country owner receives from each sale
    uint16 tax;

    /// @dev Tax modified time - unix timestamp
    uint32 taxModified;

    /// @dev Country index within an owner's collection of countries
    uint8 index;

    /// @dev Country owner, initialized upon country creation
    address owner;
  }

  /// @dev Country data array contains number of plots each country contains
  uint16[] public countryData;

  /// @notice All the existing countries
  /// @dev Core of the Country as ERC721 token
  /// @dev Maps Country ID => Country Data Structure
  mapping(uint256 => Country) public countries;

  /// @dev Mapping from a token ID to an address approved to
  ///      transfer ownership rights for this token
  mapping(uint256 => address) public approvals;

  /// @dev Mapping from owner to operator approvals
  ///      token owner => approved token operator => is approved
  mapping(address => mapping(address => bool)) public approvedOperators;

  /// @notice Storage for a collections of tokens
  /// @notice A collection of tokens is an unordered list of token IDs,
  ///      owned by a particular address (owner)
  /// @dev A mapping from owner to a collection of his tokens (IDs)
  /// @dev ERC20 compliant structure for balances can be derived
  ///      as a length of each collection in the mapping
  /// @dev ERC20 balances[owner] is equal to collections[owner].length
  mapping(address => uint8[]) public collections;

  /// @dev Array with all token ids, used for enumeration
  /// @dev ERC20 compliant structure for totalSupply can be derived
  ///      as a length of this collection
  /// @dev ERC20 totalSupply() is equal to allTokens.length
  uint8[] public allTokens;

  /// @dev Total number of countries this smart contract holds
  uint8 private _totalSupply;

  /// @dev Token bitmap – bitmap of 192 elements indicating existing (minted) tokens
  /// @dev For any i ∈ [0, 191] - tokenMap[i] (which is tokenMap >> i & 0x1)
  ///      is equal to one if token with ID i exists and to zero if it doesn't
  uint192 public tokenMap;

  /// @notice The maximum frequency at which tax rate for a token can be changed
  /// @dev Tax rate cannot be changed more frequently than once per `MAX_TAX_CHANGE_FREQ` seconds
  uint32 public maxTaxChangeFreq = 86400; // seconds

  /// @dev Maximum tokens allowed should comply with the `tokenMap` type
  /// @dev This setting is used only in contract constructor, actual
  ///      maximum supply is defined by `countryData` array length
  uint8 public constant TOTAL_SUPPLY_MAX = 192;

  /// @notice Maximum tax rate that can be set on the country
  /// @dev This is an inverted value of the maximum tax:
  ///      `MAX_TAX_RATE = 1 / MAX_TAX_INV`
  uint8 public constant MAX_TAX_INV = 5; // 1/5 or 20%

  /// @notice Default tax rate that is assigned to each country
  /// @dev This tax rate is set on each country when minting its token
  uint16 public constant DEFAULT_TAX_RATE = 0x010A; // 1/10 or 10%

  /// @dev Enables ERC721 transfers of the tokens
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;

  /// @dev Enables ERC721 transfers on behalf
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  /// @dev Allows owners to update tax value
  uint32 public constant FEATURE_ALLOW_TAX_UPDATE = 0x00000004;

  /// @notice Tax manager is responsible for updating maximum
  ///     allowed frequency of tax rate change
  /// @dev Role ROLE_TAX_MANAGER allows updating `maxTaxChangeFreq`
  uint32 public constant ROLE_TAX_MANAGER = 0x00020000;

  /// @notice Token creator is responsible for creating tokens
  /// @dev Role ROLE_TOKEN_CREATOR allows minting tokens
  uint32 public constant ROLE_TOKEN_CREATOR = 0x00040000;

  /// @dev Magic value to be returned upon successful reception of an NFT
  /// @dev Equal to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`,
  ///      which can be also obtained as `ERC721Receiver(0).onERC721Received.selector`
  bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

  /**
   * Supported interfaces section
   */

  /**
   * ERC721 interface definition in terms of ERC165
   *
   * 0x80ac58cd ==
   *   bytes4(keccak256('balanceOf(address)')) ^
   *   bytes4(keccak256('ownerOf(uint256)')) ^
   *   bytes4(keccak256('approve(address,uint256)')) ^
   *   bytes4(keccak256('getApproved(uint256)')) ^
   *   bytes4(keccak256('setApprovalForAll(address,bool)')) ^
   *   bytes4(keccak256('isApprovedForAll(address,address)')) ^
   *   bytes4(keccak256('transferFrom(address,address,uint256)')) ^
   *   bytes4(keccak256('safeTransferFrom(address,address,uint256)')) ^
   *   bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)'))
   */
  bytes4 private constant InterfaceId_ERC721 = 0x80ac58cd;

  /**
   * ERC721 interface extension – exists(uint256)
   *
   * 0x4f558e79 == bytes4(keccak256('exists(uint256)'))
   */
  bytes4 private constant InterfaceId_ERC721Exists = 0x4f558e79;

  /**
   * ERC721 interface extension - ERC721Enumerable
   *
   * 0x780e9d63 ==
   *   bytes4(keccak256('totalSupply()')) ^
   *   bytes4(keccak256('tokenOfOwnerByIndex(address,uint256)')) ^
   *   bytes4(keccak256('tokenByIndex(uint256)'))
   */
  bytes4 private constant InterfaceId_ERC721Enumerable = 0x780e9d63;

  /**
   * ERC721 interface extension - ERC721Metadata
   *
   * 0x5b5e139f ==
   *   bytes4(keccak256('name()')) ^
   *   bytes4(keccak256('symbol()')) ^
   *   bytes4(keccak256('tokenURI(uint256)'))
   */
  bytes4 private constant InterfaceId_ERC721Metadata = 0x5b5e139f;

  /// @dev Event names are self-explanatory:
  /// @dev Fired in mint()
  /// @dev Address `_by` allows to track who created a token
  event Minted(address indexed _by, address indexed _to, uint8 indexed _tokenId);

  /// @dev Fired in transfer(), transferFor(), mint()
  /// @dev When minting a token, address `_from` is zero
  /// @dev ERC20/ERC721 compliant event
  event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId, uint256 _value);

  /// @dev Fired in approve()
  /// @dev ERC721 compliant event
  event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);

  /// @dev Fired in setApprovalForAll()
  /// @dev ERC721 compliant event
  event ApprovalForAll(address indexed _owner, address indexed _operator, bool _value);

  /// @dev Fired in updateTaxRate()
  event TaxRateUpdated(address indexed _owner, uint256 indexed _tokenId, uint16 tax, uint16 oldTax);

  /**
   * @dev Creates a Country ERC721 instance,
   * @dev Registers a ERC721 interface using ERC165
   * @dev Initializes the contract with the country data provided
   * @param _countryData array of packed data structures containing
   *        number of plots for each country
   */
  constructor(uint16[] _countryData) public {
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
   * @notice Number of countries this contract can have
   * @dev Maximum number of tokens that contract can mint
   * @return length of country data array
   */
  function getNumberOfCountries() public constant returns(uint8) {
    // read country data array length and return
    return uint8(countryData.length);
  }

  /**
   * @dev Calculates cumulative number of plots all the countries have in total
   * @return sum of the countries number of plots
   */
  function getTotalNumberOfPlots() public constant returns(uint32) {
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
  function getNumberOfPlotsByCountryOwner(address owner) public constant returns(uint32) {
    // variable to accumulate result into
    uint32 result = 0;

    // iterate over all owner's tokens and accumulate the result
    for(uint i = 0; i < collections[owner].length; i++) {
      // accumulate the result
      result += countries[collections[owner][i]].plots;
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
  function getPacked(uint256 _tokenId) public constant returns(uint32) {
    // validate country existence
    require(exists(_tokenId));

    // load country from storage
    Country memory country = countries[_tokenId];

    // pack the data and return
    return uint32(country.plots) << 16 | country.tax;
  }

  /**
   * @notice Retrieves a collection of tokens owned by a particular address
   * @notice An order of token IDs is not guaranteed and may change
   *      when a token from the list is transferred
   * @param owner an address to query a collection for
   * @return an unordered list of token IDs owned by given address
   */
  function getCollection(address owner) public constant returns(uint8[]) {
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
  function getPackedCollection(address owner) public constant returns(uint40[]) {
    // get the list of token IDs the owner owns
    uint8[] memory ids = getCollection(owner);

    // allocate correspondent array for packed data
    uint40[] memory packedCollection = new uint40[](ids.length);

    // fetch token info one by one and pack it into the structure
    for(uint i = 0; i < ids.length; i++) {
      // token ID
      uint8 tokenId = ids[i];

      // packed token data
      uint32 packedData = getPacked(tokenId);

      // pack the data and save it into result array
      packedCollection[i] = uint40(tokenId) << 32 | packedData;
    }

    // return the result (it can be empty array as well)
    return packedCollection;
  }

  /**
   * @notice Returns number of plots for the given country, defined by `_tokenId`
   * @param _tokenId country id to query number of plots for
   * @return number of plots given country has
   */
  function getNumberOfPlots(uint256 _tokenId) public constant returns(uint16) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's number of plots from storage and return
    return countries[_tokenId].plots;
  }

  /**
   * @notice Returns tax as a proper fraction for the given country, defined by `_tokenId`
   * @param _tokenId country id to query tax for
   * @return tax as a proper fraction (tuple containing nominator and denominator)
   */
  function getTax(uint256 _tokenId) public constant returns(uint8, uint8) {
    // obtain token's tax as packed fraction
    uint16 tax = getTaxPacked(_tokenId);

    // return tax as a proper fraction
    return (tax.getNominator(), tax.getDenominator());
  }

  /**
   * @notice Returns tax as a proper fraction for the given country, defined by `_tokenId`
   * @param _tokenId country id to query tax for
   * @return tax as a proper fraction packed into uint16
   */
  function getTaxPacked(uint256 _tokenId) public constant returns(uint16) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax from storage and return tax
    return countries[_tokenId].tax;
  }

  /**
   * @notice Returns tax percent for the given country, defined by `_tokenId`
   * @dev Converts 16-bit fraction structure into 8-bit [0, 100] percent value
   * @param _tokenId country id to query tax for
   * @return tax percent value, [0, 100]
   */
  function getTaxPercent(uint256 _tokenId) public constant returns (uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax percent from storage and return
    return countries[_tokenId].tax.toPercent();
  }

  /**
   * @notice Calculates tax value for the given token and value
   * @param _tokenId token id to use tax rate from
   * @param _value an amount to apply tax to
   * @return calculated tax value based on the tokens tax rate and value
   */
  function calculateTaxValueFor(uint256 _tokenId, uint256 _value) public constant returns (uint256) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's tax percent from storage, multiply by value and return
    return countries[_tokenId].tax.multiplyByInteger(_value);
  }

  /**
   * @notice Allows token owner to update tax rate of the country this token represents
   * @dev Requires tax update feature to be enabled on the contract
   * @dev Requires message sender to be owner of the token
   * @dev Requires previous tax change to be more then `maxTaxChangeFreq` blocks ago
   * @param _tokenId country id to update tax for
   * @param nominator tax rate nominator
   * @param denominator tax rate denominator
   */
  function updateTaxRate(uint256 _tokenId, uint8 nominator, uint8 denominator) public {
    // check if tax updating is enabled
    require(__isFeatureEnabled(FEATURE_ALLOW_TAX_UPDATE));

    // check that sender is token owner, ensures also that token exists
    require(msg.sender == ownerOf(_tokenId));

    // check that tax rate doesn't exceed MAX_TAX_RATE
    require(nominator <= denominator / MAX_TAX_INV);

    // check that enough time has passed since last tax update
    require(countries[_tokenId].taxModified + maxTaxChangeFreq <= now);

    // save old tax value to log
    uint16 oldTax = countries[_tokenId].tax;

    // update the tax rate
    countries[_tokenId].tax = Fractions16.createProperFraction16(nominator, denominator);

    // update tax rate updated timestamp
    countries[_tokenId].taxModified = uint32(now);

    // emit an event
    emit TaxRateUpdated(msg.sender, _tokenId, countries[_tokenId].tax, oldTax);
  }

  /**
   * @dev Allows setting the `maxTaxChangeFreq` parameter of the contract,
   *      which specifies how frequently the tax rate can be changed
   * @dev Requires sender to have `ROLE_TAX_MANAGER` permission.
   * @param _maxTaxChangeFreq a value to set `maxTaxChangeFreq` to
   */
  function updateMaxTaxChangeFreq(uint32 _maxTaxChangeFreq) public {
    // check if caller has sufficient permissions to update tax change frequency
    require(__isSenderInRole(ROLE_TAX_MANAGER));

    // update the tax change frequency
    maxTaxChangeFreq = _maxTaxChangeFreq;
  }


  /**
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Initial token's properties are predefined by its ID
   * @param to an address to assign created token ownership to
   * @param tokenId ID of the token to create
   */
  function mint(address to, uint8 tokenId) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // check if caller has sufficient permissions to mint a token
    require(__isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(to, tokenId);

    // fire Minted event
    emit Minted(msg.sender, to, tokenId);

    // fire ERC20/ERC721 transfer event
    emit Transfer(address(0), to, tokenId, 1);
  }


  /**
   * @notice Total number of existing tokens (tracked by this contract)
   * @return A count of valid tokens tracked by this contract,
   *    where each one of them has an assigned and
   *    queryable owner not equal to the zero address
   */
  function totalSupply() public constant returns (uint256) {
    // read the length of the `allTokens` collection
    return allTokens.length;
  }

  /**
   * @notice Enumerate valid tokens
   * @dev Throws if `_index` >= `totalSupply()`.
   * @param _index a counter less than `totalSupply()`
   * @return The token ID for the `_index`th token, unsorted
   */
  function tokenByIndex(uint256 _index) public constant returns (uint256) {
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
  function tokenOfOwnerByIndex(address _owner, uint256 _index) public constant returns (uint256) {
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
  function balanceOf(address _owner) public constant returns (uint256) {
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
  function exists(uint256 _tokenId) public constant returns (bool) {
    // check if this token exists (owner is not zero)
    return countries[_tokenId].owner != address(0);
  }

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `countries` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param _tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint256 _tokenId) public constant returns (address) {
    // check if this token exists
    require(exists(_tokenId));

    // return owner's address
    return countries[_tokenId].owner;
  }

  /**
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @dev Requires the sender of the transaction to be an owner
   *      of the token specified (`tokenId`)
   * @param to new owner address
   * @param _tokenId ID of the token to transfer ownership rights for
   */
  function transfer(address to, uint256 _tokenId) public {
    // check if token transfers feature is enabled
    require(__isFeatureEnabled(FEATURE_TRANSFERS));

    // call sender gracefully - `from`
    address from = msg.sender;

    // delegate call to unsafe `__transfer`
    __transfer(from, to, _tokenId);
  }

  /**
   * @notice A.k.a "transfer a token on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @dev Transfers the ownership of a given token ID to another address
   * @dev Requires the transaction sender to be one of:
   *      owner of a token - then its just a usual `transfer`
   *      approved – an address explicitly approved earlier by
   *        the owner of a token to transfer this particular token `tokenId`
   *      operator - an address explicitly approved earlier by
   *        the owner to transfer all his tokens on behalf
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _tokenId) public {
    // if `_from` is equal to sender, require transfers feature to be enabled
    // otherwise require transfers on behalf feature to be enabled
    require(_from == msg.sender && __isFeatureEnabled(FEATURE_TRANSFERS)
      || _from != msg.sender && __isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

    // call sender gracefully - `operator`
    address operator = msg.sender;

    // find if an approved address exists for this token
    address approved = approvals[_tokenId];

    // we assume `from` is an owner of the token,
    // this will be explicitly checked in `__transfer`

    // fetch how much approvals left for an operator
    bool approvedOperator = approvedOperators[_from][operator];

    // operator must have an approval to transfer this particular token
    // or operator must be approved to transfer all the tokens
    // or, if nothing satisfies, this is equal to regular transfer,
    // where `from` is basically a transaction sender and owner of the token
    if(operator != approved && !approvedOperator) {
      // transaction sender doesn't have any special permissions
      // we will treat him as a token owner and sender and try to perform
      // a regular transfer:
      // check `from` to be `operator` (transaction sender):
      require(_from == operator);
    }

    // delegate call to unsafe `__transfer`
    __transfer(_from, _to, _tokenId);
  }

  /**
   * @notice A.k.a "safe transfer a token on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @dev Safely transfers the ownership of a given token ID to another address
   * @dev Requires the transaction sender to be the owner, approved, or operator
   * @dev When transfer is complete, this function
   *      checks if `_to` is a smart contract (code size > 0). If so, it calls
   *      `onERC721Received` on `_to` and throws if the return value is not
   *      `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   * @param _data Additional data with no specified format, sent in call to `_to`
   */
  function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes _data) public {
    // delegate call to usual (unsafe) `transferFrom`
    transferFrom(_from, _to, _tokenId);

    // check if receiver `_to` supports ERC721 interface
    if (AddressUtils.isContract(_to)) {
      // if `_to` is a contract – execute onERC721Received
      bytes4 response = ERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data);

      // expected response is ERC721_RECEIVED
      require(response == ERC721_RECEIVED);
    }
  }

  /**
   * @notice A.k.a "safe transfer a token on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @dev Safely transfers the ownership of a given token ID to another address
   * @dev Requires the transaction sender to be the owner, approved, or operator
   * @dev Requires from to be an owner of the token
   * @dev If the target address is a contract, it must implement `onERC721Received`,
   *      which is called upon a safe transfer, and return the magic value
   *      `bytes4(keccak256("onERC721Received(address,uint256,bytes)"))`;
   *      otherwise the transfer is reverted.
   * @dev This works identically to the other function with an extra data parameter,
   *      except this function just sets data to "".
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   */
  function safeTransferFrom(address _from, address _to, uint256 _tokenId) public {
    // delegate call to overloaded `safeTransferFrom`, set data to ""
    safeTransferFrom(_from, _to, _tokenId, "");
  }

  /**
   * @notice Approves an address to transfer the given token on behalf of its owner
   *      Can also be used to revoke an approval by setting `to` address to zero
   * @dev The zero `to` address revokes an approval for a given token
   * @dev There can only be one approved address per token at a given time
   * @dev This function can only be called by the token owner
   * @param _approved address to be approved to transfer the token on behalf of its owner
   * @param _tokenId ID of the token to be approved for transfer on behalf
   */
  function approve(address _approved, uint256 _tokenId) public {
    // call sender nicely - `from`
    address from = msg.sender;

    // get token owner address (also ensures that token exists)
    address owner = ownerOf(_tokenId);

    // caller must own this token
    require(from == owner);
    // approval for owner himself is pointless, do not allow
    require(_approved != owner);
    // either we're removing approval, or setting it
    require(approvals[_tokenId] != address(0) || _approved != address(0));

    // set an approval (deletes an approval if to == 0)
    approvals[_tokenId] = _approved;

    // emit an ERC721 event
    emit Approval(from, _approved, _tokenId);
  }

  /**
   * @notice Removes an approved address, which was previously added by `approve`
   *      for the given token. Equivalent to calling approve(0, tokenId)
   * @dev Same as calling approve(0, tokenId)
   * @param _tokenId ID of the token to remove approved address for
   */
  function revokeApproval(uint256 _tokenId) public {
    // delegate call to `approve`
    approve(address(0), _tokenId);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @param to operator address to set the approval for
   * @param approved representing the status of the approval to be set
   */
  function setApprovalForAll(address to, bool approved) public {
    // call sender nicely - `from`
    address from = msg.sender;

    // validate destination address
    require(to != address(0));

    // approval for owner himself is pointless, do not allow
    require(to != from);

    // set an approval
    approvedOperators[from][to] = approved;

    // emit an ERC721 compliant event
    emit ApprovalForAll(from, to, approved);
  }

  /**
   * @notice Get the approved address for a single token
   * @dev Throws if `_tokenId` is not a valid token ID.
   * @param _tokenId ID of the token to find the approved address for
   * @return the approved address for this token, or the zero address if there is none
   */
  function getApproved(uint256 _tokenId) public constant returns (address) {
    // validate token existence
    require(exists(_tokenId));

    // find approved address and return
    return approvals[_tokenId];
  }

  /**
   * @notice Query if an address is an authorized operator for another address
   * @param _owner the address that owns at least one token
   * @param _operator the address that acts on behalf of the owner
   * @return true if `_operator` is an approved operator for `_owner`, false otherwise
   */
  function isApprovedForAll(address _owner, address _operator) public constant returns (bool) {
    // is there a positive amount of approvals left
    return approvedOperators[_owner][_operator];
  }

  /**
   * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
   * @dev Throws if `_tokenId` is not a valid token ID.
   *      URIs are defined in RFC 3986.
   * @param _tokenId uint256 ID of the token to query
   * @return token URI
   */
  function tokenURI(uint256 _tokenId) public constant returns (string) {
    // validate token existence
    require(exists(_tokenId));

    // token URL consists of base URL part (domain) and token ID
    return StringUtils.concat("http://cryptominerworld.com/country/", StringUtils.itoa(_tokenId, 10));
  }

  /// @dev Performs a transfer of a token `tokenId` from address `from` to address `to`
  /// @dev Unsafe: doesn't check if caller has enough permissions to execute the call;
  ///      checks only for token existence and that ownership belongs to `from`
  /// @dev Is save to call from `transfer(to, tokenId)` since it doesn't need any additional checks
  /// @dev Must be kept private at all times
  function __transfer(address from, address to, uint256 _tokenId) private {
    // validate source and destination address
    require(to != address(0));
    require(to != from);
    // impossible by design of transfer(), transferFrom(),
    // approveToken() and approve()
    assert(from != address(0));

    // validate token existence
    require(exists(_tokenId));

    // validate token ownership
    require(ownerOf(_tokenId) == from);

    // clear approved address for this particular token + emit event
    __clearApprovalFor(_tokenId);

    // move token ownership,
    // update old and new owner's token collections accordingly
    __move(from, to, _tokenId);

    // fire ERC20/ERC721 transfer event
    emit Transfer(from, to, _tokenId, 1);
  }

  /// @dev Clears approved address for a particular token
  function __clearApprovalFor(uint256 _tokenId) private {
    // check if approval exists - we don't want to fire an event in vain
    if(approvals[_tokenId] != address(0)) {
      // clear approval
      delete approvals[_tokenId];

      // emit an ERC721 event
      emit Approval(msg.sender, address(0), _tokenId);
    }
  }

  /// @dev Move `country` from owner `from` to a new owner `to`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __move(address from, address to, uint256 _tokenId) private {
    // cast token ID to uint32 space
    uint8 tokenId = uint8(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the country pointer to the storage
    Country storage country = countries[_tokenId];

    // get a reference to the collection where country is now
    uint8[] storage source = collections[from];

    // get a reference to the collection where country goes to
    uint8[] storage destination = collections[to];

    // collection `source` cannot be empty, if it is - it's a bug
    assert(source.length != 0);

    // index of the country within collection `source`
    uint8 i = country.index;

    // we put the last country in the collection `source` to the position released
    // get an ID of the last country in `source`
    uint8 sourceId = source[source.length - 1];

    // update country index to point to proper place in the collection `source`
    countries[sourceId].index = i;

    // put it into the position i within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update country index according to position in new collection `destination`
    country.index = uint8(destination.length);

    // update country owner
    country.owner = to;

    // push country into collection
    destination.push(tokenId);
  }

  /// @dev Creates new token with `tokenId` ID specified and
  ///      assigns an ownership `to` for this token
  /// @dev Unsafe: doesn't check if caller has enough permissions to execute the call
  ///      checks only that the token doesn't exist yet
  /// @dev Must be kept private at all times
  function __mint(address to, uint8 tokenId) private {
    // check that `tokenId` is inside valid bounds
    require(tokenId > 0 && tokenId <= countryData.length);

    // ensure that token with such ID doesn't exist
    require(!exists(tokenId));

    // create new country in memory
    Country memory country = Country({
      id: tokenId,
      plots: countryData[tokenId - 1],
      tax: DEFAULT_TAX_RATE,
      taxModified: 0,
      index: uint8(collections[to].length),
      owner: to
    });

    // push newly created `tokenId` to the owner's collection of tokens
    collections[to].push(tokenId);

    // persist country to the storage
    countries[tokenId] = country;

    // add token ID to the `allTokens` collection,
    // automatically updates total supply
    allTokens.push(tokenId);

    // update token bitmap
    tokenMap |= uint192(1 << uint256(tokenId - 1));
  }

}
