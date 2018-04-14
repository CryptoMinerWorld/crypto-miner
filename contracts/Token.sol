pragma solidity 0.4.18;

/**
 * @notice This smart contract represents a tradable non-fungible entity.
 * @dev Follows ERC721 standard, but since it is still in draft at the moment
 * of writing, there are some modifications for convenience of use
 * particular to the Crypto Miner World needs.
 */
contract Token {
  /**
   * @dev operators perform actions on the token
   *  with the restricted access, like enabling/disabling
   *  transfers, minting, burning, etc
   */
  mapping(address => uint32) public operators;

  /**
   * @dev Core of the Gem as ERC721 token is mapping
   *  gem id => state + owner
   *  which maps a Gem ID (ERC721 tokenId) to a
   *  uint256 packed struct containing current gem state
   *  and owner address
   */
  mapping(uint80 => uint256) public tokens;

  /// @dev Mapping from token ID to approved address
  mapping(uint80 => address) private approvals;

  /// @dev Mapping from owner to operator approvals
  /// token owner => approved token operator => approvals left (zero means no approval)
  mapping(address => mapping(address => uint256)) private tokenOperators;

  /// @notice Total number of tokens owned by each account
  mapping(address => uint256) private balances;

  /// @notice Total number of tokens which exist in the system
  uint256 public totalSupply;

  /// @dev A bitmask of globally enabled features, see below
  uint32 public f;

  /**
   * @dev Globally enabled features, permissions:
   *
   */
  uint32 public constant PERM_TRANSFER      = 0x00000001;
  uint32 public constant PERM_APPROVE       = 0x00000002;
  uint32 public constant PERM_APPROVE_ALL   = 0x00000004;
  uint32 public constant PERM_TRANSFER_FROM = 0x00000008;

  uint32 public constant PERM_MINT          = 0x00000010;
  uint32 public constant PERM_BURN          = 0x00000020;

  uint32 public constant PERM_UPDATE_LOCK   = 0x00000040;
  uint32 public constant PERM_UPDATE_ENERGY = 0x00000080;
  uint32 public constant PERM_UPDATE_STATE  = 0x00000100;

  uint32 public constant PERM_OP_CREATE     = 0x01000000;
  uint32 public constant PERM_OP_UPDATE     = 0x02000000;
  uint32 public constant PERM_OP_DELETE     = 0x04000000;
  uint32 public constant PERM_UPDATE_GLOBAL = 0x08000000;

  uint32 public constant PERM_FULL          = 0xFFFFFFFF;

                                              //  F8F0E8E0D8D0C8C0B8B0A8A09890888078706860585048403830282018100800
  uint256 public constant MASK_CLEAR_STATE    = 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 public constant MASK_CLEAR_MINING   = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 public constant MASK_CLEAR_TRANSFER = 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000;
  uint256 public constant MASK_RIGHT_31BITS   = 0x000000000000000000000000000000000000000000000000000000007FFFFFFF;
  uint256 public constant MAXIMUM_APPROVALS   = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in mint()
  event Minted(uint80 indexed tokenId, address indexed to);
  /// @dev fired in burn()
  event Burnt(uint80 indexed tokenId, address indexed from);
  /// @dev fired in transfer()
  event Transfer(address indexed from, address indexed to, uint80 indexed tokenId);
  /// @dev fired in approve()
  event Approval(address indexed owner, address indexed approved, uint80 indexed tokenId);
  /// @dev fired in approveForAll()
  event ApprovalForAll(address indexed owner, address indexed operator, uint256 indexed approved);

  /// @dev Creates a token
  function Token() public {
    // call sender nicely - creator
    address creator = msg.sender;

    // grant the contract creator full permissions
    operators[creator] = PERM_FULL;
  }

  /**
   * @notice finds an owner address for a token specified
   * @dev Gets the owner of the specified token ID
   * @param tokenId uint256 ID of the token to query the owner of
   * @return owner address currently marked as the owner of the given token ID
   */
  function ownerOf(uint80 tokenId) public constant returns (address) {
    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // extract token's address and return
    return address(token);
  }

  /**
   * @notice Gets an amount of tokens owned by the give address
   * @dev Gets the balance of the specified address
   * @param who address to query the balance for
   * @return uint256 representing the amount owned by the passed address
   */
  function balanceOf(address who) public constant returns (uint256) {
    // simply read the balance from balances
    return balances[who];
  }

  /**
   * @notice Checks if specified token exists
   * @dev Returns whether the specified token ID exists
   * @param tokenId uint256 ID of the token to query the existence of
   * @return whether the token exists
   */
  function exists(uint80 tokenId) public constant returns (bool) {
    // get the token from storage
    uint256 token = tokens[tokenId];
    // check if this token exists
    return token > 0;
  }

  /**
   * @dev extracts 96 bit integer token state,
   * 64 lower bits of which are managed and updated by the token itself,
   * while higher 32 bits may be used by external operators
   */
  function getState(uint80 tokenId) public constant returns (uint96) {
    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // extract 96 bits of state and return
    return uint96(token >> 160);
  }

  /**
   * @dev extracts 32 bit integer block ID of the last token transfer
   */
  function getLastTransferredBlock(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getState(tokenId);

    // extract 32 bits of last transfer block ID and return
    return uint32(state);
  }

  /**
   * @dev extracts 32 bit integer block ID of the token creation
   */
  function getTokenCreationBlock(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getState(tokenId);

    // extract 32 bits of token creation block ID and return
    return uint32(state >> 32);
  }

  /**
   * @dev extracts 32 bit integer Gem mining state,
   * which may be used by external operators
   */
  function getMiningState(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getState(tokenId);

    // extract 32 bits of the mining state and return
    return uint32(state >> 64);
  }

  /**
   * @dev extracts 31 bit integer block ID when token lock has changed
   */
  function getLastLockingBlock(uint80 tokenId) public constant returns (uint32) {
    // get mining state
    uint32 lockingBlock = getMiningState(tokenId);

    // overwrite first bit with zero (it contains lock) and return
    return uint32(lockingBlock & 0x7FFFFFFF);
  }

  /**
   * @dev checks if the token is in locked state (mining);
   * locked gem cannot be transferred (change ownership) or
   * destroyed (burnt)
   * @param tokenId ID of the token to check locked status for
   * @return whether the token is locked
   */
  function isLocked(uint80 tokenId) public constant returns (bool) {
    // get token state
    uint96 state = getState(tokenId);

    // extract the locked bit, check and return
    return state >> 95 > 0;
  }

  /**
   * @dev Allows external operator to update Gem's state
   * @param tokenId ID of the token to update state for
   * @param state a state to set
   */
  function updateState(uint80 tokenId, uint96 state) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to update state
    require(f & p & PERM_UPDATE_STATE == PERM_UPDATE_STATE);

    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // update token state  // 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    tokens[tokenId] = token & MASK_CLEAR_STATE | uint256(state) << 160;
  }

  /**
   * @dev Allows external operator to update Gem's mining state
   * @param tokenId ID of the token to update state for
   * @param state mining state to set
   */
  function updateMiningState(uint80 tokenId, uint32 state) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to update mining state
    require(f & p & PERM_UPDATE_ENERGY == PERM_UPDATE_ENERGY);

    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // update token state  // 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    tokens[tokenId] = token & MASK_CLEAR_MINING | uint256(state) << 224;
  }

  /**
   * @dev Allows external operator to lock/unlock the Gem.
   * @dev Requires sender to have `PERM_UPDATE_LOCK` permission.
   * @dev Requires `PERM_UPDATE_LOCK` global feature to be enabled.
   * @param tokenId ID of the token to lock/unlock
   * @param lock an operation to perform, true - lock, false - unlock
   */
  function setLocked(uint80 tokenId, bool lock) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to update mining state
    require(f & p & PERM_UPDATE_LOCK == PERM_UPDATE_LOCK);

    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // update token state  // 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    tokens[tokenId] = token & MASK_CLEAR_MINING | __blockNum() << 224 | uint256(lock ? 1 : 0) << 255;
  }

  /**
   * @dev Updates set of the globally enabled features (`f`),
   * taking into account sender's permissions.
   * @dev Requires sender to have `PERM_UPDATE_GLOBAL` permission.
   * @param mask bitmask representing a set of features to enable/disable
   */
  function updateFeatures(uint32 mask) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // caller should have a permission to update global features
    require(p & PERM_UPDATE_GLOBAL == PERM_UPDATE_GLOBAL);

    // taking into account caller's permissions,
    // 1) enable features requested
    f |= p & mask;
    // 2) disable features requested
    f &= PERM_FULL ^ (p & (PERM_FULL ^ mask));
  }

  /**
   * @dev Creates the global `operator` - an address which has
   * some extended privileges over the token smart contract, for example
   * token minting, burning, transferring on behalf, etc.
   * @dev Note that a newly added operator cannot have any permissions
   * which caller doesn't have.
   * @dev Requires sender to have `PERM_OP_CREATE` permission.
   * @dev Requires `PERM_OP_CREATE` global feature to be enabled.
   * @dev Cannot update existing operator. Throws if `operator` already exists.
   * @param operator address of the operator to add
   * @param permissions bitmask representing a set of permissions which
   * newly created operator will have
   */
  function createOperator(address operator, uint32 permissions) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to add new operator
    require(f & p & PERM_OP_CREATE == PERM_OP_CREATE);
    // caller cannot grant a permission which he doesn't have himself
    require(p | permissions == p);
    // create is not allowed to overwrite existing operator
    require(operators[operator] == 0);

    // add an operator with the permissions specified
    operators[operator] = permissions;
  }

  /**
   * @dev Updates an existing global operator.
   * Creates a new one if it doesn't exist.
   * @dev Note that updatable (`operator`) cannot receive permission which
   * updater (sender) doesn't have.
   * @dev Requires sender to have `PERM_OP_UPDATE` permission.
   * @dev Requires `PERM_OP_UPDATE` global feature to be enabled.
   * @dev Can create a new operator. Doesn't throw if `operator` doesn't exist.
   * @param operator address of the operator to update
   * @param permissions bitmask representing a set of permissions which
   * `operator` will have
   */
  function updateOperator(address operator, uint32 permissions) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to update operator
    require(f & p & PERM_OP_UPDATE == PERM_OP_UPDATE);
    // caller cannot grant a permission which he doesn't have himself
    require(p | permissions == p);

    // update may extend existing operator's permissions
    uint32 e = operators[operator];
    // update an operator with the permissions specified
    operators[operator] = e | permissions;
  }

  /**
   * @dev Deletes an existing global operator.
   * @dev Requires sender to have `PERM_OP_DELETE` permission.
   * @dev Requires `PERM_OP_DELETE` global feature to be enabled.
   * @param operator address of the operator to delete
   */
  function deleteOperator(address operator) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to remove operator
    require(f & p & PERM_OP_DELETE == PERM_OP_DELETE);

    // remove an operator
    delete operators[operator];
  }

  /**
   * @dev Creates new token with `tokenId` ID specified and assigns
   * address `to` an ownership of that token.
   * @dev Requires sender to have `PERM_MINT` permission.
   * @dev Requires `PERM_MINT` global feature to be enabled.
   * @param tokenId ID of the token to create
   * @param to owner address of the newly created token
   */
  function mint(uint80 tokenId, address to) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to mint a token
    require(f & p & PERM_MINT == PERM_MINT);
    // the token specified should not already exist
    require(tokens[tokenId] == 0);

    // update token owner balance
    balances[to]++;
    // update total tokens number
    totalSupply++;

    // init token value with current date and new owner address
    uint256 token = __blockNum() << 192 | uint160(to);
    // persist newly created token
    tokens[tokenId] = token;

    // fire an event
    Minted(tokenId, to);
  }

  /**
   * @dev Destroys a token with `tokenId` ID specified.
   * @dev Requires sender to have `PERM_BURN` permission.
   * @dev Requires `PERM_BURN` global feature to be enabled.
   * @dev Requires the gem not to be locked.
   * @param tokenId ID of the token to destroy
   */
  function burn(uint80 tokenId) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = operators[caller];

    // feature must be enabled globally and
    // caller should have a permission to burn a token
    require(f & p & PERM_BURN == PERM_BURN);

    // token state should not be locked (gem should not be mining)
    require(!isLocked(tokenId));

    // get the token from storage
    uint256 token = tokens[tokenId];

    // extract token owner address
    address from = address(token);

    // update token owner balance
    balances[from]--;
    // update total tokens number
    totalSupply--;

    // delete approval if any
    __approve(from, address(0), tokenId);

    // delete token
    delete tokens[tokenId];

    // fire an event
    Burnt(tokenId, from);
  }

  /**
   * @notice Transfers a token specified to the address specified.
   * If transferring to a smart contract be VERY CAREFUL to ensure
   * that it is aware of ERC-721 or your Token may be lost forever.
   * @dev Transfers the ownership of a given token ID to another address.
   * @dev Requires transaction sender to be the owner of a token.
   * @dev Requires `PERM_TRANSFER` global feature to be enabled.
   * @dev Requires the gem not to be locked.
   * @param to address to receive the ownership of the given token ID
   * @param tokenId ID of the token to be transferred
   */
  function transfer(address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(f & PERM_TRANSFER == PERM_TRANSFER);

    // call sender nicely - caller
    address caller = msg.sender;

    // validate destination address
    require(to != address(0));
    require(to != caller);

    // caller must be an owner of the token
    require(caller == ownerOf(tokenId));

    // token state should not be locked (gem should not be mining)
    require(!isLocked(tokenId));

    // update balances
    balances[caller]--;
    balances[to]++;

    // update token transfer date and owner + emit event
    __transfer(caller, to, tokenId);
  }

  /**
  * @dev Approves another address to transfer the given token ID.
  * @dev The zero address indicates there is no approved address.
  * @dev There can only be one approved address per token at a given time.
  * @dev Can only be called by the token owner or an approved operator.
  * @param to address to be approved for the given token ID
  * @param tokenId ID of the token to be approved
  */
  function approve(address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(f & PERM_APPROVE == PERM_APPROVE);

    // call sender nicely - caller
    address caller = msg.sender;
    // get token owner address
    address owner = ownerOf(tokenId);

    // caller must own this token
    require(caller == owner);
    // approval for owner himself is pointless, do not allow
    require(to != owner);
    // either we're removing approval, or setting it
    require(approvals[tokenId] != 0 || to != address(0));

    // perform an approval + emit event
    __approve(caller, to, tokenId);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @param to operator address to set the approval
   * @param approved representing the status of the approval to be set
   */
  function approveForAll(address to, bool approved) public {
    // set maximum possible approval, 2^256 – 1, unlimited de facto
    approveForAll(to, approved ? MAXIMUM_APPROVALS : 0);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @param to operator address to set the approval
   * @param approved representing the number of the approval left to be set
   */
  function approveForAll(address to, uint256 approved) public {
    // feature must be enabled globally
    require(f & PERM_APPROVE_ALL == PERM_APPROVE_ALL);

    // call sender nicely - caller
    address caller = msg.sender;

    // check for input mistakes
    require(to != caller);

    // update an approval + emit an event
    __approveAll(caller, to, approved);
  }

  /**
  * @dev Transfers the ownership of a given token ID to another address
  * @dev Requires the msg sender to be the owner, approved, or operator
  * @param from current owner of the token
  * @param to address to receive the ownership of the given token ID
  * @param tokenId ID of the token to be transferred
  */
  function transferFrom(address from, address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(f & PERM_TRANSFER_FROM == PERM_TRANSFER_FROM);

    // call sender nicely - caller
    address caller = msg.sender;

    // find the owner of a token
    address owner = ownerOf(tokenId);

    // validate source and destination addresses
    require(from == owner);
    require(to != address(0));
    require(to != from);

    // token state should not be locked (gem should not be mining)
    require(!isLocked(tokenId));

    // fetch how much approvals left for a caller
    uint256 approved = tokenOperators[owner][caller];

    // caller must have an approval to transfer this particular token
    // or caller must be approved to transfer all the tokens
    require(caller == approvals[tokenId] || approved > 0);

    if(caller == approvals[tokenId]) {
      // clear approval + emit event
      __approve(from, address(0), tokenId);
    }
    else if (approved > 0) {
      // update an approval + emit an event
      __approveAll(from, to, approved - 1);
    }

    // update balances
    balances[from]--;
    balances[to]++;

    // update token transfer date and owner + emit event
    __transfer(from, to, tokenId);
  }


  // perform an approval, unsafe, private use only
  function __approve(address from, address to, uint80 tokenId) private {
    // set an approval
    approvals[tokenId] = to;

    // emit en event
    Approval(from, to, tokenId);
  }

  // perform an token operator approval, unsafe, private use only
  function __approveAll(address from, address to, uint256 approved) private {
    // set an approval
    tokenOperators[from][to] = approved;

    // emit an event
    ApprovalForAll(from, to, approved);
  }

  // perform the transfer, unsafe, private use only
  function __transfer(address from, address to, uint80 tokenId) private {
    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // update token transfer date and owner // 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000
    tokens[tokenId] = token & MASK_CLEAR_TRANSFER | __blockNum() << 160 | uint160(to);

    // emit en event
    Transfer(from, to, tokenId);
  }

  // returns block.number, guaranteed to fit into 31 bit integer
  function __blockNum() private constant returns (uint256) {
    // erase everything except right 31 bits
    return uint256(0x7FFFFFFF & block.number);
  }
}
