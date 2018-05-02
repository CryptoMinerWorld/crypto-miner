pragma solidity 0.4.23;

/**
 * @notice This smart contract represents a tradable non-fungible entity.
 * @dev Follows ERC721 standard, but since it is still in draft at the moment
 *      of writing, there are some modifications for convenience of use
 *      particular to the Crypto Miner World needs.
 */
contract Token {
  /// @dev Core of the Gem as ERC721 token is mapping
  ///      token id => state + owner
  ///      which maps a Token ID (ERC721 tokenId) to a
  ///      uint256 packed struct containing current token state
  ///      and owner address
  mapping(uint80 => uint256) public tokens;

  /// @dev Mapping from token ID to approved address
  mapping(uint80 => address) public approvals;

  /// @dev Mapping from owner to operator approvals
  /// token owner => approved token operator => approvals left (zero means no approval)
  mapping(address => mapping(address => uint256)) public operators;

  /// @notice Defines a privileged addresses with additional
  ///      permissions on the smart contract, like minting/burning,
  ///      enabling/disabling transfers, transferring on behalf and so on
  /// @dev Maps an address to the permissions bitmask (role), where each bit
  ///      represents a permissions; bitmask 0xFFFFFFFF represents all possible permissions
  mapping(address => uint32) public userRoles;

  /// @notice Storage for a collections of tokens
  /// @notice A collection of tokens is an ordered list of tokens,
  ///      owned by a particular address (owner)
  /// @dev A mapping from owner to a collection of his tokens (IDs)
  /// @dev ERC20 compatible structure for balances can be derived
  ///      as a length of each collection in the mapping
  /// @dev ERC20 balances[owner] is equal to collections[owner].length
  mapping(address => uint80[]) public collections;

  /// @dev token index withing a particular collection
  mapping(uint80 => uint80) public indexes;

  /// @notice Total number of tokens which exist in the system
  uint80 public totalSupply;

  /// @dev The data in token's state may contain lock(s),
  ///      meaning the token is not currently transferable
  /// @dev A locked token cannot be transferred
  /// @dev The token is locked if it contains any bits
  ///      from the `lockedBitmask` in its `state` set
  uint32 public lockedBitmask;

  /// @dev A bitmask of globally enabled features, see below
  uint32 public f;

  /**
   * @dev Globally enabled features, permissions:
   *
   */
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  uint32 public constant ROLE_TOKEN_CREATOR = 0x00010000;
  uint32 public constant ROLE_STATE_PROVIDER = 0x00020000;
  uint32 public constant ROLE_ROLE_MANAGER = 0x00040000;
  uint32 public constant ROLE_FEATURE_MANAGER = 0x00080000;

  uint32 public constant FULL_PRIVILEGES_MASK = 0xFFFFFFFF;

                                              //  F8F0E8E0D8D0C8C0B8B0A8A09890888078706860585048403830282018100800
  uint256 public constant MASK_CLEAR_STATE    = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
  uint256 public constant MASK_CLEAR_TRANSFER = 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000;
  uint256 public constant MASK_RIGHT_31BITS   = 0x000000000000000000000000000000000000000000000000000000007FFFFFFF;
  uint256 public constant UNLIMITED_APPROVALS = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /**
   * @dev event names are self-explanatory
   */
  /// @dev fired in mint()
  event Minted(uint80 indexed tokenId, address indexed to, address by);
  /// @dev fired in burn()
  event Burnt(uint80 indexed tokenId, address indexed from, address by);
  /// @dev fired in transfer()
  event Transfer(address indexed from, address indexed to, uint80 tokenId);
  /// @dev fired in approve()
  event Approval(address indexed owner, address indexed approved, uint80 tokenId);
  /// @dev fired in approveForAll()
  event ApprovalForAll(address indexed owner, address indexed operator, uint256 approved);

  /// @dev Creates a token
  constructor() public {
    // call sender nicely - creator
    address creator = msg.sender;

    // grant the contract creator full permissions
    userRoles[creator] = FULL_PRIVILEGES_MASK;
  }

  /**
   * @notice finds an owner address for a token specified
   * @dev Gets the owner of the specified token ID
   * @param tokenId ID of the token to query the owner of
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
   * @notice Gets an amount of tokens owned by the given address
   * @dev Gets the balance of the specified address
   * @param who address to query the balance for
   * @return uint80 representing the amount owned by the passed address
   */
  function balanceOf(address who) public constant returns (uint80) {
    // read the length of the `who`s collection of tokens
    return uint80(collections[who].length);
  }

  /**
   * @notice Checks if specified token exists
   * @dev Returns whether the specified token ID exists
   * @param tokenId ID of the token to query the existence of
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
   *      64 lower bits of which are managed and updated by the token itself,
   *      while higher 32 bits may be used by external operators
   */
  function getToken(uint80 tokenId) public constant returns (uint96) {
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
  function getOwnershipModified(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getToken(tokenId);

    // extract 32 bits of last transfer block ID and return
    return uint32(state);
  }

  /**
   * @dev extracts 32 bit integer block ID of the token creation
   */
  function getCreationTime(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getToken(tokenId);

    // extract 32 bits of token creation block ID and return
    return uint32(state >> 32);
  }

  /**
   * @dev extracts 32 bit integer token state,
   *      which may be used by external operators
   */
  function getState(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint96 state = getToken(tokenId);

    // extract 32 bits of the token state and return
    return uint32(state >> 64);
  }

  /**
   * @dev extracts 31 bit integer block ID when token lock has changed
   */
  function getLastLockingBlock(uint80 tokenId) public constant returns (uint32) {
    // get token state
    uint32 lockingBlock = getState(tokenId);

    // overwrite first bit with zero (it contains lock) and return
    return uint32(lockingBlock & 0x7FFFFFFF);
  }

  /**
   * @dev checks if the token is in locked state;
   * locked token cannot be transferred (change ownership) or
   * destroyed (burnt)
   * @param tokenId ID of the token to check locked status for
   * @return whether the token is locked
   */
  function isLocked(uint80 tokenId) public constant returns (bool) {
    // get token state
    uint32 state = getState(tokenId);

    // extract the locked bit, check and return
    return state & lockedBitmask > 0;
  }

  /**
   * @dev Allows setting the `lockedBitmask` parameter of the contract,
   *      which is used to determine if a particular token is locked or not
   * @dev A locked token cannot be transferred or burnt
   * @dev The token is locked if it contains any bits
   *      from the `lockedBitmask` in its `state` set
   */
  function setLockedBitmask(uint32 bitmask) public {
    // feature must be enabled globally and
    // caller should have a permission to update state
    require(isFeatureEnabledAndSenderInRole(ROLE_STATE_PROVIDER));

    // update the locked bitmask
    lockedBitmask = bitmask;
  }

  /**
   * @dev Allows external operator to update token's state
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission.
   * @dev Requires `ROLE_STATE_PROVIDER` global feature to be enabled.
   * @param tokenId ID of the token to update state for
   * @param state token state to set
   */
  function setState(uint80 tokenId, uint32 state) public {
    // feature must be enabled globally and
    // caller should have a permission to update state
    require(isFeatureEnabledAndSenderInRole(ROLE_STATE_PROVIDER));

    // get the token from storage
    uint256 token = tokens[tokenId];

    // check if this token exists
    require(token > 0);

    // update token state  // 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    tokens[tokenId] = token & MASK_CLEAR_STATE | uint256(state) << 224;
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
    require(hasRole(p, ROLE_FEATURE_MANAGER));

    // taking into account caller's permissions,
    // 1) enable features requested
    f |= p & mask;
    // 2) disable features requested
    f &= FULL_PRIVILEGES_MASK ^ (p & (FULL_PRIVILEGES_MASK ^ mask));
  }

  /**
   * @dev Creates the global `operator` - an address which has
   * some extended privileges over the token smart contract, for example
   * token minting, burning, transferring on behalf, etc.
   * @dev Note that a newly added operator cannot have any permissions
   * which caller doesn't have.
   * @dev Requires sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Requires `ROLE_ROLE_MANAGER` global feature to be enabled.
   * @dev Cannot update existing operator. Throws if `operator` already exists.
   * @param operator address of the operator to add
   * @param permissions bitmask representing a set of permissions which
   * newly created operator will have
   */
  function createOperator(address operator, uint32 permissions) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = userRoles[caller];

    // feature must be enabled globally and
    // caller should have a permission to add new operator
    require(isFeatureEnabledAndHasRole(p, ROLE_ROLE_MANAGER));
    // caller cannot grant a permission which he doesn't have himself
    require(p | permissions == p);
    // create is not allowed to overwrite existing operator
    require(userRoles[operator] == 0);

    // add an operator with the permissions specified
    userRoles[operator] = permissions;
  }

  /**
   * @dev Updates an existing global operator.
   * Creates a new one if it doesn't exist.
   * @dev Note that updatable (`operator`) cannot receive permission which
   * updater (sender) doesn't have.
   * @dev Requires sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Requires `ROLE_ROLE_MANAGER` global feature to be enabled.
   * @dev Can create a new operator. Doesn't throw if `operator` doesn't exist.
   * @param operator address of the operator to update
   * @param permissions bitmask representing a set of permissions which
   * `operator` will have
   */
  function updateOperator(address operator, uint32 permissions) public {
    // call sender nicely - caller
    address caller = msg.sender;
    // read caller's permissions
    uint32 p = userRoles[caller];

    // feature must be enabled globally and
    // caller should have a permission to update operator
    require(isFeatureEnabledAndHasRole(p, ROLE_ROLE_MANAGER));
    // caller cannot grant a permission which he doesn't have himself
    require(p | permissions == p);

    // update may extend existing operator's permissions
    uint32 e = userRoles[operator];
    // update an operator with the permissions specified
    userRoles[operator] = e | permissions;
  }

  /**
   * @dev Deletes an existing global operator.
   * @dev Requires sender to have `ROLE_ROLE_MANAGER` permission.
   * @dev Requires `ROLE_ROLE_MANAGER` global feature to be enabled.
   * @param operator address of the operator to delete
   */
  function deleteOperator(address operator) public {
    // feature must be enabled globally and
    // caller should have a permission to remove operator
    require(isFeatureEnabledAndSenderInRole(ROLE_ROLE_MANAGER));

    // remove an operator
    delete userRoles[operator];
  }

  /**
   * @dev Creates new token with `tokenId` ID specified and assigns
   * address `to` an ownership of that token.
   * @dev Requires sender to have `ROLE_TOKEN_MANAGER` permission.
   * @dev Requires `ROLE_TOKEN_MANAGER` global feature to be enabled.
   * @param to owner address of the newly created token
   * @param tokenId ID of the token to create
   */
  function mint(address to, uint80 tokenId) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // feature must be enabled globally and
    // caller should have a permission to mint a token
    require(isFeatureEnabledAndSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(to, tokenId);
  }

  /**
   * @dev Creates several tokens in a single transaction and
   * assigns an ownership `to` for these tokens
   * @dev Requires sender to have `ROLE_TOKEN_MANAGER` permission.
   * @dev Requires `ROLE_TOKEN_MANAGER` global feature to be enabled.
   * @param to an address to assign created cards ownership to
   * @param ids IDs ow the tokens to create
   */
  function mintTokens(address to, uint80[] ids) public {
    // validate destination address
    require(to != address(0));
    require(to != address(this));

    // feature must be enabled globally and
    // caller should have a permission to mint tokens
    require(isFeatureEnabledAndSenderInRole(ROLE_TOKEN_CREATOR));

    // iterate over `ids` array and mint each token specified
    for(uint256 i = 0; i < ids.length; i++) {
      // delegate call to `__mint`
      __mint(to, ids[i]);
    }
  }

  /**
   * @dev Destroys a token with `tokenId` ID specified.
   * @dev Requires sender to have `ROLE_TOKEN_MANAGER` permission.
   * @dev Requires `ROLE_TOKEN_MANAGER` global feature to be enabled.
   * @dev Requires the token not to be locked.
   * @param tokenId ID of the token to destroy
   */
  function burn(uint80 tokenId) public {
    // feature must be enabled globally and
    // caller should have a permission to burn a token
    require(isFeatureEnabledAndSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__burn`
    __burn(tokenId);
  }

  /**
   * @dev Destroys several tokens in a single transaction
   * @dev Requires sender to have `ROLE_TOKEN_MANAGER` permission.
   * @dev Requires `ROLE_TOKEN_MANAGER` global feature to be enabled.
   * @param ids IDs ow the tokens to destroy
   */
  function burnTokens(uint80[] ids) public {
    // feature must be enabled globally and
    // caller should have a permission to burn a token
    require(isFeatureEnabledAndSenderInRole(ROLE_TOKEN_CREATOR));

    // iterate over `ids` array and burn each token specified
    for(uint256 i = 0; i < ids.length; i++) {
      // delegate call to `__burn`
      __burn(ids[i]);
    }
  }

  /**
   * @notice Transfers a token specified to the address specified.
   * If transferring to a smart contract be VERY CAREFUL to ensure
   * that it is aware of ERC-721 or your Token may be lost forever.
   * @dev Transfers the ownership of a given token ID to another address.
   * @dev Requires transaction sender to be the owner of a token.
   * @dev Requires `FEATURE_TRANSFERS` global feature to be enabled.
   * @dev Requires the token not to be locked.
   * @param to address to receive the ownership of the given token ID
   * @param tokenId ID of the token to be transferred
   */
  function transfer(address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(isFeatureEnabled(FEATURE_TRANSFERS));

    // call sender nicely - `from`
    address from = msg.sender;

    // delegate call to unsafe `__transfer`
    __transfer(from, to, tokenId);
  }

  /**
   * @dev Approves another address to transfer the given token ID.
   * @dev The zero address indicates there is no approved address.
   * @dev There can only be one approved address per token at a given time.
   * @dev Can only be called by the token owner or an approved operator.
   * @dev Requires `FEATURE_TRANSFERS_ON_BEHALF` global feature to be enabled.
   * @param to address to be approved for the given token ID
   * @param tokenId ID of the token to be approved
   */
  function approve(address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

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
   * @dev Requires `FEATURE_TRANSFERS_ON_BEHALF` global feature to be enabled.
   * @param to operator address to set the approval
   * @param approved representing the status of the approval to be set
   */
  function approveForAll(address to, bool approved) public {
    // set maximum possible approval, 2^256 – 1, unlimited de facto
    approveForAll(to, approved ? UNLIMITED_APPROVALS : 0);
  }

  /**
   * @dev Sets or unsets the approval of a given operator
   * @dev An operator is allowed to transfer *all* tokens of the sender on their behalf
   * @dev Requires `FEATURE_TRANSFERS_ON_BEHALF` global feature to be enabled.
   * @param to operator address to set the approval
   * @param approved representing the number of the approval left to be set
   */
  function approveForAll(address to, uint256 approved) public {
    // feature must be enabled globally
    require(isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

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
   * @dev Requires `FEATURE_TRANSFERS_ON_BEHALF` global feature to be enabled.
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param tokenId ID of the token to be transferred
   */
  function transferFrom(address from, address to, uint80 tokenId) public {
    // feature must be enabled globally
    require(isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

    // call sender nicely - `operator`
    address operator = msg.sender;
    // find if an approved address exists for this token
    address approved = approvals[tokenId];

    // find an owner of a token
    address owner = ownerOf(tokenId);

    // fetch how much approvals left for a caller
    uint256 approvalsLeft = operators[owner][operator];

    // caller must have an approval to transfer this particular token
    // or caller must be approved to transfer all the tokens
    require(operator == from || operator == approved || approvalsLeft > 0);

    if(operator == approved) {
      // clear approval + emit event
      __approve(from, address(0), tokenId);
    }
    if (approvalsLeft > 0) {
      // update an approval + emit an event
      __approveAll(from, to, approvalsLeft - 1);
    }

    // delegate call to unsafe `__transfer`
    __transfer(from, to, tokenId);
  }

  /// @notice Checks if all the specified features (bitmask) are enabled
  function isFeatureEnabled(uint32 feature) public constant returns (bool) {
    // evaluate if feature is enabled and return
    return hasRole(f, feature);
  }

  /// @notice Checks if all the specified features (bitmask) are enabled and if sender is allowed to execute them
  function isFeatureEnabledAndSenderInRole(uint32 roleRequired) public constant returns (bool) {
    // call sender gracefully - `user`
    address user = msg.sender;

    // read user's permissions (role)
    uint32 actualRole = userRoles[user];

    // evaluate the feature and user role
    return isFeatureEnabledAndHasRole(actualRole, roleRequired);
  }

  /// @notice Checks if all the specified features (bitmask) are enabled
  function isFeatureEnabledAndHasRole(uint32 actualRole, uint32 roleRequired) public constant returns (bool) {
    // evaluate the feature and user role
    return hasRole(f & actualRole, roleRequired);
  }

  /// @notice Checks if user role `userRole` contain all the permissions required `roleRequired`
  function hasRole(uint32 actualRole, uint32 roleRequired) public pure returns(bool) {
    // check the bitmask for the role required and return the result
    return actualRole & roleRequired == roleRequired;
  }


  // perform a mint operation, unsafe, private use only
  function __mint(address to, uint80 tokenId) private {
    // validate token ID is not zero
    require(tokenId != 0);

    // the token specified should not already exist
    require(tokens[tokenId] == 0);

    // init token value with current date and new owner address
    uint256 token = __blockNum() << 192 | uint160(to);

    // token index within the owner's collection of tokens
    // points to the place where the token will be placed to
    indexes[tokenId] = uint80(collections[to].length);

    // push newly created token ID to the owner's collection of tokens
    collections[to].push(tokenId);

    // persist newly created token
    tokens[tokenId] = token;

    // update total tokens number
    totalSupply++;

    // fire a Mint event
    emit Minted(tokenId, to, msg.sender);
    // fire Transfer event (ERC20 compatibility)
    emit Transfer(address(0), to, tokenId);
  }

  // perform a burn operation, unsafe, private use only
  function __burn(uint80 tokenId) private {
    // token state should not be locked
    // this check also checks if token exists
    require(!isLocked(tokenId));

    // get the token from storage
    uint256 token = tokens[tokenId];

    // extract token owner address
    address from = address(token);

    // remove token from the owner's collection
    __remove(from, tokenId);

    // update total tokens number
    totalSupply--;

    // delete approval if any
    __approve(from, address(0), tokenId);

    // delete token
    delete tokens[tokenId];

    // fire a Burnt event
    emit Burnt(tokenId, from, msg.sender);
    // fire Transfer event (ERC20 compatibility)
    emit Transfer(from, address(0), tokenId);
  }

  // perform an approval, unsafe, private use only
  function __approve(address from, address to, uint80 tokenId) private {
    // set an approval
    approvals[tokenId] = to;

    // emit en event
    emit Approval(from, to, tokenId);
  }

  // perform an token operator approval, unsafe, private use only
  function __approveAll(address from, address to, uint256 approved) private {
    // set an approval
    operators[from][to] = approved;

    // emit an event
    emit ApprovalForAll(from, to, approved);
  }

  // perform the transfer, unsafe, private use only
  function __transfer(address from, address to, uint80 tokenId) private {
    // validate source and destination address
    require(from != address(0));
    require(to != address(0));
    require(to != from);

    // get the token from storage
    uint256 token = tokens[tokenId];

    // validate token ownership and existence
    require(from == ownerOf(tokenId));

    // token state should not be locked
    require(!isLocked(tokenId));

    // delegate call to `__move` to update collections
    __move(from, to, tokenId);

    // update token transfer date and owner // 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000
    tokens[tokenId] = token & MASK_CLEAR_TRANSFER | __blockNum() << 160 | uint160(to);

    // emit en event
    emit Transfer(from, to, tokenId);
  }

  /// @dev Move a token `tokenId` from owner `from` to a new owner `to`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __move(address from, address to, uint80 tokenId) private {
    // delegate call to `__remove` to remove token from `from`
    __remove(from, tokenId);

    // delegate call to `__add` to add token to `to`
    __add(to, tokenId);
  }

  /// @dev Remove a token `tokenId` from owner `from`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __remove(address from, uint80 tokenId) private {
    // get a reference to the collection where token is
    uint80[] storage fCol = collections[from];

    // collection `fCol` cannot be empty, if it is - it's a bug
    assert(fCol.length != 0);

    // index of the token within collection `f`
    uint80 i = indexes[tokenId];

    // we put the last token in the collection `f` to the position released
    // get an ID of the last token in `f`
    uint80 id = fCol[fCol.length - 1];

    // update token index to point to proper place in the collection `f`
    indexes[id] = i;

    // put it into the position i within `f`
    fCol[i] = id;

    // trim the collection `f` by removing last element
    fCol.length--;
  }

  /// @dev Add a token `tokenId` to a new owner `to`
  /// @dev Unsafe, doesn't check for consistence
  /// @dev Must be kept private at all times
  function __add(address to, uint80 tokenId) private {
    // get a reference to the collection where token goes to
    uint80[] storage tCol = collections[to];

    // update token index according to position in new collection `t`
    indexes[tokenId] = uint80(tCol.length);

    // push token into collection
    tCol.push(tokenId);
  }

  // returns block.number, guaranteed to fit into 31 bit integer
  function __blockNum() private constant returns (uint256) {
    // erase everything except right 31 bits
    return uint256(0x7FFFFFFF & block.number);
  }
}
