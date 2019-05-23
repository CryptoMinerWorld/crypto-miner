pragma solidity 0.5.8;

import "./AddressUtils.sol";
import "./StringUtils.sol";
import "./ERC721Receiver.sol";
import "./ERC721Core.sol";

/**
 * @title Gem ERC721 Token
 *
 * @notice Gem is unique tradable entity. Non-fungible.
 *
 * @dev A gem is an ERC721 non-fungible token, which maps Token ID,
 *      a 32 bit number to a set of gem properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 * @dev A gem token supports only minting, it can be only created
 *
 * @author Basil Gorin
 */
// TODO: consider switching to 24-bit token ID
contract GemERC721 is ERC721Core {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x5f9e14819386e60b64cb52a07e7f47db3cf1d4668841cdfb42fd2b442fdbaf96;

  /**
   * @dev ERC20 compliant token symbol
   */
  string public constant symbol = "GEM";

  /**
   * @dev ERC20 compliant token name
   */
  string public constant name = "GEM – CryptoMiner World";

  /**
   * @dev ERC20 compliant token decimals
   * @dev Equal to zero – since ERC721 token is non-fungible
   *      and therefore non-divisible
   */
  uint8 public constant decimals = 0;

  /**
   * @dev Token data structure (Gem Data Structure)
   * @dev Occupies 2 storage slots (512 bits)
   */
  struct Gem {
    /*** High 256 bits ***/

    /**
     * @dev PlotID where the gem was found, immutable
     * @dev Zero for the initial gems issued in founder's sale
     */
    uint24 plotId;

    /**
     * @dev Gem color, immutable, one of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
     */
    uint8 color;

    /**
     * @dev Gem level, mutable, may only increase
     */
    uint8 level;

    /**
     * @dev Initially zero, changes when level is modified
     *      (meaning the gem is leveled up)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 levelModified;

    /**
     * @dev Gem grade, mutable, may only increase
     * @dev High 8 bits of the grade is grade type:
     *      D (1), C (2), B (3), A (4), AA (5) and AAA (6)
     * @dev Low 24 bits of the grade is grade value
     */
    uint32 grade;

    /**
     * @dev Initially zero, changes when grade is modified
     *      (meaning the gem is upgraded)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 gradeModified;

    /**
     * @dev Saved energetic age of the gem, mutable
     * @dev Stored in seconds
     */
    uint32 age;

    /**
     * @dev Initially zero, changes when age is modified
     *      (meaning energetic age of the gem is changed)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 ageModified;

    /**
     * @dev State value, mutable
     */
    uint24 state;

    /**
     * @dev Initially zero, changes when state is modified
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 stateModified;


    /*** Low 256 bits ***/

    /**
     * @dev Token creation time, immutable, cannot be zero
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 creationTime;

    /**
     * @dev Token index within an owner's collection of tokens
     * @dev Changes when token is being transferred (token ownership changes)
     * @dev May change if some other token of the same owner is transferred
     * @dev Only low 24 bits are used
     */
    uint32 index;

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
   * @notice All the emitted tokens
   * @dev Core of the Gem as ERC721 token
   * @dev Maps Token ID => Gem Data Structure
   */
  mapping(uint256 => Gem) public tokens;

  /**
   * @notice Storage for a collections of tokens
   * @notice A collection of tokens is an ordered list of token IDs,
   *      owned by a particular address (owner)
   * @dev A mapping from owner to a collection of his tokens (IDs)
   * @dev ERC20 compliant structure for balances can be derived
   *      as a length of each collection in the mapping
   * @dev ERC20 balances[owner] is equal to collections[owner].length
   */
  mapping(address => uint32[]) public collections;

  /**
   * @dev Array with all token ids, used for enumeration
   * @dev ERC20 compliant structure for totalSupply can be derived
   *      as a length of this collection
   * @dev ERC20 totalSupply() is equal to allTokens.length
   */
  uint32[] public allTokens;

  /**
   * @dev The data in token's state may contain lock(s)
   *      (ex.: if token currently busy with some function which prevents transfer)
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   */
  uint24 public transferLock = DEFAULT_MINING_BIT;

  /**
   * @dev Default bitmask indicating that the gem is `mining`
   * @dev Consists of a single bit at position 1 – binary 1
   * @dev The bit meaning in token's `state` is as follows:
   *      0: not mining
   *      1: mining
   */
  uint24 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1

  /**
   * @notice State provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying token's state
   */
  uint32 public constant ROLE_STATE_PROVIDER = 0x00000010;

  /**
   * @notice Transfer lock provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying transfer lock bitmask `transferLock`
   */
  uint32 public constant ROLE_TRANSFER_LOCK_PROVIDER = 0x00000020;


  /// @notice Level provider is responsible for enabling the workshop
  /// @dev Role ROLE_LEVEL_PROVIDER allows leveling up the gem
  uint32 public constant ROLE_LEVEL_PROVIDER = 0x00000040;

  /// @notice Grade provider is responsible for enabling the workshop
  /// @dev Role ROLE_GRADE_PROVIDER allows modifying gem's grade
  uint32 public constant ROLE_GRADE_PROVIDER = 0x00000080;


  /**
   * @dev Fired in setState()
   * @param _by state provider
   *      (an address having `ROLE_STATE_PROVIDER` permission)
   *      which modified token `_tokenId` state
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose state was modified
   * @param _from old state
   * @param _to new state
   */
  event StateModified(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint24 _from,
    uint24 _to
  );

  /**
   * @dev Fired in setTransferLock()
   * @param _by transfer lock provider
   *      (an address having `ROLE_TRANSFER_LOCK_PROVIDER` permission)
   *      which modified `transferLock` global variable
   * @param _from old value of `transferLock`
   * @param _to new value of `transferLock`
   */
  event TransferLockChanged(address indexed _by, uint24 _from, uint24 _to);

  /// @dev Fired in levelUp()
  event LevelUp(address indexed _by, address indexed _owner, uint256 indexed _tokenId, uint8 _from, uint8 _to);

  /// @dev Fired in upgradeGrade()
  event Upgraded(address indexed _by, address indexed _owner, uint256 indexed _tokenId, uint32 _from, uint32 _to);

  /**
   * @dev Creates a ERC721 instance,
   *      registers required ERC721 interfaces via ERC165
   */
  constructor() public {
    // register the supported interfaces to conform to ERC721 via ERC165
    _registerInterface(InterfaceId_ERC721);
    _registerInterface(InterfaceId_ERC721Exists);
    _registerInterface(InterfaceId_ERC721Enumerable);
    _registerInterface(InterfaceId_ERC721Metadata);
  }

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
   */
  function getPacked(uint256 _tokenId) public view returns(uint256, uint256) {
    // validate gem existence
    require(exists(_tokenId));

    // load the token from storage
    Gem memory token = tokens[_tokenId];

    // pack high 256 bits of the result
    uint256 high = uint256(token.plotId) << 232
                 | uint232(token.color) << 224
                 | uint224(token.level) << 216
                 | uint216(token.levelModified) << 184
                 | uint184(token.grade) << 152
                 | uint152(token.gradeModified) << 120
                 | uint120(token.age) << 88
                 | uint88(token.ageModified) << 56
                 | uint56(token.state) << 32
                 | uint32(token.stateModified);

    // pack low 256 bits of the result
    uint256 low  = uint256(token.creationTime) << 224
                 | uint224(token.index) << 192
                 | uint192(token.ownershipModified) << 160
                 | uint160(token.owner);

    // return the whole 512 bits of result
    return (high, low);
  }

  /**
   * @dev Allows to fetch all existing (minted) token IDs
   * @return an ordered unsorted list of all existing token IDs
   */
  function getAllTokens() public view returns(uint32[] memory) {
    // read an array of all the minted tokens and return
    return allTokens;
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *       in a single function, useful when connecting to external node like INFURA
   * @dev Each element in the collection contains
   *      token ID (32 bits)
   *      color (8 bits)
   *      level (8 bits)
   *      grade (32 bits)
   *      state (8 low bits)
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of packed token data
   */
  function getPackedCollection(address owner) public view returns (uint88[] memory) {
    // get an array of Gem IDs owned by an `owner` address
    uint32[] memory tokenIds = getCollection(owner);

    // how many gems are there in a collection
    uint32 balance = uint32(tokenIds.length);

    // data container to store the result
    uint88[] memory result = new uint88[](balance);

    // fetch token info one by one and pack into structure
    for(uint32 i = 0; i < balance; i++) {
      // token ID to work with
      uint32 tokenId = tokenIds[i];

      // read all required data and pack it
      result[i] = uint88(tokenId) << 56 | uint56(getProperties(tokenId)) << 8 | uint8(getState(tokenId));
    }

    // return the packed data structure
    return result;
  }

  /**
   * @notice Retrieves a collection of token IDs owned by a particular address
   * @notice An order of token IDs is not guaranteed and may change
   *      when a token from the list is transferred
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of token IDs
   */
  function getCollection(address owner) public view returns(uint32[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Gets the land plot ID of a gem
   * @param _tokenId ID of the gem to get land plot ID value for
   * @return a token land plot ID
   */
  function getPlotId(uint256 _tokenId) public view returns(uint24) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's color from storage and return
    return tokens[_tokenId].plotId;
  }

  /**
   * @dev Gets the gem's properties – color, level and
   *      grade - as packed uint32 number
   * @param _tokenId ID of the gem to get properties for
   * @return gem's properties - color, level, grade as packed uint32
   */
  function getProperties(uint256 _tokenId) public view returns(uint48) {
    // validate token existence
    require(exists(_tokenId));

    // read gem from storage
    Gem memory gem = tokens[_tokenId];

    // pack data structure and return
    return uint48(gem.color) << 40 | uint40(gem.level) << 32 | gem.grade;
  }

  /**
   * @dev Gets the color of a token
   * @param _tokenId ID of the token to get color for
   * @return a token color
   */
  function getColor(uint256 _tokenId) public view returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's color from storage and return
    return tokens[_tokenId].color;
  }

  /**
   * @dev Gets the level modified date of a token
   * @param _tokenId ID of the token to get level modification date for
   * @return a token level modification date
   */
  function getLevelModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's level modified date from storage and return
    return tokens[_tokenId].levelModified;
  }

  /**
   * @dev Gets the level of a token
   * @param _tokenId ID of the token to get level for
   * @return a token level
   */
  function getLevel(uint256 _tokenId) public view returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's level from storage and return
    return tokens[_tokenId].level;
  }

  /**
   * @dev Levels up a gem to the level specified
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param _tokenId ID of the gem to level up
   * @param _level new gem's level to set to
   */
  function levelUp(uint256 _tokenId, uint8 _level) public {
    // check that the call is made by a level provider
    require(isSenderInRole(ROLE_LEVEL_PROVIDER));

    // extract current level
    // verifies token existence under the hood
    uint8 level = getLevel(_tokenId);

    // ensure level increases
    require(level < _level);

    // set new level value required
    tokens[_tokenId].level = _level;

    // update the level modification date
    tokens[_tokenId].levelModified = uint32(now);

    // emit an event
    emit LevelUp(msg.sender, ownerOf(_tokenId), _tokenId, level, _level);
  }

  /**
   * @dev Levels up a gem to by the level delta specified
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param _tokenId ID of the gem to level up
   * @param _by number of levels to level up by
   */
  function levelUpBy(uint256 _tokenId, uint8 _by) public {
    // check that the call is made by a level provider
    require(isSenderInRole(ROLE_LEVEL_PROVIDER));

    // extract current level
    // verifies token existence under the hood
    uint8 level = getLevel(_tokenId);

    // ensure level increases, arithmetic overflow check
    require(level + _by > level);

    // set new level value required
    tokens[_tokenId].level += _by;

    // update the level modification date
    tokens[_tokenId].levelModified = uint32(now);

    // emit an event
    emit LevelUp(msg.sender, ownerOf(_tokenId), _tokenId, level, level + _by);
  }

  /**
   * @dev Gets the grade modified date of a gem
   * @param _tokenId ID of the gem to get grade modified date for
   * @return a token grade modified date
   */
  function getGradeModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's grade modified date from storage and return
    return tokens[_tokenId].gradeModified;
  }

  /**
   * @dev Gets the grade of a gem
   * @param _tokenId ID of the gem to get grade for
   * @return a token grade
   */
  function getGrade(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's grade from storage and return
    return tokens[_tokenId].grade;
  }

  /**
   * @dev Gets the grade type of a gem
   * @param _tokenId ID of the gem to get grade type for
   * @return a token grade type
   */
  function getGradeType(uint256 _tokenId) public view returns(uint8) {
    // extract high 8 bits of the grade and return
    return uint8(getGrade(_tokenId) >> 24);
  }

  /**
   * @dev Gets the grade value of a gem
   * @param _tokenId ID of the gem to get grade value for
   * @return a token grade value
   */
  function getGradeValue(uint256 _tokenId) public view returns(uint24) {
    // extract low 24 bits of the grade and return
    return uint24(getGrade(_tokenId));
  }

  /**
   * @dev Upgrades the grade of the gem
   * @dev Requires new grade to be higher than an old one
   * @dev Requires sender to have `ROLE_GRADE_PROVIDER` permission
   * @param _tokenId ID of the gem to modify the grade for
   * @param _grade new grade to set for the token, should be higher then current grade
   */
  function upgrade(uint256 _tokenId, uint32 _grade) public {
    // check that the call is made by a grade provider
    require(isSenderInRole(ROLE_GRADE_PROVIDER));

    // extract current grade
    // verifies token existence under the hood
    uint32 grade = getGrade(_tokenId);

    // check if we're not downgrading the gem
    require(grade < _grade);

    // set the grade required
    tokens[_tokenId].grade = _grade;

    // update the grade modification date
    tokens[_tokenId].gradeModified = uint32(now);

    // emit an event
    emit Upgraded(msg.sender, ownerOf(_tokenId), _tokenId, grade, _grade);
  }


  /**
   * @dev Gets the state modified date of a token
   * @param _tokenId ID of the token to get state modified date for
   * @return token state modification date as a unix timestamp
   */
  function getStateModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's state modified date from storage and return
    return tokens[_tokenId].stateModified;
  }

  /**
   * @dev Gets the state of a token
   * @param _tokenId ID of the token to get state for
   * @return a token state
   */
  function getState(uint256 _tokenId) public view returns(uint24) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's state from storage and return
    return tokens[_tokenId].state;
  }

  /**
   * @dev Verifies if token is transferable (can change ownership)
   * @param _tokenId ID of the token to check transferable state for
   * @return true if token is transferable, false otherwise
   */
  function isTransferable(uint256 _tokenId) public view returns(bool) {
    // validate token existence
    require(exists(_tokenId));

    // calculate token state and transfer mask intersection
    // and compare this intersection with zero
    return tokens[_tokenId].state & transferLock == 0;
  }

  /**
   * @dev Modifies the state of a token
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param _tokenId ID of the token to set state for
   * @param _state new state to set for the token
   */
  function setState(uint256 _tokenId, uint24 _state) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_STATE_PROVIDER));

    // read current state value
    // verifies token existence under the hood
    uint24 state = getState(_tokenId);

    // check that new state is not the same as an old one
    // do not require this for state, allow state modification data update
    // require(_state != state);

    // set the state required
    tokens[_tokenId].state = _state;

    // update the state modification date
    tokens[_tokenId].stateModified = uint32(now);

    // emit an event
    emit StateModified(msg.sender, ownerOf(_tokenId), _tokenId, state, _state);
  }

  /**
   * @dev Gets the creation time of a token
   * @param _tokenId ID of the token to get creation time for
   * @return a token creation time as a unix timestamp
   */
  function getCreationTime(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's creation time from storage and return
    return tokens[_tokenId].creationTime;
  }

  /**
   * @dev Gets the ownership modified time of a token
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
   * @dev Allows setting the `transferLock` parameter of the contract,
   *      which is used to determine if a particular token is locked or not
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   * @dev Requires sender to have `ROLE_TRANSFER_LOCK_PROVIDER` permission.
   * @param _transferLock a value to set `transferLock` to
   */
  function setTransferLock(uint24 _transferLock) public {
    // check that the call is made by a transfer lock provider
    require(isSenderInRole(ROLE_TRANSFER_LOCK_PROVIDER));

    // in case if new bitmask is different from what is already set
    if(_transferLock != transferLock) {
      // emit an event first - `transferLock` will be overwritten
      emit TransferLockChanged(msg.sender, transferLock, _transferLock);

      // update the transfer lock
      transferLock = _transferLock;
    }
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
   * @dev Gets the owner of the specified token from the `gems` mapping
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
   * @dev Creates new token with token ID derived from the country ID
   *      and assigns an ownership `_to` for this token
   * @dev Allows setting initial token's properties
   * @param _to an address to mint token to (first owner of the token)
   * @param _tokenId ID of the token to mint
   * @param _plotId ID of the plot that gem "belongs to" (was found in)
   * @param _color gem color
   * @param _level gem level
   * @param _grade grade of the gem,
   *      high 8 bits represent grade type,
   *      low 24 bits - grade value
   */
  function mint(
    address _to,
    uint32 _tokenId,
    uint24 _plotId,
    uint8 _color,
    uint8 _level,
    uint32 _grade
  ) public {
    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(_to, _tokenId, _plotId, _color, _level, _grade);

    // fire Minted event
    emit Minted(msg.sender, _to, _tokenId);

    // fire ERC721 transfer event
    emit Transfer(address(0), _to, _tokenId);
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
    return StringUtils.concat("http://cryptominerworld.com/gem/", StringUtils.itoa(_tokenId, 10));
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
    // cast token ID to uint32 space
    uint32 tokenId = uint32(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the token structure pointer to the storage
    Gem storage token = tokens[_tokenId];

    // get a reference to the collection where token is now
    uint32[] storage source = collections[_from];

    // get a reference to the collection where token goes to
    uint32[] storage destination = collections[_to];

    // collection `source` cannot be empty, by design of transfer functions
    assert(source.length != 0);

    // index of the token within collection `source`
    uint32 i = token.index;

    // we put the last token in the collection `source` to the position released
    // get an ID of the last token in `source`
    uint32 sourceId = source[source.length - 1];

    // update last token index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position `i` within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update token index according to position in new collection `destination`
    token.index = uint32(destination.length);

    // update token owner
    token.owner = _to;

    // update token ownership transfer date
    token.ownershipModified = uint32(now);

    // push token into destination collection
    destination.push(tokenId);
  }

  /**
   * @dev Creates new token with token ID derived from the country ID
   *      and assigns an ownership `_to` for this token
   * @dev Unsafe: doesn't check if caller has enough permissions to execute the call,
   *      checks only that the token doesn't exist yet
   * @dev Must be kept private at all times
   * @param _to an address to mint token to (first owner of the token)
   * @param _tokenId ID of the token to mint
   * @param _plotId ID of the plot that gem "belongs to" (was found in)
   * @param _color gem color
   * @param _level gem level
   * @param _grade grade of the gem,
   *      high 8 bits represent grade type,
   *      low 24 bits - grade value
   */
  function __mint(
    address _to,
    uint32 _tokenId,
    uint24 _plotId,
    uint8 _color,
    uint8 _level,
    uint32 _grade
  ) private {
    // validate destination address
    require(_to != address(0));
    require(_to != address(this));

    // check that token ID is valid
    require(_tokenId > 0);

    // ensure that token with such ID doesn't exist
    require(!exists(_tokenId));

    // create new gem in memory
    Gem memory token = Gem({
      plotId: _plotId,
      color: _color,
      level: _level,
      levelModified: 0,
      grade: _grade,
      gradeModified: 0,
      age: 0,
      ageModified: 0,
      state: 0,
      stateModified: 0,
      creationTime: uint32(now),
      index: uint32(collections[_to].length),
      ownershipModified: 0,
      owner: _to
    });

    // push newly created `tokenId` to the owner's collection of tokens
    collections[_to].push(_tokenId);

    // persist token to the storage
    tokens[_tokenId] = token;

    // add token ID to the `allTokens` collection,
    // automatically updates total supply
    allTokens.push(_tokenId);
  }

}
