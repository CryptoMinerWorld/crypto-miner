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
 *      a 24 bit number to a set of gem properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 * @dev A gem token supports only minting, it can be only created
 *
 * @author Basil Gorin
 */
contract GemERC721 is ERC721Core {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x66fb61e14900ebf44ba5bd2da5e3adf87793bc5af28b5761f26c96972b73ec50;

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
     * @dev Gem grade, mutable, may only increase
     * @dev High 8 bits of the grade is grade type:
     *      D (1), C (2), B (3), A (4), AA (5) and AAA (6)
     * @dev Low 24 bits of the grade is grade value
     */
    uint32 grade;

    /**
     * @dev Initially zero, changes when level or grade is modified
     *      (meaning the gem is upgraded)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 propertiesModified;

    /**
     * @dev Initially zero, can only increase
     */
    uint24 plotsMined;

    /**
     * @dev Initially zero, can only increase
     */
    uint32 blocksMined;

    /**
     * @dev Saved energetic age of the gem, mutable
     * @dev Stored in seconds
     */
    uint32 age;

    /**
     * @dev State value, mutable
     */
    uint32 state;

    /**
     * @dev Initially zero, changes when blocks mined, plots mined,
     *      age or state are modified
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
  mapping(address => uint24[]) public collections;

  /**
   * @dev Array with all token ids, used for enumeration
   * @dev ERC20 compliant structure for totalSupply can be derived
   *      as a length of this collection
   * @dev ERC20 totalSupply() is equal to allTokens.length
   */
  uint24[] public allTokens;

  /**
   * @dev Gem colors available in the system
   */
  uint8[] public availableColors = [1, 2, 5, 6, 7, 9, 10];

  /**
   * @dev Next token (gem) ID
   */
  uint24 public nextId = 0x12500;

  /**
   * @dev The data in token's state may contain lock(s)
   *      (ex.: if token currently busy with some function which prevents transfer)
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   */
  uint32 public transferLock = DEFAULT_MINING_BIT;

  /**
   * @dev Default bitmask indicating that the gem is `mining`
   * @dev Consists of a single bit at position 1 – binary 1
   * @dev The bit meaning in token's `state` is as follows:
   *      0: not mining
   *      1: mining
   */
  uint32 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1

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

  /**
   * @notice Level provider is responsible for enabling the workshop
   * @dev Role ROLE_LEVEL_PROVIDER allows leveling up the gem
   */
  uint32 public constant ROLE_LEVEL_PROVIDER = 0x00000040;

  /**
   * @notice Grade provider is responsible for enabling the workshop
   * @dev Role ROLE_GRADE_PROVIDER allows modifying gem's grade
   */
  uint32 public constant ROLE_GRADE_PROVIDER = 0x00000080;

  /**
   * @notice Energetic age provider is responsible for mining
   * @dev Role ROLE_AGE_PROVIDER allows setting energetic age of the gem
   */
  uint32 public constant ROLE_AGE_PROVIDER = 0x00000100;

  /**
   * @notice Mine stats provider is responsible for updating gem mining stats
   * @dev Role ROLE_MINED_STATS_PROVIDER allows updating plots and blocks mined counters
   */
  uint32 public constant ROLE_MINED_STATS_PROVIDER = 0x00000200;

  /**
   * @dev Next ID Inc is responsible for incrementing `nextId`,
   *      permission allows to call `incrementId`
   */
  uint32 public constant ROLE_NEXT_ID_INC = 0x00001000;

  /**
   * @dev Available colors provider may change the `availableColors` array
   */
  uint32 public constant ROLE_AVAILABLE_COLORS_PROVIDER = 0x00002000;

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
    uint32 _from,
    uint32 _to
  );

  /**
   * @dev Fired in setTransferLock()
   * @param _by transfer lock provider
   *      (an address having `ROLE_TRANSFER_LOCK_PROVIDER` permission)
   *      which modified `transferLock` global variable
   * @param _from old value of `transferLock`
   * @param _to new value of `transferLock`
   */
  event TransferLockChanged(address indexed _by, uint32 _from, uint32 _to);

  /**
   * @dev Fired in levelUp() and levelUpBy()
   * @param _by level provider
   *      (an address having `ROLE_LEVEL_PROVIDER` permission)
   *      which modified token `_tokenId` level
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose level was increased
   * @param _from old level
   * @param _to new level
   */
  event LevelUp(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint8 _from,
    uint8 _to
  );

  /**
   * @dev Fired in upgradeGrade()
   * @param _by grade provider
   *      (an address having `ROLE_GRADE_PROVIDER` permission)
   *      which modified token `_tokenId` grade
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose grade was increased
   * @param _from old grade
   * @param _to new grade
   */
  event Upgraded(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint32 _from,
    uint32 _to
  );

  /**
   * @dev Fired in setAge()
   * @param _by level provider
   *      (an address having `ROLE_AGE_PROVIDER` permission)
   *      which modified token `_tokenId` energetic age
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose energetic age was modified
   * @param _from old energetic age
   * @param _to new energetic age
   */
  event EnergeticAgeModified(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint32 _from,
    uint32 _to
  );

  /**
   * @dev Fired in updateMinedStats()
   * @param _by mined stats provider
   *      (an address having `ROLE_MINED_STATS_PROVIDER` permission)
   *      which modified token `_tokenId` energetic age
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose energetic age was modified
   * @param _plotsFrom old minedPlots value
   * @param _plotsTo new minedPlots value
   * @param _blocksFrom old minedBlocks value
   * @param _blocksTo new minedBlocks value
   */
  event MinedStatsModified(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint24 _plotsFrom,
    uint24 _plotsTo,
    uint32 _blocksFrom,
    uint32 _blocksTo
  );
  
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
   * @dev Returns current value of `nextId` and increments it by one
   * @return next token ID
   */
  function incrementId() public returns(uint24) {
    // ensure sender has permission to increment `nextId`
    require(isSenderInRole(ROLE_NEXT_ID_INC));

    // return `nextId` and increment it after
    return nextId++;
  }

  /**
   * @dev Updates `availableColors` array
   * @dev Requires sender to have `ROLE_AVAILABLE_COLORS_PROVIDER` permission
   * @dev Requires input array not to be empty
   * @param colors array of available colors to set
   */
  function setAvailableColors(uint8[] memory colors) public {
    // ensure sender has permission to set colors
    require(isSenderInRole(ROLE_AVAILABLE_COLORS_PROVIDER));

    // ensure array is not empty
    require(colors.length != 0);

    // set `availableColors` array
    availableColors = colors;
  }

  /**
   * @dev Getter for an entire `availableColors` array
   * @return array of available colors - `availableColors`
   */
  function getAvailableColors() public view returns(uint8[] memory) {
    // just return an array as is
    return availableColors;
  }

  /**
   * @dev Gets a gem by ID, representing it as two integers.
   *      The two integers are tightly packed with a gem data:
   *      First integer (high bits) contains (from higher to lower bits order):
   *          plotId, 24 bits
   *          color, 8 bits
   *          level, 8 bits
   *          grade, 32 bits
   *          propertiesModified, 32 bits
   *          plots mined, 24 bits
   *          blocks mined, 32 bits
   *          age, 32 bits
   *          state, 32 bits
   *          stateModified, 32 bits
   *      Second integer (low bits) contains (from higher to lower bits order):
   *          creationTime, 32 bits
   *          index, 32 bits (only low 24 bits are used)
   *          ownershipModified, 32 bits
   *          owner, 160 bits
   * @dev Throws if token specified doesn't exist
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
                 | uint216(token.grade) << 184
                 | uint184(token.propertiesModified) << 152
                 | uint152(token.plotsMined) << 128
                 | uint128(token.blocksMined) << 96
                 | uint96(token.age) << 64
                 | uint64(token.state) << 32
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
  function getAllTokens() public view returns(uint24[] memory) {
    // read an array of all the minted tokens and return
    return allTokens;
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *       in a single function, useful when connecting to external node like INFURA
   * @dev Each element in the collection contains
   *      max (state modified, creation time) (32 bits)
   *      max (ownership modified, creation time) (32 bits)
   *      grade (32 bits)
   *      level (8 bits)
   *      plots mined (24 bits)
   *      blocks mined (32 bits)
   *      energetic age (32 bits)
   *      state (32 bits)
   *      color (8 bits)
   *      token ID (24 bits)
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of packed token data
   */
  function getPackedCollection(address owner) public view returns (uint256[] memory) {
    // get an array of Gem IDs owned by an `owner` address
    uint24[] memory tokenIds = getCollection(owner);

    // how many gems are there in a collection
    uint24 balance = uint24(tokenIds.length);

    // data container to store the result
    uint256[] memory result = new uint256[](balance);

    // fetch token info one by one and pack into structure
    for(uint24 i = 0; i < balance; i++) {
      // load token data structure into memory
      Gem memory token = tokens[tokenIds[i]];

      // read all required data and pack it
      result[i] = uint256(token.stateModified > token.creationTime? token.stateModified: token.creationTime) << 224
                | uint224(token.ownershipModified > token.creationTime? token.ownershipModified: token.creationTime) << 192
                | uint192(token.grade) << 160
                | uint160(token.level) << 152
                | uint152(token.plotsMined) << 128
                | uint128(token.blocksMined) << 96
                | uint96(token.age) << 64
                | uint64(token.state) << 32
                | uint32(token.color) << 24
                | tokenIds[i];
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
  function getCollection(address owner) public view returns(uint24[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Gets the state modified date of a token
   * @dev Throws if token specified doesn't exist
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
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get state for
   * @return a token state
   */
  function getState(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].state;
  }

  /**
   * @dev Verifies if token is transferable (can change ownership)
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to check transferable state for
   * @return true if token is transferable, false otherwise
   */
  function isTransferable(uint256 _tokenId) public view returns(bool) {
    // calculate token state and transfer mask intersection
    // and compare this intersection with zero
    // check token existence under the hood in getState()
    return getState(_tokenId) & transferLock == 0;
  }

  /**
   * @dev Modifies the state of a token
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to set state for
   * @param _state new state to set for the token
   */
  function setState(uint256 _tokenId, uint32 _state) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_STATE_PROVIDER));

    // read current state value
    // verifies token existence under the hood
    uint32 state = getState(_tokenId);

    // check that new state is not the same as an old one
    // do not require this for state, allow state modification data update
    // require(_state != state);

    // set the state required
    tokens[_tokenId].state = _state;

    // update the state modification date
    tokens[_tokenId].stateModified = now32();

    // emit an event
    emit StateModified(msg.sender, ownerOf(_tokenId), _tokenId, state, _state);
  }

  /**
   * @dev Gets the creation time of a token
   * @dev Throws if token specified doesn't exist
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
   * @dev Allows setting the `transferLock` parameter of the contract,
   *      which is used to determine if a particular token is locked or not
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   * @dev Requires sender to have `ROLE_TRANSFER_LOCK_PROVIDER` permission.
   * @param _transferLock a value to set `transferLock` to
   */
  function setTransferLock(uint32 _transferLock) public {
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
   * @dev Gets the land plot ID of a gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get land plot ID value for
   * @return a token land plot ID
   */
  function getPlotId(uint256 _tokenId) public view returns(uint24) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].plotId;
  }

  /**
   * @dev Gets the gem's properties – color, level and
   *      grade - as packed uint32 number
   * @dev Throws if token specified doesn't exist
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
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get color for
   * @return a token color
   */
  function getColor(uint256 _tokenId) public view returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].color;
  }

  /**
   * @dev Gets the level or grade modified date of a gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get properties modified date for
   * @return a token grade modified date
   */
  function getPropertiesModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's grade modified date from storage and return
    return tokens[_tokenId].propertiesModified;
  }

  /**
   * @dev Gets the level of a token
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get level for
   * @return a token level
   */
  function getLevel(uint256 _tokenId) public view returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].level;
  }

  /**
   * @dev Levels up a gem to the level specified
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to level up
   * @param _level new gem's level to set to
   */
  function levelUpTo(uint256 _tokenId, uint8 _level) public {
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
    tokens[_tokenId].propertiesModified = now32();

    // emit an event
    emit LevelUp(msg.sender, ownerOf(_tokenId), _tokenId, level, _level);
  }

  /**
   * @dev Levels up a gem to by the level delta specified
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @dev Throws if token specified doesn't exist
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
    tokens[_tokenId].propertiesModified = now32();

    // emit an event
    emit LevelUp(msg.sender, ownerOf(_tokenId), _tokenId, level, level + _by);
  }

  /**
   * @dev Gets the grade of a gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get grade for
   * @return a token grade
   */
  function getGrade(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].grade;
  }

  /**
   * @dev Gets the grade type of a gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get grade type for
   * @return a token grade type
   */
  function getGradeType(uint256 _tokenId) public view returns(uint8) {
    // extract high 8 bits of the grade and return
    return uint8(getGrade(_tokenId) >> 24);
  }

  /**
   * @dev Gets the grade value of a gem
   * @dev Throws if token specified doesn't exist
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
   * @dev Throws if token specified doesn't exist
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
    tokens[_tokenId].propertiesModified = now32();

    // emit an event
    emit Upgraded(msg.sender, ownerOf(_tokenId), _tokenId, grade, _grade);
  }

  /**
   * @dev Gets number of plots mined by the gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get plots mined for
   * @return a plots mined by the token value
   */
  function getPlotsMined(uint256 _tokenId) public view returns(uint24) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].plotsMined;
  }

  /**
   * @dev Gets number of blocks mined by the gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get blocks mined for
   * @return a blocks mined by the token value
   */
  function getBlocksMined(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].blocksMined;
  }

  /**
   * @dev Increases plots mined and blocks mined counters of the gem
   */
  function updateMinedStats(uint256 _tokenId, uint24 _plots, uint32 _blocks) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_MINED_STATS_PROVIDER));

    // read plots and blocks mined values,
    // verify token existence under the hood
    uint24 plotsMined = getPlotsMined(_tokenId);
    uint32 blocksMined = getBlocksMined(_tokenId);

    // arithmetic overflow checks
    require(plotsMined + _plots >= plotsMined);
    require(blocksMined + _blocks >= blocksMined);

    // update mining stats
    tokens[_tokenId].plotsMined += _plots;
    tokens[_tokenId].blocksMined += _blocks;

    // update the state modification date
    tokens[_tokenId].stateModified = now32();

    // emit en event
    emit MinedStatsModified(msg.sender, ownerOf(_tokenId), _tokenId, plotsMined, plotsMined + _plots, blocksMined, blocksMined + _blocks);
  }

  /**
   * @dev Gets the energetic age of a gem
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the gem to get age for
   * @return a token energetic age value
   */
  function getAge(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain the value of interest from token structure
    return tokens[_tokenId].age;
  }

  /**
   * @dev Modifies the energetic age of a token
   * @dev Requires sender to have `ROLE_AGE_PROVIDER` permission
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to set age for
   * @param _age new energetic age to set for the token
   */
  function setAge(uint256 _tokenId, uint32 _age) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_AGE_PROVIDER));

    // read current energetic age value
    // verifies token existence under the hood
    uint32 age = getAge(_tokenId);

    // set the state required
    tokens[_tokenId].age = _age;

    // update the state modification date
    tokens[_tokenId].stateModified = now32();

    // emit an event
    emit EnergeticAgeModified(msg.sender, ownerOf(_tokenId), _tokenId, age, _age);
  }

  /**
   * @dev Gets last modification date of any data in gem's structure
   * @dev Doesn't take into account ext256 data
   * @dev Throws if token specified doesn't exist
   * @param _tokenId ID of the token to get modification time for
   * @return a token modification time as a unix timestamp
   */
  function getModified(uint256 _tokenId) public view returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // load token data into the memory
    Gem memory token = tokens[_tokenId];

    // return the biggest of modification dates
    return token.stateModified > token.creationTime? token.stateModified: token.creationTime;
  }

  /**
   * @dev Creates new token with token ID specified
   *      and assigns an ownership `_to` for this token
   * @dev Allows setting initial token's properties
   * @dev Requires caller to be token creator (have `ROLE_TOKEN_CREATOR` permission)
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
    uint24 _tokenId,
    uint24 _plotId,
    uint8 _color,
    uint8 _level,
    uint32 _grade
  ) public {
    // delegate call to `mintWith`
    mintWith(_to, _tokenId, _plotId, _color, _level, _grade, 0);
  }

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
  function mintWith(
    address _to,
    uint24 _tokenId,
    uint24 _plotId,
    uint8 _color,
    uint8 _level,
    uint32 _grade,
    uint32 _age
  ) public {
    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // if setting an energetic age – also ensure caller is age provider
    require(_age == 0 || isSenderInRole(ROLE_AGE_PROVIDER));

    // delegate call to `__mint`
    __mint(_to, _tokenId, _plotId, _color, _level, _grade, _age);
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
    // cast token ID to uint24 space
    uint24 tokenId = uint24(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the token structure pointer to the storage
    Gem storage token = tokens[_tokenId];

    // get a reference to the collection where token is now
    uint24[] storage source = collections[_from];

    // get a reference to the collection where token goes to
    uint24[] storage destination = collections[_to];

    // collection `source` cannot be empty, by design of transfer functions
    assert(source.length != 0);

    // index of the token within collection `source`
    uint24 i = uint24(token.index); // we use only low 24 bits of the index

    // we put the last token in the collection `source` to the position released
    // get an ID of the last token in `source`
    uint24 sourceId = source[source.length - 1];

    // update last token index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position `i` within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update token index according to position in new collection `destination`
    token.index = uint24(destination.length);

    // update token owner
    token.owner = _to;

    // update token ownership transfer date
    token.ownershipModified = now32();

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
   * @param _age initial energetic age of the gem
   */
  function __mint(
    address _to,
    uint24 _tokenId,
    uint24 _plotId,
    uint8 _color,
    uint8 _level,
    uint32 _grade,
    uint32 _age
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
      grade: _grade,
      propertiesModified: 0,
      plotsMined: 0,
      blocksMined: 0,
      age: _age,
      state: 0,
      stateModified: 0,
      creationTime: now32(),
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

    // fire Minted event
    emit Minted(msg.sender, _to, _tokenId);

    // fire ERC721 transfer event
    emit Transfer(address(0), _to, _tokenId);
  }

}
