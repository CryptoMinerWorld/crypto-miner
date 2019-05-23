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

    /// @dev Where gem was found: land plot ID,
    ///      land block within a plot,
    ///      gem number (id) within a block of land, immutable
    // TODO: shrink to 32 bits
    uint64 coordinates;

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
     * @dev State value, mutable
     */
    // TODO: extend to 64 or 80 bits
    uint48 state;

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
  uint64 public transferLock = DEFAULT_MINING_BIT;

  /**
   * @dev Default bitmask indicating that the gem is `mining`
   * @dev Consists of a single bit at position 1 – binary 1
   * @dev The bit meaning in token's `state` is as follows:
   *      0: not mining
   *      1: mining
   */
  uint64 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1

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
    uint128 _from,
    uint128 _to
  );

  /**
   * @dev Fired in setTransferLock()
   * @param _by transfer lock provider
   *      (an address having `ROLE_TRANSFER_LOCK_PROVIDER` permission)
   *      which modified `transferLock` global variable
   * @param _from old value of `transferLock`
   * @param _to new value of `transferLock`
   */
  event TransferLockChanged(address indexed _by, uint64 _from, uint64 _to);

  /// @dev Fired in levelUp()
  event LevelUp(address indexed _by, address indexed _owner, uint256 indexed _tokenId, uint8 _levelReached);

  /// @dev Fired in upgradeGrade()
  event UpgradeComplete(address indexed _by, address indexed _owner, uint256 indexed _tokenId, uint32 _gradeFrom, uint32 _gradeTo);

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

    // load the gem from storage
    Gem memory gem = tokens[_tokenId];

    // pack high 256 bits of the result
    uint256 high = uint256(gem.coordinates) << 192
                 | uint192(gem.color) << 184
                 | uint184(gem.levelModified) << 152
                 | uint152(gem.level) << 144
                 | uint144(gem.gradeModified) << 112
                 | uint112(gem.grade) << 80
                 | uint80(gem.stateModified) << 48
                 | uint48(gem.state);

    // pack low 256 bits of the result
    uint256 low  = uint256(gem.creationTime) << 224
                 | uint224(gem.index) << 192
                 | uint192(gem.ownershipModified) << 160
                 | uint160(gem.owner);

    // return the whole 512 bits of result
    return (high, low);
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *       in a single function, useful when connecting to external node like INFURA
   * @param owner an address to query a collection for
   */
  function getPackedCollection(address owner) public view returns (uint80[] memory) {
    // get an array of Gem IDs owned by an `owner` address
    uint32[] memory tokenIds = getCollection(owner);

    // how many gems are there in a collection
    uint32 balance = uint32(tokenIds.length);

    // data container to store the result
    uint80[] memory result = new uint80[](balance);

    // fetch token info one by one and pack into structure
    for(uint32 i = 0; i < balance; i++) {
      // token ID to work with
      uint32 tokenId = tokenIds[i];
      // get the token properties and pack them together with tokenId
      uint48 properties = getProperties(tokenId);

      // pack the data
      result[i] = uint80(tokenId) << 48 | properties;
    }

    // return the packed data structure
    return result;
  }

  /**
   * @notice Retrieves a collection of tokens owned by a particular address
   * @notice An order of token IDs is not guaranteed and may change
   *      when a token from the list is transferred
   * @param owner an address to query a collection for
   * @return an ordered list of tokens
   */
  function getCollection(address owner) public view returns(uint32[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Gets the coordinates of a token
   * @param _tokenId ID of the token to get coordinates for
   * @return a token coordinates
   */
  function getCoordinates(uint256 _tokenId) public view returns(uint64) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's coordinates from storage and return
    return tokens[_tokenId].coordinates;
  }

  /**
   * @dev Gets the land plot ID of a gem
   * @param _tokenId ID of the gem to get land plot ID value for
   * @return a token land plot ID
   */
  function getPlotId(uint256 _tokenId) public view returns(uint32) {
    // extract high 32 bits of the coordinates and return
    return uint32(getCoordinates(_tokenId) >> 32);
  }

  /**
   * @dev Gets the depth (block ID) within plot of land of a gem
   * @param _tokenId ID of the gem to get depth value for
   * @return a token depth
   */
  function getDepth(uint256 _tokenId) public view returns(uint16) {
    // extract middle 16 bits of the coordinates and return
    return uint16(getCoordinates(_tokenId) >> 16);
  }

  /**
   * @dev Gets the gem's number within land block
   * @param _tokenId ID of the gem to get depth value for
   * @return a gem number within a land block
   */
  function getGemNum(uint256 _tokenId) public view returns(uint16) {
    // extract low 16 bits of the coordinates and return
    return uint16(getCoordinates(_tokenId));
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
   * @dev Levels up a gem
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param _tokenId ID of the gem to level up
   */
  function levelUp(uint256 _tokenId) public {
    // check that the call is made by a level provider
    require(isSenderInRole(ROLE_LEVEL_PROVIDER));

    // check that token to set state for exists
    require(exists(_tokenId));

    // update the level modified date
    tokens[_tokenId].levelModified = uint32(block.number);

    // increment the level required
    tokens[_tokenId].level++;

    // emit an event
    emit LevelUp(msg.sender, ownerOf(_tokenId), _tokenId, tokens[_tokenId].level);
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
   * @param grade new grade to set for the token, should be higher then current state
   */
  function upgradeGrade(uint256 _tokenId, uint32 grade) public {
    // check that the call is made by a grade provider
    require(isSenderInRole(ROLE_GRADE_PROVIDER));

    // check that token to set grade for exists
    require(exists(_tokenId));

    // check if we're not downgrading the gem
    require(tokens[_tokenId].grade < grade);

    // emit an event
    emit UpgradeComplete(msg.sender, ownerOf(_tokenId), _tokenId, tokens[_tokenId].grade, grade);

    // set the grade required
    tokens[_tokenId].grade = grade;

    // update the grade modified date
    tokens[_tokenId].gradeModified = uint32(block.number);
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
  function getState(uint256 _tokenId) public view returns(uint48) {
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
   * @param newState new state to set for the token
   */
  function setState(uint256 _tokenId, uint48 newState) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_STATE_PROVIDER));

    // check that token to set state for exists
    require(exists(_tokenId));

    // read old state value
    uint48 state = tokens[_tokenId].state;

    // check that new state is not the same as an old one
    // do not require this for state, allow state modification data update
    // require(newState != state);

    // set the state required
    tokens[_tokenId].state = newState;

    // update the state modified date
    tokens[_tokenId].stateModified = uint32(block.number);

    // emit an event
    emit StateModified(msg.sender, ownerOf(_tokenId), _tokenId, state, newState);
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
  function setTransferLock(uint64 _transferLock) public {
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
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Allows setting initial token's properties
   * @param to an address to assign created token ownership to
   * @param tokenId ID of the token to create
   */
  function mint(
    address to,
    uint32 tokenId,
    uint32 plotId,
    uint16 depth,
    uint16 gemNum,
    uint8 color,
    uint8 level,
    uint8 gradeType,
    uint24 gradeValue
  ) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(to, tokenId, plotId, depth, gemNum, color, level, gradeType, gradeValue);
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

  /// @dev Creates new token with `tokenId` ID specified and
  ///      assigns an ownership `to` for this token
  /// @dev Unsafe: doesn't check if caller has enough permissions to execute the call
  ///      checks only that the token doesn't exist yet
  /// @dev Must be kept private at all times
  function __mint(
    address to,
    uint32 tokenId,
    uint32 plotId,
    uint16 depth,
    uint16 gemNum,
    uint8 color,
    uint8 level,
    uint8 gradeType,
    uint24 gradeValue
  ) private {
    // check that `tokenId` is inside valid bounds
    require(tokenId > 0);

    // ensure that token with such ID doesn't exist
    require(!exists(tokenId));

    // create new gem in memory
    Gem memory gem = Gem({
      coordinates: uint64(plotId) << 32 | uint32(depth) << 16 | gemNum,
      color: color,
      levelModified: 0,
      level: level,
      gradeModified: 0,
      grade: uint32(gradeType) << 24 | gradeValue,
      stateModified: 0,
      state: 0,

      creationTime: uint32(block.number),
      // token index within the owner's collection of token
      // points to the place where the token will be placed to
      index: uint32(collections[to].length),
      ownershipModified: 0,
      owner: to
    });

    // push newly created `tokenId` to the owner's collection of tokens
    collections[to].push(tokenId);

    // persist gem to the storage
    tokens[tokenId] = gem;

    // add token ID to the `allTokens` collection,
    // automatically updates total supply
    allTokens.push(tokenId);

    // fire Minted event
    emit Minted(msg.sender, to, tokenId);

    // fire ERC721 transfer event
    emit Transfer(address(0), to, tokenId);
  }

  /// @dev Move a `gem` from owner `from` to a new owner `to`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __move(address from, address to, uint256 _tokenId) internal {
    // cast token ID to uint32 space
    uint32 tokenId = uint32(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the gem pointer to the storage
    Gem storage gem = tokens[_tokenId];

    // get a reference to the collection where gem is now
    uint32[] storage source = collections[from];

    // get a reference to the collection where gem goes to
    uint32[] storage destination = collections[to];

    // collection `source` cannot be empty, if it is - it's a bug
    assert(source.length != 0);

    // index of the gem within collection `source`
    uint32 i = gem.index;

    // we put the last gem in the collection `source` to the position released
    // get an ID of the last gem in `source`
    uint32 sourceId = source[source.length - 1];

    // update gem index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position i within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update gem index according to position in new collection `destination`
    gem.index = uint32(destination.length);

    // update gem owner
    gem.owner = to;

    // update ownership transfer date
    gem.ownershipModified = uint32(block.number);

    // push gem into collection
    destination.push(tokenId);
  }

}
