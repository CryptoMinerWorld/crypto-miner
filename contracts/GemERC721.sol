pragma solidity 0.4.23;

/**
 * @notice Gem is unique tradable entity. Non-fungible.
 * @dev A gem is an ERC721 non-fungible token, which maps Gem ID,
 *      a 24 bit number to a set of gem properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 * @dev A gem supports both minting and burning, a gem can be created and destroyed
 */
contract GemERC721 {
  /// @dev Smart contract version
  /// @dev Should be incremented manually in this source code
  ///      each time smart contact source code is changed
  uint32 public constant TOKEN_VERSION = 0x1;

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
    uint32 id;
    uint32 creationTime;
    uint32 plotId;
    uint16 blockId;
    uint16 gemId;
    uint16 levelId;
    uint16 colorId;
    uint16 gradeType;
    uint16 gradeValue;
    uint32 state;
    uint32 stateModified;
    uint32 index;
    uint32 ownershipModified;
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
  ///      gem owner => approved gem operator => approvals left (zero means no approval)
  /// @dev ERC20 compliant structure for
  ///      function allowance(address owner, address spender) public constant returns (uint256 remaining)
  mapping(address => mapping(address => uint256)) public allowance;

  /// @notice Storage for a collections of gems
  /// @notice A collection of gems is an ordered list of gems,
  ///      owned by a particular address (owner)
  /// @dev A mapping from owner to a collection of his gems (IDs)
  /// @dev ERC20 compliant structure for balances can be derived
  ///      as a length of each collection in the mapping
  /// @dev ERC20 balances[owner] is equal to collections[owner].length
  mapping(address => uint32[]) public collections;

  /// @notice Defines a privileged addresses with additional
  ///      permissions on the smart contract, like minting/burning gems,
  ///      transferring on behalf and so on
  /// @dev Maps an address to the permissions bitmask (role), where each bit
  ///      represents a permissions; bitmask 0xFFFFFFFF represents all possible permissions
  mapping(address => uint32) public userRoles;

  /// @notice Total number of existing gems
  /// @dev ERC20 compliant field for totalSupply()
  uint32 public totalSupply;

  /// @dev The data in gem's state may contain lock(s)
  ///      (ex.: is gem currently mining or not)
  /// @dev A locked gem cannot be transferred or upgraded
  /// @dev The gem is locked if it contains any bits
  ///      from the `lockedBitmask` in its `state` set
  uint32 public lockedBitmask = DEFAULT_MINING_BIT;

  /// @dev A bitmask of globally enabled features, see below
  uint32 public f;

  /// @dev Enables ERC721 transfers of the gems
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;

  /// @dev Enables ERC721 transfers on behalf
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  /// @dev Enables ERC20 transfers of the gems
  uint32 public constant ERC20_TRANSFERS = 0x00000004;

  /// @dev Enables ERC20 transfers on behalf
  uint32 public constant ERC20_TRANSFERS_ON_BEHALF = 0x00000008;

  /// @dev Default bitmask indicating that the gem is `mining`
  /// @dev Consists of a single bit at position 1 – binary 1
  /// @dev This bit is cleared by `miningComplete`
  /// @dev The bit meaning in gem's `state` is as follows:
  ///      0: not mining
  ///      1: mining
  uint32 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1
  
  /// @notice Exchange is responsible for trading gems on behalf of gem holders
  /// @dev Role ROLE_EXCHANGE allows executing transfer on behalf of gem holders
  /// @dev Not used
  //uint32 public constant ROLE_EXCHANGE = 0x00010000;

  /// @notice Gem state provider is responsible for enabling the mining protocol
  /// @dev Role ROLE_STATE_PROVIDER allows modifying gem's state,
  uint32 public constant ROLE_STATE_PROVIDER = 0x00020000;

  /// @notice Gem creator is responsible for creating gems
  /// @dev Role ROLE_GEM_CREATOR allows minting gems
  uint32 public constant ROLE_GEM_CREATOR = 0x00040000;

  /// @notice Gem destroyer is responsible for destroying gems
  /// @dev Role ROLE_GEM_DESTROYER allows burning gems
  uint32 public constant ROLE_GEM_DESTROYER = 0x00080000;

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
  /// @dev Address `_by` allows to track who created a gem
  event Minted(address indexed _by,  address indexed _to, uint32 indexed _tokenId);
  /// @dev Fired in burn()
  /// @dev Address `_by` allows to track who destroyed a gem
  event Burnt(address indexed _from, address _by, uint32 indexed _tokenId);
  /// @dev Fired in transfer(), transferFor(), mint()
  /// @dev When minting a gem, address `_from` is zero
  event GemTransfer(address indexed _from, address indexed _to, uint16 indexed _tokenId);
  /// @dev Fired in transfer(), transferFor(), mint()
  /// @dev When minting a gem, address `_from` is zero
  /// @dev ERC20 compliant event
  event Transfer(address indexed _from, address indexed _to, uint256 _value);
  /// @dev Fired in approveGem()
  event GemApproval(address indexed _owner, address indexed _approved, uint16 indexed _tokenId);
  /// @dev Fired in approve()
  /// @dev ERC20 compliant event
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);
  /// @dev Fired in miningComplete()
  event MiningComplete(uint32 indexed _tokenId);

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
   *      some extended privileges over the gem smart contract,
   *      for example gem minting, burning, transferring on behalf, etc.
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
   * @dev Allows setting the `lockedBitmask` parameter of the contract,
   *      which is used to determine if a particular gem is locked or not
   * @dev A locked gem cannot be transferred or burnt
   * @dev The gem is locked if it contains any bits
   *      from the `lockedBitmask` in its `state` set
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission.
   * @param bitmask a value to set `lockedBitmask` to
   */
  function setLockedBitmask(uint32 bitmask) public {
    // check that the call is made by a combat provider
    require(__isSenderInRole(ROLE_STATE_PROVIDER));

    // update the locked bitmask
    lockedBitmask = bitmask;
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


}
