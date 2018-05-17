pragma solidity 0.4.23;

import "./AccessControl.sol";

/**
 * @notice Gem is unique tradable entity. Non-fungible.
 * @dev A gem is an ERC721 non-fungible token, which maps Token ID,
 *      a 32 bit number to a set of gem properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 * @dev A gem token supports both minting and burning, can be created and destroyed
 */
contract GemERC721 is AccessControl {
  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant TOKEN_VERSION = 0x1;

  /// @dev Tokens within the reserved space cannot be issued/minted
  /// @dev This limitation is required to support ERC20 compatible transfers:
  ///      numbers outside this space are treated as token IDs, while
  ///      numbers inside this space are treated to be token amounts
  uint32 public constant RESERVED_TOKEN_ID_SPACE = 0x400;

  /// @dev ERC20 compliant token symbol
  string public constant symbol = "GEM";
  /// @dev ERC20 compliant token name
  string public constant name = "GEM – CryptoMiner World";
  /// @dev ERC20 compliant token decimals
  /// @dev this can be only zero, since ERC721 token is non-fungible
  uint8 public constant decimals = 0;

  /// @dev A gem data structure
  /// @dev Occupies 64 bytes of storage (512 bits)
  struct Gem {
    /// High 256 bits
    /// @dev Where gem was found: land plot ID,
    ///      land block within a plot,
    ///      gem number (id) within a block of land, immutable
    uint64 coordinates;

    /// @dev Gem color, one of 12 values, immutable
    uint8 color;

    /// @dev Level modified time
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem was created
    uint32 levelModified;

    /// @dev Level value (mutable), one of 1, 2, 3, 4, 5
    uint8 level;

    /// @dev Grade modified time
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem was created
    uint32 gradeModified;

    /// @dev High 8 bits store grade type and low 8 bits grade value
    /// @dev Grade type is one of D (1), C (2), B (3), A (4), AA (5) and AAA (6)
    uint16 grade;

    /// @dev Store state modified time
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem was created
    uint32 stateModified;

    /// @dev State value, mutable
    uint64 state;


    /// Low 256 bits
    /// @dev Gem creation time, immutable, cannot be zero
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem was created
    uint32 creationTime;

    /// @dev Gem index within an owner's collection of gems, mutable
    uint32 index;

    /// @dev Initially zero, changes when ownership is transferred
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem's ownership was changed, mutable
    uint32 ownershipModified;

    /// @dev Gem's owner, initialized upon gem creation, mutable
    address owner;
  }

  /// @notice All the emitted gems
  /// @dev Core of the Gem as ERC721 token
  /// @dev Maps Gem ID => Gem Data Structure
  mapping(uint32 => Gem) public gems;

  /// @dev Mapping from a gem ID to an address approved to
  ///      transfer ownership rights for this gem
  mapping(uint32 => address) public approvals;

  /// @dev Mapping from owner to operator approvals
  ///      token owner => approved token operator => approvals left (zero means no approval)
  /// @dev ERC20 compliant structure for
  ///      function allowance(address owner, address spender) public constant returns (uint256 remaining)
  mapping(address => mapping(address => uint256)) public allowance;

  /// @notice Storage for a collections of tokens
  /// @notice A collection of tokens is an ordered list of token IDs,
  ///      owned by a particular address (owner)
  /// @dev A mapping from owner to a collection of his tokens (IDs)
  /// @dev ERC20 compliant structure for balances can be derived
  ///      as a length of each collection in the mapping
  /// @dev ERC20 balances[owner] is equal to collections[owner].length
  mapping(address => uint32[]) public collections;

  /// @notice Total number of existing tokens
  /// @dev ERC20 compliant field for totalSupply()
  uint32 public totalSupply;

  /// @dev The data in token's state may contain lock(s)
  ///      (ex.: is gem currently mining or not)
  /// @dev A locked token cannot be transferred or upgraded
  /// @dev The token is locked if it contains any bits
  ///      from the `lockedBitmask` in its `state` set
  uint64 public lockedBitmask = DEFAULT_MINING_BIT;

  /// @dev Enables ERC721 transfers of the tokens
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;

  /// @dev Enables ERC721 transfers on behalf
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  /// @dev Enables partial support of ERC20 transfers of the tokens,
  ///      allowing to transfer only all owned tokens at once
  uint32 public constant ERC20_TRANSFERS = 0x00000004;

  /// @dev Enables partial support of ERC20 transfers on behalf
  ///      allowing to transfer only all owned tokens at once
  uint32 public constant ERC20_TRANSFERS_ON_BEHALF = 0x00000008;

  /// @dev Enables full support of ERC20 transfers of the tokens,
  ///      allowing to transfer arbitrary amount of the tokens at once
  uint32 public constant ERC20_INSECURE_TRANSFERS = 0x00000010;

  /// @dev Default bitmask indicating that the gem is `mining`
  /// @dev Consists of a single bit at position 1 – binary 1
  /// @dev This bit is cleared by `miningComplete`
  /// @dev The bit meaning in gem's `state` is as follows:
  ///      0: not mining
  ///      1: mining
  uint64 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1
  
  /// @notice Exchange is responsible for trading tokens on behalf of token holders
  /// @dev Role ROLE_EXCHANGE allows executing transfer on behalf of token holders
  /// @dev Not used
  //uint32 public constant ROLE_EXCHANGE = 0x00010000;

  /// @notice Level provider is responsible for enabling the workshop
  /// @dev Role ROLE_LEVEL_PROVIDER allows leveling up the gem
  uint32 public constant ROLE_LEVEL_PROVIDER = 0x00100000;

  /// @notice Grade provider is responsible for enabling the workshop
  /// @dev Role ROLE_GRADE_PROVIDER allows modifying gem's grade
  uint32 public constant ROLE_GRADE_PROVIDER = 0x00200000;

  /// @notice Token state provider is responsible for enabling the mining protocol
  /// @dev Role ROLE_STATE_PROVIDER allows modifying token's state
  uint32 public constant ROLE_STATE_PROVIDER = 0x00400000;

  /// @notice Token state provider is responsible for enabling the mining protocol
  /// @dev Role ROLE_STATE_LOCK_PROVIDER allows modifying token's locked bitmask
  uint32 public constant ROLE_STATE_LOCK_PROVIDER = 0x00800000;

  /// @notice Token creator is responsible for creating tokens
  /// @dev Role ROLE_TOKEN_CREATOR allows minting tokens
  uint32 public constant ROLE_TOKEN_CREATOR = 0x00040000;

  /// @notice Token destroyer is responsible for destroying tokens
  /// @dev Role ROLE_TOKEN_DESTROYER allows burning tokens
  uint32 public constant ROLE_TOKEN_DESTROYER = 0x00080000;

  /// @dev The number is used as unlimited approvals number
  uint256 public constant UNLIMITED_APPROVALS = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /// @dev Event names are self-explanatory:
  /// @dev Fired in mint()
  /// @dev Address `_by` allows to track who created a token
  event Minted(address indexed _by, address indexed _to, uint32 indexed _tokenId);

  /// @dev Fired in burn()
  /// @dev Address `_by` allows to track who destroyed a token
  //event Burnt(address indexed _from, address _by, uint32 indexed _tokenId);

  /// @dev Fired in transfer(), transferFor(), mint()
  /// @dev When minting a token, address `_from` is zero
  event TokenTransfer(address indexed _from, address indexed _to, uint32 indexed _tokenId);

  /// @dev Fired in transfer(), transferFor(), mint()
  /// @dev When minting a token, address `_from` is zero
  /// @dev ERC20 compliant event
  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  /// @dev Fired in approveToken()
  event TokenApproval(address indexed _owner, address indexed _approved, uint32 indexed _tokenId);

  /// @dev Fired in approve()
  /// @dev ERC20 compliant event
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  /// @dev Fired in levelUp()
  event LevelUp(address indexed _by, address indexed _owner, uint32 indexed _tokenId, uint8 _levelReached);

  /// @dev Fired in upgradeGrade()
  event UpgradeComplete(address indexed _by, address indexed _owner, uint32 indexed _tokenId, uint16 _gradeReached);

  /// @dev Fired in setState()
  event StateModified(address indexed _by, address indexed _owner, uint32 indexed _tokenId, uint64 _newState);

  /**
   * @dev Gets a gem by ID, representing it as two integers.
   *      The two integers are tightly packed with a gem data:
   *      First integer (high bits) contains (from higher to lower bits order):
   *          creationTime,
   *          rarity,
   *          attributesModified,
   *          attributes,
   *          lastGamePlayed,
   *          gamesPlayed,
   *          wins,
   *          losses,
   *      Second integer (low bits) contains (from higher to lower bits order):
   *          id,
   *          index,
   *          state
   *          ownershipModified,
   *          owner
   * @dev Throws if gem doesn't exist
   * @param tokenId ID of the gem to fetch
   */
  function getPacked(uint32 tokenId) public constant returns(uint256, uint256) {
    // validate gem existence
    require(exists(tokenId));

    // load the gem from storage
    Gem memory gem = gems[tokenId];

    // pack high 256 bits of the result
    uint256 high = uint256(gem.coordinates) << 192
                 | uint192(gem.color) << 184
                 | uint184(gem.levelModified) << 152
                 | uint152(gem.level) << 144
                 | uint144(gem.gradeModified) << 112
                 | uint112(gem.grade) << 96
                 | uint96(gem.stateModified) << 64
                 | uint64(gem.state);

    // pack low 256 bits of the result
    uint256 low  = uint256(gem.creationTime) << 224
                 | uint224(gem.index) << 192
                 | uint192(gem.ownershipModified) << 160
                 | uint160(gem.owner);

    // return the whole 512 bits of result
    return (high, low);
  }

  /**
   * @dev Allows setting the `lockedBitmask` parameter of the contract,
   *      which is used to determine if a particular token is locked or not
   * @dev A locked token cannot be transferred, upgraded or burnt
   * @dev The token is locked if it contains any bits
   *      from the `lockedBitmask` in its `state` set
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission.
   * @param bitmask a value to set `lockedBitmask` to
   */
  function setLockedBitmask(uint64 bitmask) public {
    // check that the call is made by a state lock provider
    require(__isSenderInRole(ROLE_STATE_LOCK_PROVIDER));

    // update the locked bitmask
    lockedBitmask = bitmask;
  }

  /**
   * @dev Gets the coordinates of a token
   * @param tokenId ID of the token to get coordinates for
   * @return a token coordinates
   */
  function getCoordinates(uint32 tokenId) public constant returns(uint64) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's color from storage and return
    return gems[tokenId].coordinates;
  }

  /**
   * @dev Gets the land plot ID of a gem
   * @param tokenId ID of the gem to get land plot ID value for
   * @return a token land plot ID
   */
  function getPlotId(uint32 tokenId) public constant returns(uint32) {
    // extract high 32 bits of the coordinates and return
    return uint32(getCoordinates(tokenId) >> 32);
  }

  /**
   * @dev Gets the depth (block ID) within land of plot of a gem
   * @param tokenId ID of the gem to get depth value for
   * @return a token depth
   */
  function getDepth(uint32 tokenId) public constant returns(uint16) {
    // extract middle 16 bits of the coordinates and return
    return uint16(getCoordinates(tokenId) >> 16);
  }

  /**
   * @dev Gets the gem's number within land block
   * @param tokenId ID of the gem to get depth value for
   * @return a gem number within a land block
   */
  function getGemNum(uint32 tokenId) public constant returns(uint16) {
    // extract low 16 bits of the coordinates and return
    return uint16(getCoordinates(tokenId));
  }

  /**
   * @dev Gets the color of a token
   * @param tokenId ID of the token to get color for
   * @return a token color
   */
  function getColor(uint32 tokenId) public constant returns(uint8) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's color from storage and return
    return gems[tokenId].color;
  }

  /**
   * @dev Gets the level modified date of a token
   * @param tokenId ID of the token to get level modification date for
   * @return a token level modification date
   */
  function getLevelModified(uint32 tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's level modified date from storage and return
    return gems[tokenId].levelModified;
  }

  /**
   * @dev Gets the level of a token
   * @param tokenId ID of the token to get level for
   * @return a token level
   */
  function getLevel(uint32 tokenId) public constant returns(uint8) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's level from storage and return
    return gems[tokenId].level;
  }

  /**
   * @dev Levels up a gem
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param tokenId ID of the gem to level up
   */
  function levelUp(uint32 tokenId) public {
    // check that the call is made by a level provider
    require(__isSenderInRole(ROLE_LEVEL_PROVIDER));

    // check that token to set state for exists
    require(exists(tokenId));

    // update the level modified date
    gems[tokenId].levelModified = uint32(block.number);

    // increment the level required
    gems[tokenId].level++;

    // emit an event
    emit LevelUp(msg.sender, ownerOf(tokenId), tokenId, gems[tokenId].level);
  }

  /**
   * @dev Gets the grade modified date of a gem
   * @param tokenId ID of the gem to get grade modified date for
   * @return a token grade modified date
   */
  function getGradeModified(uint32 tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's grade modified date from storage and return
    return gems[tokenId].gradeModified;
  }

  /**
   * @dev Gets the grade of a gem
   * @param tokenId ID of the gem to get grade for
   * @return a token grade
   */
  function getGrade(uint32 tokenId) public constant returns(uint16) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's grade from storage and return
    return gems[tokenId].grade;
  }

  /**
   * @dev Gets the grade type of a gem
   * @param tokenId ID of the gem to get grade type for
   * @return a token grade type
   */
  function getGradeType(uint32 tokenId) public constant returns(uint8) {
    // extract high 8 bits of the grade and return
    return uint8(getGrade(tokenId) >> 8);
  }

  /**
   * @dev Gets the grade value of a gem
   * @param tokenId ID of the gem to get grade value for
   * @return a token grade value
   */
  function getGradeValue(uint32 tokenId) public constant returns(uint8) {
    // extract low 8 bits of the grade and return
    return uint8(getGrade(tokenId));
  }

  /**
   * @dev Upgrades the grade of the gem
   * @dev Requires new grade to be higher than an old one
   * @dev Requires sender to have `ROLE_GRADE_PROVIDER` permission
   * @param tokenId ID of the gem to modify the grade for
   * @param grade new grade to set for the token, should be higher then current state
   */
  function upgradeGrade(uint32 tokenId, uint16 grade) public {
    // check that the call is made by a grade provider
    require(__isSenderInRole(ROLE_GRADE_PROVIDER));

    // check that token to set grade for exists
    require(exists(tokenId));

    // update the grade modified date
    gems[tokenId].gradeModified = uint32(block.number);

    // check if we're not downgrading the gem
    require(gems[tokenId].grade < grade);

    // set the grade required
    gems[tokenId].grade = grade;

    // emit an event
    emit UpgradeComplete(msg.sender, ownerOf(tokenId), tokenId, grade);
  }

  /**
   * @dev Gets the state modified date of a token
   * @param tokenId ID of the token to get state modified date for
   * @return a token state modification date
   */
  function getStateModified(uint32 tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's state modified date from storage and return
    return gems[tokenId].stateModified;
  }

  /**
   * @dev Gets the state of a token
   * @param tokenId ID of the token to get state for
   * @return a token state
   */
  function getState(uint32 tokenId) public constant returns(uint64) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's state from storage and return
    return gems[tokenId].state;
  }

  /**
   * @dev Sets the state of a token
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param tokenId ID of the token to set state for
   * @param state new state to set for the token
   */
  function setState(uint32 tokenId, uint64 state) public {
    // check that the call is made by a state provider
    require(__isSenderInRole(ROLE_STATE_PROVIDER));

    // check that token to set state for exists
    require(exists(tokenId));

    // update the state modified date
    gems[tokenId].stateModified = uint32(block.number);

    // set the state required
    gems[tokenId].state = state;

    // emit an event
    emit StateModified(msg.sender, ownerOf(tokenId), tokenId, state);
  }

  /**
   * @dev Gets the creation time of a token
   * @param tokenId ID of the token to get creation time for
   * @return a token creation time
   */
  function getCreationTime(uint32 tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's creation time from storage and return
    return gems[tokenId].creationTime;
  }

  /**
   * @dev Gets the ownership modified time of a token
   * @param tokenId ID of the token to get ownership modified time for
   * @return a token ownership modified time
   */
  function getOwnershipModified(uint32 tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(tokenId));

    // obtain token's ownership modified time from storage and return
    return gems[tokenId].ownershipModified;
  }

  /**
   * @notice Gets an amount of token owned by the given address
   * @dev Gets the balance of the specified address
   * @param who address to query the balance for
   * @return an amount owned by the address passed as an input parameter
   */
  function balanceOf(address who) public constant returns (uint32) {
    // read the length of the `who`s collection of tokens
    return uint32(collections[who].length);
  }

  /**
   * @notice Checks if specified token exists
   * @dev Returns whether the specified token ID exists
   * @param tokenId ID of the token to query the existence for
   * @return whether the token exists (true - exists)
   */
  function exists(uint32 tokenId) public constant returns (bool) {
    // check if this token exists (owner is not zero)
    return gems[tokenId].owner != address(0);
  }

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `gems` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint32 tokenId) public constant returns (address) {
    // check if this token exists
    require(exists(tokenId));

    // return owner's address
    return gems[tokenId].owner;
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
    uint8 gradeValue
  ) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // check if caller has sufficient permissions to mint a token
    // and if feature is enabled globally
    require(__isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(to, tokenId, plotId, depth, gemNum, color, level, gradeType, gradeValue);

    // fire ERC20 transfer event
    emit Transfer(address(0), to, 1);
  }

  /**
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @dev Requires the sender of the transaction to be an owner
   *      of the token specified (`tokenId`)
   * @param to new owner address
   * @param tokenId ID of the token to transfer ownership rights for
   */
  function transferToken(address to, uint32 tokenId) public {
    // check if token transfers feature is enabled
    require(__isFeatureEnabled(FEATURE_TRANSFERS));

    // call sender gracefully - `from`
    address from = msg.sender;

    // delegate call to unsafe `__transferToken`
    __transferToken(from, to, tokenId);
  }

  /**
   * @notice A.k.a "transfer a token on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @dev Transfers the ownership of a given token ID to another address
   * @dev Requires the transaction sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the token
   * @param tokenId ID of the token to be transferred
   */
  function transferTokenFrom(address from, address to, uint32 tokenId) public {
    // check if transfers on behalf feature is enabled
    require(__isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

    // call sender gracefully - `operator`
    address operator = msg.sender;

    // find if an approved address exists for this token
    address approved = approvals[tokenId];

    // we assume `from` is an owner of the token,
    // this will be explicitly checked in `__transferToken`

    // fetch how much approvals left for an operator
    uint256 approvalsLeft = allowance[from][operator];

    // operator must have an approval to transfer this particular token
    // or operator must be approved to transfer all the tokens
    // or, if nothing satisfies, this is equal to regular transfer,
    // where `from` is basically a transaction sender and owner of the token
    if(operator == approved || approvalsLeft != 0) {
      // update operator's approvals left + emit an event
      __decreaseOperatorApprovalsLeft(from, operator, 1);
    }
    else {
      // transaction sender doesn't have any special permissions
      // we will treat him as a token owner and sender and try to perform
      // a regular transfer:
      // check `from` to be `operator` (transaction sender):
      require(from == operator);

      // additionally check if token transfers feature is enabled
      require(__isFeatureEnabled(FEATURE_TRANSFERS));
    }

    // delegate call to unsafe `__transferToken`
    __transferToken(from, to, tokenId);
  }

  /**
   * @notice Approves an address to transfer the given token on behalf of its owner
   *      Can also be used to revoke an approval by setting `to` address to zero
   * @dev The zero `to` address revokes an approval for a given token
   * @dev There can only be one approved address per token at a given time
   * @dev This function can only be called by the token owner
   * @param to address to be approved to transfer the token on behalf of its owner
   * @param tokenId ID of the token to be approved for transfer on behalf
   */
  function approveToken(address to, uint32 tokenId) public {
    // call sender nicely - `from`
    address from = msg.sender;

    // get token owner address (also ensures that token exists)
    address owner = ownerOf(tokenId);

    // caller must own this token
    require(from == owner);
    // approval for owner himself is pointless, do not allow
    require(to != owner);
    // either we're removing approval, or setting it
    require(approvals[tokenId] != address(0) || to != address(0));

    // set an approval (deletes an approval if to == 0)
    approvals[tokenId] = to;

    // emit an ERC721 event
    emit TokenApproval(from, to, tokenId);
  }

  /**
   * @notice Removes an approved address, which was previously added by `approve`
   *      for the given token. Equivalent to calling approve(0, tokenId)
   * @dev Same as calling approve(0, tokenId)
   * @param tokenId ID of the token to remove approved address for
   */
  function revokeApproval(uint32 tokenId) public {
    // delegate call to `approve`
    approveToken(address(0), tokenId);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @param to operator address to set the approval for
   * @param approved representing the status of the approval to be set
   */
  function setApprovalForAll(address to, bool approved) public {
    // set maximum possible approval, 2^256 – 1, unlimited de facto
    approve(to, approved ? UNLIMITED_APPROVALS : 0);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @dev ERC20 compliant approve(address, uint256) function
   * @param to operator address to set the approval
   * @param approved representing the number of approvals left to be set
   */
  function approve(address to, uint256 approved) public {
    // call sender nicely - `from`
    address from = msg.sender;

    // validate destination address
    require(to != address(0));

    // approval for owner himself is pointless, do not allow
    require(to != from);

    // set an approval
    allowance[from][to] = approved;

    // emit an ERC20 compliant event
    emit Approval(from, to, approved);
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
    uint8 gradeValue
  ) private {
    // check that token ID is not in the reserved space
    require(tokenId > RESERVED_TOKEN_ID_SPACE);

    // ensure that token with such ID doesn't exist
    require(!exists(tokenId));

    // create new gem in memory
    Gem memory gem = Gem({
      coordinates: uint64(plotId) << 32 | uint32(depth) << 16 | gemNum,
      color: color,
      levelModified: 0,
      level: level,
      gradeModified: 0,
      grade: uint16(gradeType) << 8 | gradeValue,
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
    gems[tokenId] = gem;

    // update total supply
    totalSupply++;

    // fire Minted event
    emit Minted(msg.sender, to, tokenId);
    // fire ERC721 transfer event
    emit TokenTransfer(address(0), to, tokenId);
  }

  /// @dev Performs a transfer of a token `tokenId` from address `from` to address `to`
  /// @dev Unsafe: doesn't check if caller has enough permissions to execute the call;
  ///      checks only for token existence and that ownership belongs to `from`
  /// @dev Is save to call from `transferToken(to, tokenId)` since it doesn't need any additional checks
  /// @dev Must be kept private at all times
  function __transferToken(address from, address to, uint32 tokenId) private {
    // validate source and destination address
    require(to != address(0));
    require(to != from);
    // impossible by design of transferToken(), transferTokenFrom(),
    // approveToken() and approve()
    assert(from != address(0));

    // validate token existence
    require(exists(tokenId));

    // validate token ownership
    require(ownerOf(tokenId) == from);

    // transfer is not allowed for a locked gem
    // (ex.: if ge is currently mining)
    require(getState(tokenId) & lockedBitmask == 0);

    // clear approved address for this particular token + emit event
    __clearApprovalFor(tokenId);

    // move gem ownership,
    // update old and new owner's gem collections accordingly
    __move(from, to, tokenId);

    // persist gem back into the storage
    // this may be required only if gems structure is loaded into memory, like
    // `Gem memory gem = gems[tokenId];`
    //gems[tokenId] = gem; // uncomment if gem is in memory (will increase gas usage!)

    // fire ERC721 transfer event
    emit TokenTransfer(from, to, tokenId);

    // fire a ERC20 transfer event
    emit Transfer(from, to, 1);
  }

  /// @dev Clears approved address for a particular token
  function __clearApprovalFor(uint32 tokenId) private {
    // check if approval exists - we don't want to fire an event in vain
    if(approvals[tokenId] != address(0)) {
      // clear approval
      delete approvals[tokenId];

      // emit an ERC721 event
      emit TokenApproval(msg.sender, address(0), tokenId);
    }
  }

  /// @dev Decreases operator's approvals left
  /// @dev Unsafe, doesn't throw if there is not enough approvals left
  function __decreaseOperatorApprovalsLeft(address owner, address operator, uint256 n) private {
    // read how much approvals this operator has
    uint256 approvalsLeft = allowance[owner][operator];

    // check if approvals exist – we don't want to fire an event in vain
    if (approvalsLeft != 0) {
      // recalculate the approvals left
      approvalsLeft = approvalsLeft > n ? approvalsLeft - n : 0;

      // update approvals left
      allowance[owner][operator] = approvalsLeft;

      // emit an ERC20 compliant event
      emit Approval(owner, operator, approvalsLeft);
    }
  }

  /// @dev Move a `gem` from owner `from` to a new owner `to`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __move(address from, address to, uint32 gemId) private {
    // get the gem pointer to the storage
    Gem storage gem = gems[gemId];

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
    uint32 tokenId = source[source.length - 1];

    // update gem index to point to proper place in the collection `source`
    gems[tokenId].index = i;

    // put it into the position i within `source`
    source[i] = tokenId;

    // trim the collection `source` by removing last element
    source.length--;

    // update gem index according to position in new collection `destination`
    gem.index = uint32(destination.length);

    // update gem owner
    gem.owner = to;

    // update ownership transfer date
    gem.ownershipModified = uint32(block.number);

    // push gem into collection
    destination.push(gemId);
  }

}
