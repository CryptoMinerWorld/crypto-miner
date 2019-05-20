pragma solidity 0.4.23;

/**
 * @title Access Control List (Lightweight version)
 *
 * @dev Access control smart contract provides an API to check
 *      if specific operation is permitted globally and
 *      if particular user has a permission to execute it.
 * @dev This smart contract is designed to be inherited by other
 *      smart contracts which require access control management capabilities.
 *
 * @author Basil Gorin
 */
contract AccessControlLight {
  /// @notice Role manager is responsible for assigning the roles
  /// @dev Role ROLE_ROLE_MANAGER allows modifying operator roles
  uint256 private constant ROLE_ROLE_MANAGER = 0x10000000;

  /// @notice Feature manager is responsible for enabling/disabling
  ///      global features of the smart contract
  /// @dev Role ROLE_FEATURE_MANAGER allows modifying global features
  uint256 private constant ROLE_FEATURE_MANAGER = 0x20000000;

  /// @dev Bitmask representing all the possible permissions (super admin role)
  uint256 private constant FULL_PRIVILEGES_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  /// @dev A bitmask of globally enabled features
  uint256 public features;

  /// @notice Privileged addresses with defined roles/permissions
  /// @notice In the context of ERC20/ERC721 tokens these can be permissions to
  ///      allow minting tokens, transferring on behalf and so on
  /// @dev Maps an address to the permissions bitmask (role), where each bit
  ///      represents a permission
  /// @dev Bitmask 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  ///      represents all possible permissions
  mapping(address => uint256) public userRoles;

  /// @dev Fired in updateFeatures()
  event FeaturesUpdated(address indexed _by, uint256 _requested, uint256 _actual);

  /// @dev Fired in updateRole()
  event RoleUpdated(address indexed _by, address indexed _to, uint256 _requested, uint256 _actual);

  /**
   * @dev Creates an access control instance,
   *      setting contract creator to have full privileges
   */
  constructor() public {
    // contract creator has full privileges
    userRoles[msg.sender] = FULL_PRIVILEGES_MASK;
  }

  /**
   * @dev Updates set of the globally enabled features (`features`),
   *      taking into account sender's permissions.=
   * @dev Requires transaction sender to have `ROLE_FEATURE_MANAGER` permission.
   * @param mask bitmask representing a set of features to enable/disable
   */
  function updateFeatures(uint256 mask) public {
    // caller must have a permission to update global features
    require(isSenderInRole(ROLE_FEATURE_MANAGER));

    // evaluate new features set and assign them
    features = evaluateBy(msg.sender, features, mask);

    // fire an event
    emit FeaturesUpdated(msg.sender, mask, features);
  }

  /**
   * @dev Updates set of permissions (role) for a given operator,
   *      taking into account sender's permissions.
   * @dev Setting role to zero is equivalent to removing an operator.
   * @dev Setting role to `FULL_PRIVILEGES_MASK` is equivalent to
   *      copying senders permissions (role) to an operator.
   * @dev Requires transaction sender to have `ROLE_ROLE_MANAGER` permission.
   * @param operator address of an operator to alter permissions for
   * @param role bitmask representing a set of permissions to
   *      enable/disable for an operator specified
   */
  function updateRole(address operator, uint256 role) public {
    // caller must have a permission to update user roles
    require(isSenderInRole(ROLE_ROLE_MANAGER));

    // evaluate the role and reassign it
    userRoles[operator] = evaluateBy(msg.sender, userRoles[operator], role);

    // fire an event
    emit RoleUpdated(msg.sender, operator, role, userRoles[operator]);
  }

  /**
   * @dev Based on the actual role provided (set of permissions), operator address,
   *      and role required (set of permissions), calculate the resulting
   *      set of permissions (role).
   * @dev If operator is super admin and has full permissions (FULL_PRIVILEGES_MASK),
   *      the function will always return `required` regardless of the `actual`.
   * @dev In contrast, if operator has no permissions at all (zero mask),
   *      the function will always return `actual` regardless of the `required`.
   * @param operator address of the contract operator to use permissions of
   * @param actual input set of permissions to modify
   * @param required desired set of permissions operator would like to have
   * @return resulting set of permissions this operator can set
   */
  function evaluateBy(address operator, uint256 actual, uint256 required) public view returns(uint256) {
    // read operator's permissions
    uint256 p = userRoles[operator];

    // taking into account operator's permissions,
    // 1) enable permissions requested on the `current`
    actual |= p & required;
    // 2) disable permissions requested on the `current`
    actual &= FULL_PRIVILEGES_MASK ^ (p & (FULL_PRIVILEGES_MASK ^ required));

    // return calculated result (actual is not modified)
    return actual;
  }

  /**
   * @dev Checks if requested set of features is enabled globally on the contract
   * @param required set of features to check
   * @return true if all the features requested are enabled, false otherwise
   */
  function isFeatureEnabled(uint256 required) public constant returns(bool) {
    // delegate call to `__hasRole`, passing `features` property
    return __hasRole(features, required);
  }

  /**
   * @dev Checks if transaction sender `msg.sender` has all the permissions (role) required
   * @param required set of permissions (role) to check
   * @return true if all the permissions requested are enabled, false otherwise
   */
  function isSenderInRole(uint256 required) public constant returns(bool) {
    // delegate call to `isOperatorInRole`, passing transaction sender
    return isOperatorInRole(msg.sender, required);
  }

  /**
   * @dev Checks if operator `operator` has all the permissions (role) required
   * @param required set of permissions (role) to check
   * @return true if all the permissions requested are enabled, false otherwise
   */
  function isOperatorInRole(address operator, uint256 required) public constant returns(bool) {
    // delegate call to `__hasRole`, passing operator's permissions (role)
    return __hasRole(userRoles[operator], required);
  }

  /// @dev Checks if role `actual` contains all the permissions required `required`
  function __hasRole(uint256 actual, uint256 required) internal pure returns(bool) {
    // check the bitmask for the role required and return the result
    return actual & required == required;
  }
}
