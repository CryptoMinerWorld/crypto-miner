pragma solidity 0.4.23;

/**
 * @notice Gem is unique tradable entity. Non-fungible.
 * @dev A gem is an ERC721 non-fungible token, which maps Token ID,
 *      a 32 bit number to a set of gem properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 * @dev A gem token supports both minting and burning, can be created and destroyed
 */
contract GemERC721 {
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
  string public constant name = "GEM – Crypto Miner World";
  /// @dev ERC20 compliant token decimals
  /// @dev this can be only zero, since ERC721 token is non-fungible
  uint8 public constant decimals = 0;

  /// @dev A gem data structure
  /// @dev Occupies 64 bytes of storage (512 bits)
  struct Gem {
    // TODO: document all the fields
    /// High 256 bits
    /// @dev Gem creation time, immutable, cannot be zero
    /// @dev Stored as Ethereum Block Number of the transaction
    ///      when the gem was created
    uint32 creationTime;

    /// @dev Land plot ID where gem was found, immutable
    uint32 plotId;

    /// @dev Land block within a plot, immutable
    uint16 depth; // Land Block

    /// @dev Gem number (id) within a block of land, immutable
    uint16 gemNum;

    /// @dev Gem color, one of 12 values, immutable
    uint16 color;

    /// @dev Low 16 bits store level value (mutable),
    ///      level is one of 1, 2, 3, 4, 5
    /// @dev High 32 bits store level modified time
    uint48 level;

    /// @dev Low 16 bits store the grade (mutable):
    ///      8 bits grade type and 8 bits grade value
    /// @dev Grade type is one of D (1), C (2), B (3), A (4), AA (5) and AAA (6)
    /// @dev High 32 bits store grade modified time
    uint48 grade;

    /// @dev Low 16 bits store state value, mutable
    /// @dev High 32 bits store state modified time
    uint48 state;


    /// Low 256 bits
    /// @dev Gem ID, immutable, cannot be zero
    uint32 id;

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

  /// @notice Defines a privileged addresses with additional
  ///      permissions on the smart contract, like minting/burning tokens,
  ///      transferring on behalf and so on
  /// @dev Maps an address to the permissions bitmask (role), where each bit
  ///      represents a permissions; bitmask 0xFFFFFFFF represents all possible permissions
  mapping(address => uint32) public userRoles;

  /// @notice Total number of existing tokens
  /// @dev ERC20 compliant field for totalSupply()
  uint32 public totalSupply;

  /// @dev The data in token's state may contain lock(s)
  ///      (ex.: is gem currently mining or not)
  /// @dev A locked token cannot be transferred or upgraded
  /// @dev The token is locked if it contains any bits
  ///      from the `lockedBitmask` in its `state` set
  uint16 public lockedBitmask = DEFAULT_MINING_BIT;

  /// @dev A bitmask of globally enabled features, see below
  uint32 public f;

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
  uint16 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1
  
  /// @notice Exchange is responsible for trading tokens on behalf of token holders
  /// @dev Role ROLE_EXCHANGE allows executing transfer on behalf of token holders
  /// @dev Not used
  //uint32 public constant ROLE_EXCHANGE = 0x00010000;

  /// @notice Token state provider is responsible for enabling the mining protocol
  /// @dev Role ROLE_STATE_PROVIDER allows modifying token's state,
  uint32 public constant ROLE_STATE_PROVIDER = 0x00020000;

  /// @notice Token creator is responsible for creating tokens
  /// @dev Role ROLE_TOKEN_CREATOR allows minting tokens
  uint32 public constant ROLE_TOKEN_CREATOR = 0x00040000;

  /// @notice Token destroyer is responsible for destroying tokens
  /// @dev Role ROLE_TOKEN_DESTROYER allows burning tokens
  uint32 public constant ROLE_TOKEN_DESTROYER = 0x00080000;

  /// @notice Role manager is responsible for assigning the roles
  /// @dev Role ROLE_ROLE_MANAGER allows executing addOperator/removeOperator
  uint32 public constant ROLE_ROLE_MANAGER = 0x00100000;

  /// @notice Feature manager is responsible for enabling/disabling
  ///      global features of the smart contract
  /// @dev Role ROLE_FEATURE_MANAGER allows enabling/disabling global features
  uint32 public constant ROLE_FEATURE_MANAGER = 0x00200000;

  /// @dev Bitmask represents all the possible permissions (super admin role)
  uint32 public constant FULL_PRIVILEGES_MASK = 0xFFFFFFFF;

  /// @dev The number is used as unlimited approvals number
  uint256 public constant UNLIMITED_APPROVALS = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /// @dev Event names are self-explanatory:
  /// @dev Fired in mint()
  /// @dev Address `_by` allows to track who created a token
  event Minted(address indexed _by, address indexed _to, uint32 indexed _tokenId);
  /// @dev Fired in burn()
  /// @dev Address `_by` allows to track who destroyed a token
  event Burnt(address indexed _from, address _by, uint32 indexed _tokenId);
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
  /// @dev Fired in miningComplete()
  event MiningComplete(uint32 indexed _tokenId, uint16 state);

  /**
   * @dev Creates a gem as a ERC721 token
   */
  constructor() public {
    // call sender gracefully - contract `creator`
    address creator = msg.sender;

    // creator has full privileges
    userRoles[creator] = FULL_PRIVILEGES_MASK;
  }

  /**
   * @dev Updates set of the globally enabled features (`f`),
   *      taking into account sender's permissions.
   * @dev Requires sender to have `ROLE_FEATURE_MANAGER` permission.
   * @param mask bitmask representing a set of features to enable/disable
   */
  function updateFeatures(uint32 mask) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = userRoles[caller];

    // caller should have a permission to update global features
    require(__hasRole(p, ROLE_FEATURE_MANAGER));

    // taking into account caller's permissions,
    // 1) enable features requested
    f |= p & mask;
    // 2) disable features requested
    f &= FULL_PRIVILEGES_MASK ^ (p & (FULL_PRIVILEGES_MASK ^ mask));
  }

  /**
   * @dev Adds a new `operator` - an address which has
   *      some extended privileges over the token smart contract,
   *      for example token minting, burning, transferring on behalf, etc.
   * @dev Newly added `operator` cannot have any permissions which
   *      transaction sender doesn't have.
   * @dev Requires transaction sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Cannot update existing operator. Throws if `operator` already exists.
   * @param operator address of the operator to add
   * @param role bitmask representing a set of permissions which
   *      newly created operator will have
   */
  function addOperator(address operator, uint32 role) public {
    // call sender gracefully - `manager`
    address manager = msg.sender;

    // read manager's permissions (role)
    uint32 p = userRoles[manager];

    // check that `operator` doesn't exist
    require(userRoles[operator] == 0);

    // manager must have a ROLE_ROLE_MANAGER role
    require(__hasRole(p, ROLE_ROLE_MANAGER));

    // recalculate permissions (role) to set:
    // we cannot create an operator more powerful then calling `manager`
    uint32 r = role & p;

    // check if we still have some permissions (role) to set
    require(r != 0);

    // create an operator by persisting his permissions (roles) to storage
    userRoles[operator] = r;
  }

  /**
   * @dev Deletes an existing `operator`.
   * @dev Requires sender to have `ROLE_ROLE_MANAGER` permission.
   * @param operator address of the operator to delete
   */
  function removeOperator(address operator) public {
    // check if an `operator` exists
    require(userRoles[operator] != 0);

    // do not allow transaction sender to remove himself
    // protects from an accidental removal of all the operators
    require(operator != msg.sender);

    // check if caller has ROLE_ROLE_MANAGER
    require(__isSenderInRole(ROLE_ROLE_MANAGER));

    // perform operator deletion
    delete userRoles[operator];
  }

  /**
   * @dev Updates an existing `operator`, adding a specified role to it.
   * @dev Note that `operator` cannot receive permission which
   *      transaction sender doesn't have.
   * @dev Requires transaction sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Cannot create a new operator. Throws if `operator` doesn't exist.
   * @dev Existing permissions of the `operator` are preserved
   * @param operator address of the operator to update
   * @param role bitmask representing a set of permissions which
   *      `operator` will have
   */
  function addRole(address operator, uint32 role) public {
    // call sender gracefully - `manager`
    address manager = msg.sender;

    // read manager's permissions (role)
    uint32 p = userRoles[manager];

    // check that `operator` exists
    require(userRoles[operator] != 0);

    // manager must have a ROLE_ROLE_MANAGER role
    require(__hasRole(p, ROLE_ROLE_MANAGER));

    // recalculate permissions (role) to add:
    // we cannot make an operator more powerful then calling `manager`
    uint32 r = role & p;

    // check if we still have some permissions (role) to add
    require(r != 0);

    // update operator's permissions (roles) in the storage
    userRoles[operator] |= r;
  }

  /**
   * @dev Updates an existing `operator`, removing a specified role from it.
   * @dev Note that  permissions which transaction sender doesn't have
   *      cannot be removed.
   * @dev Requires transaction sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Cannot remove all permissions. Throws on such an attempt.
   * @param operator address of the operator to update
   * @param role bitmask representing a set of permissions which
   *      will be removed from the `operator`
   */
  function removeRole(address operator, uint32 role) public {
    // call sender gracefully - `manager`
    address manager = msg.sender;

    // read manager's permissions (role)
    uint32 p = userRoles[manager];

    // check that we're not removing all the `operator`s permissions
    require(userRoles[operator] ^ role != 0);

    // manager must have a ROLE_ROLE_MANAGER role
    require(__hasRole(p, ROLE_ROLE_MANAGER));

    // recalculate permissions (role) to remove:
    // we cannot revoke permissions which calling `manager` doesn't have
    uint32 r = role & p;

    // check if we still have some permissions (role) to revoke
    require(r != 0);

    // update operator's permissions (roles) in the storage
    userRoles[operator] &= FULL_PRIVILEGES_MASK ^ r;
  }

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
  function getGem(uint32 tokenId) public constant returns(uint256, uint256) {
    // load the gem from storage
    Gem memory gem = gems[tokenId];

    // get the gem's owner address
    address owner = gem.owner;

    // validate gem existence
    require(owner != address(0));

    // pack high 256 bits of the result
    uint256 hi = uint256(gem.creationTime) << 224
               | uint224(gem.plotId) << 192
               | uint192(gem.depth) << 176
               | uint176(gem.gemNum) << 160
               | uint160(gem.color) << 144
               | uint144(gem.level) << 96
               | uint96(gem.grade) << 48
               | uint48(gem.state);

    // pack low 256 bits of the result
    uint256 lo = uint256(gem.id) << 224
               | uint224(gem.index) << 192
               | uint192(gem.ownershipModified) << 160
               | uint160(gem.owner);

    // return the whole 512 bits of result
    return (hi, lo);
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
  function setLockedBitmask(uint16 bitmask) public {
    // check that the call is made by a combat provider
    require(__isSenderInRole(ROLE_STATE_PROVIDER));

    // update the locked bitmask
    lockedBitmask = bitmask;
  }

  /**
   * @dev Gets the state of a token
   * @param tokenId ID of the token to get state for
   * @return a token state
   */
  // TODO: do we need to return whole 48 bits with date?
  function getState(uint32 tokenId) public constant returns(uint16) {
    // get the token from storage
    Gem memory gem = gems[tokenId];

    // validate token existence
    require(gem.owner != address(0));

    // obtain token's state and return
    return uint16(gem.state);
  }

  /**
   * @dev Sets the state of a token
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param tokenId ID of the token to set state for
   * @param state new state to set for the token
   */
  // TODO: do we need to return old state value?
  function setState(uint32 tokenId, uint16 state) public {
    // check that the call is made by a state provider
    require(__isSenderInRole(ROLE_STATE_PROVIDER));

    // get the token pointer
    Gem storage gem = gems[tokenId];

    // check that token to set state for exists
    require(gem.owner != address(0));

    // set the state required
    gem.state = uint48(block.number << 16) | state;

    // persist token back into the storage
    // this may be required only if tokens structure is loaded into memory, like
    // `Gem memory gem = gems[tokenId];`
    //gems[tokenId] = gem; // uncomment if token is in memory (will increase gas usage!)
  }

  /**
   * @dev A mechanism to pick the token out of the plot of land
   * @param tokenId token's ID engaged in mining
   */
  function miningComplete(uint32 tokenId) public {
    // check that the call is made by a state provider
    require(__isSenderInRole(ROLE_STATE_PROVIDER));

    // get the token pointer
    Gem storage gem = gems[tokenId];

    // check that token to set mining complete for exists
    require(gem.owner != address(0));

    // TODO: do we need to check if gem is really mining?

    // clear the default mining bit
    gem.state = uint48(block.number << 16) | (gem.state & (0xFFFF ^ DEFAULT_MINING_BIT));

    // persist token back into the storage
    // this may be required only if token structure is loaded into memory, like
    // `Gem memory gem = gems[tokenId];`
    //gems[tokenId] = gem; // uncomment if token is in memory (will increase gas usage!)

    // fire an event
    emit MiningComplete(tokenId, uint16(gem.state));
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
    // get the token's owner address from storage
    address owner = gems[tokenId].owner;

    // check if this token exists (owner is not zero)
    return owner != address(0);
  }

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `gems` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint32 tokenId) public constant returns (address) {
    // get the token's owner address from storage
    address owner = gems[tokenId].owner;

    // check if this token exists (owner is not zero)
    require(owner != address(0));

    // return owner's address
    return owner;
  }

  /**
   * @dev Creates new token with `tokenId` ID specified and
   *      assigns an ownership `to` for that token
   * @dev Allows setting initial token's properties
   * @param to an address to assign created token ownership to
   * @param tokenId ID of the token to create
   */
  function mintWith(
    address to,
    uint32 tokenId,
    uint32 plotId,
    uint16 depth,
    uint16 gemNum,
    uint16 color,
    uint16 level,
    uint16 grade
  ) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // check if caller has sufficient permissions to mint a token
    require(__isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(to, tokenId, plotId, depth, gemNum, color, level, grade);

    // fire ERC20 transfer event
    emit Transfer(address(0), to, 1);
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
    uint16 color,
    uint16 level,
    uint16 grade
  ) private {
    // check that token ID is not in the reserved space
    require(tokenId > RESERVED_TOKEN_ID_SPACE);

    // ensure that token with such ID doesn't exist
    require(!exists(tokenId));

    // create new gem in memory
    Gem memory gem = Gem({
      creationTime: uint32(block.number),
      plotId: plotId,
      depth: depth,
      gemNum: gemNum,
      color: color,
      level: level,
      grade: grade,
      state: 0,

      id: tokenId,
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

  /**
   * @notice Transfers ownership rights of a token defined
   *      by the `tokenId` to a new owner specified by address `to`
   * @dev Requires the sender of the transaction to be an owner
   *      of the token specified (`tokenId`)
   * @param to new owner address
   * @param tokenId ID of the token to transfer ownership rights for
   */
  function transferToken(address to, uint32 tokenId) public {
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
    emit TokenApproval(msg.sender, to, tokenId);
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

  /// @dev Checks if requested feature is enabled globally on the contract
  function __isFeatureEnabled(uint32 featureRequired) private constant returns(bool) {
    // delegate call to `__hasRole`
    return __hasRole(f, featureRequired);
  }

  /// @dev Checks if transaction sender `msg.sender` has all the required permissions `roleRequired`
  function __isSenderInRole(uint32 roleRequired) private constant returns(bool) {
    // call sender gracefully - `user`
    address user = msg.sender;

    // read user's permissions (role)
    uint32 userRole = userRoles[user];

    // delegate call to `__hasRole`
    return __hasRole(userRole, roleRequired);
  }

  /// @dev Checks if user role `userRole` contain all the permissions required `roleRequired`
  function __hasRole(uint32 userRole, uint32 roleRequired) private pure returns(bool) {
    // check the bitmask for the role required and return the result
    return userRole & roleRequired == roleRequired;
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

    // get the gem pointer to the storage
    Gem storage gem = gems[tokenId];

    // get token's owner address
    address owner = gem.owner;

    // validate token existence
    require(owner != address(0));
    // validate token ownership
    require(owner == from);

    // transfer is not allowed for a locked gem
    // (ex.: if ge is currently mining)
    require(gem.state & lockedBitmask == 0);

    // clear approved address for this particular token + emit event
    __clearApprovalFor(tokenId);

    // move gem ownership,
    // update old and new owner's gem collections accordingly
    __moveGem(from, to, gem);

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
  function __moveGem(address from, address to, Gem storage gem) private {
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
    destination.push(gem.id);
  }

}
