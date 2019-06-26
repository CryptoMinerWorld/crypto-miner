pragma solidity 0.5.8;

/**
 * @title Access Control List – MultiSig Edition
 *
 * @notice Access control smart contract provides an API to check
 *      if specific operation is permitted globally and/or
 *      if particular user has a permission to execute it.
 *
 * @notice It deals with two main entities: features and roles.
 *
 * @notice Features are designed to be used to enable/disable specific
 *      functions (public functions) of the smart contract for everyone.
 * @notice User roles are designed to restrict access to specific
 *      functions (restricted functions) of the smart contract to some users.
 *
 * @notice Terms "role", "permissions" and "set of permissions" have equal meaning
 *      in the documentation text and may be used interchangeably.
 *
 * @dev This smart contract is designed to be inherited by other
 *      smart contracts which require access control management capabilities.
 *
 * @dev MultiSig version allows features and roles management
 *      on user's behalf and/or by users quorum.
 * @dev Current MultiSig implementation is limited to 2 users quorum.
 *
 * @author Basil Gorin
 */
contract AccessMultiSig {
  /**
   * @notice Enables MultiSig mode
   * @notice In MultiSig mode updating features and roles requires an update
   *      request to be signed by at least 2 access managers
   * @dev `FEATURE_MSIG_ENABLED` disables `updateFeatures` and `updateRole`,
   *      leaving `updateMsig` as the only option to update features and roles
   */
  uint256 public constant FEATURE_MSIG_ENABLED = 0x8000000000000000000000000000000000000000000000000000000000000000;

  /**
   * @notice Access manager is responsible for assigning the roles to users,
   *      enabling/disabling global features of the smart contract
   * @notice Access manager can add, remove and update user roles,
   *      remove and update global features
   * @dev Role ROLE_ACCESS_MANAGER allows modifying user roles and global features
   */
  uint256 public constant ROLE_ACCESS_MANAGER = 0x8000000000000000000000000000000000000000000000000000000000000000;

  /**
   * @dev Bitmask representing all the possible permissions (super admin role)
   */
  uint256 private constant FULL_PRIVILEGES_MASK = uint256(-1); // uint256(-1) overflows to 0xFFFF...

  /**
   * @dev Number of signatures required to approve an update role request
   */
  uint8 public constant MSIG_QUORUM = 2;

  /**
   * @notice Privileged addresses with defined roles/permissions
   * @notice In the context of ERC20/ERC721 tokens these can be permissions to
   *      allow minting or burning tokens, transferring on behalf and so on
   * @dev Maps user address to the permissions bitmask (role), where each bit
   *      represents a permission
   * @dev Bitmask 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
   *      represents all possible permissions
   * @dev Zero address mapping represents global features of the smart contract
   */
  mapping(address => uint256) public userRoles;

  /**
   * @dev Auxiliary mapping, used to store nonces;
   *      Nonces are required to ensure same signed message can't be used twice
   * @dev Maps an address to its nonce
   */
  mapping(address => uint256) public nonces;

  /**
   * @dev Fired in updateRole()
   * @param _by operator which called the function
   * @param _to address which was granted/revoked permissions
   * @param _requested permissions requested
   * @param _actual permissions set
   */
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
   * @dev Auxiliary getter function to maintain compatibility with previous
   *      versions of the Access Control List smart contract, where
   *      features was a separate uint256 public field
   */
  function features() public view returns(uint256) {
    // according to new design features are stored in zero address
    // mapping of `userRoles` structure
    return userRoles[address(0)];
  }

  /**
   * @dev Updates set of the globally enabled features (`features`),
   *      taking into account sender's permissions
   * @dev Requires transaction sender to have `ROLE_ACCESS_MANAGER` permission
   * @dev Function is left for backward compatibility with older versions
   * @param _mask bitmask representing a set of features to enable/disable
   */
  function updateFeatures(uint256 _mask) public {
    // delegate call to `updateRole`
    updateRole(address(0), _mask);
  }

  /**
   * @dev Updates set of permissions (role) for a given user,
   *      taking into account sender's permissions.
   * @dev Setting role to zero is equivalent to removing an all permissions
   * @dev Setting role to `FULL_PRIVILEGES_MASK` is equivalent to
   *      copying senders' permissions (role) to the user
   * @dev Requires transaction sender to have `ROLE_ACCESS_MANAGER` permission
   * @param _to address of a user to alter permissions for or zero
   *      to alter global features of the smart contract
   * @param _role bitmask representing a set of permissions to
   *      enable/disable for a user specified
   */
  function updateRole(address _to, uint256 _role) public {
    // verify MultiSig mode is not enabled
    require(!isFeatureEnabled(FEATURE_MSIG_ENABLED));

    // verify sender has a permission to execute this function
    require(isSenderInRole(ROLE_ACCESS_MANAGER));

    // delegate call to `__updateRole`
    __updateRole(__senderArr(), _to, _role);
  }

  /**
   * @dev An auxiliary private function to write a user role
   * @dev Assigns role `_role` to address `_to` on behalf of `_by`,
   *      meaning permissions of the `_by` have influence on the actual role set
   * @param _by non-empty array of operators performing the update role request
   * @param _to user address affected by the update role request
   * @param _role requested role to set for `_to`, actual set role may differ
   */
  function __updateRole(address[] memory _by, address _to, uint256 _role) private {
    // evaluate the role and reassign it,
    // ensures also that `_by` array is not empty
    userRoles[_to] = evaluateBy(_by, userRoles[_to], _role);

    // fire an event
    emit RoleUpdated(_by[0], _to, _role, userRoles[_to]);
  }

  /**
   * @dev Based on the actual role provided (set of permissions), operator addresses,
   *      and role required (set of permissions), calculate the resulting
   *      set of permissions (role).
   * @dev If all operators are super admins and have full permissions (FULL_PRIVILEGES_MASK),
   *      the function will always return `required` regardless of the `actual`.
   * @dev In contrast, if operators have no permissions at all (zero mask),
   *      the function will always return `actual` regardless of the `required`.
   * @param _by non-empty array of addresses of the contract operators
   *      to use permissions of for evaluation
   * @param actual input set of permissions to evaluate against
   * @param required desired set of permissions to have
   * @return resulting set of permissions which can be set
   */
  function evaluateBy(address[] memory _by, uint256 actual, uint256 required) public view returns(uint256) {
    // ensure array of operators `_by` is not empty
    require(_by.length != 0);

    // to calculate operators permissions intersection
    // read first operator permissions
    uint256 p = userRoles[_by[0]];

    // iterate over the rest of the operators' array
    for(uint256 i = 1; i < _by.length; i++) {
      // and accumulate the intersection of their permissions
      p &= userRoles[_by[i]];
    }

    // calculate the result - delegate call to `__evaluate`
    return __evaluate(p, actual, required);
  }

  /**
   * @dev Based on the actual role provided (set of permissions), operator permissions,
   *      and role required (set of permissions), calculate the resulting
   *      set of permissions (role).
   * @dev If operator is super admin and has full permissions (FULL_PRIVILEGES_MASK),
   *      the function will always return `required` regardless of the `actual`.
   * @dev In contrast, if operator has no permissions at all (zero mask),
   *      the function will always return `actual` regardless of the `required`.
   * @param p set of permissions of the contract operator to use permissions of for evaluation
   * @param actual input set of permissions to evaluate against
   * @param required desired set of permissions to have
   * @return resulting set of permissions which can be set
   */
  function __evaluate(uint256 p, uint256 actual, uint256 required) private pure returns(uint256) {
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
   * @param required set of features to check against
   * @return true if all the features requested are enabled, false otherwise
   */
  function isFeatureEnabled(uint256 required) public view returns(bool) {
    // delegate call to `__hasRole`, passing `features` property
    return __hasRole(features(), required);
  }

  /**
   * @dev Checks if transaction sender `msg.sender` has all the permissions (role) required
   * @param required set of permissions (role) to check against
   * @return true if all the permissions requested are enabled, false otherwise
   */
  function isSenderInRole(uint256 required) public view returns(bool) {
    // delegate call to `isOperatorInRole`, passing transaction sender
    return isUserInRole(msg.sender, required);
  }

  /**
   * @dev Checks if user `user` has all the permissions (role) required
   * @param user address of the user to check role for
   * @param required set of permissions (role) to check against
   * @return true if all the permissions requested are enabled, false otherwise
   */
  function isUserInRole(address user, uint256 required) public view returns(bool) {
    // delegate call to `__hasRole`, passing operator's permissions (role)
    return __hasRole(userRoles[user], required);
  }

  /**
   * @dev Checks if role `actual` contains all the `required` permissions
   * @param actual existent role
   * @param required required role
   * @return true if actual has required role (all permissions), false otherwise
   */
  function __hasRole(uint256 actual, uint256 required) internal pure returns(bool) {
    // check the bitmask intersection is equal to the role required and return the result
    return actual & required == required;
  }

  /**
   * @dev Auxiliary function to pack `msg.sender` into s single element array
   * @return an array containing single element - `msg.sender`
   */
  function __senderArr() private view returns(address[] memory) {
    // allocate memory required to store the result
    address[] memory result = new address[](1);

    // put the result into array
    result[0] = msg.sender;

    // return the result
    return result;
  }


  /**
   * @dev MultiSig version of the `updateRole` function
   * @dev Updates set of permissions (role) for a given user,
   *      taking into account signers' permissions
   * @dev Setting role to zero is equivalent to removing all permissions
   * @dev Setting role to `FULL_PRIVILEGES_MASK` is equivalent to
   *      copying signers' permissions (roles intersection) to the user
   * @dev Requires transaction signers to have `ROLE_ROLE_MANAGER` permission
   * @dev Requires `MSIG_QUORUM` signatures in MultiSig mode –
   *      if `FEATURE_MSIG_ENABLED` is enabled
   * @param _to address of a user to alter permissions for or zero
   *      to alter global features of the smart contract
   * @param _role bitmask representing a set of permissions to
   *      enable/disable for a user specified
   * @param _expiresOn an expiration date of the request,
   *      optional, required in MultiSig mode only
   * @param v an array of ECDSA signature outputs, "v",
   *      optional, required in MultiSig mode only
   * @param r an array of ECDSA signature outputs, "r",
   *      optional, required in MultiSig mode only
   * @param s an array of ECDSA signature outputs, "s",
   *      optional, required in MultiSig mode only
   */
  function updateMsig(
    address _to,
    uint256 _role,
    uint256 _expiresOn,
    uint8[] memory v,
    bytes32[] memory r,
    bytes32[] memory s
  ) public {
    // verify that all three arrays have equal lengths
    require(v.length == r.length);
    require(v.length == s.length);

    // define an array to store all extracted addresses
    // we need no more than `MSIG_QUORUM` addresses
    address[] memory _by = new address[](MSIG_QUORUM);

    // define a counter to track valid signatures
    uint8 signatures = 0;

    // verify transaction sender signature first
    if(isUserInRole(msg.sender, ROLE_ACCESS_MANAGER)) {
      // add transaction sender to the list and increment counter
      _by[signatures++] = msg.sender;
    }

    // try to get additional signatures to get the quorum
    for(uint256 i = 0; i < v.length && signatures < MSIG_QUORUM; i++) {
      // eth_sign address recovery
      address sig = recoverUpdateMsigRequestEthSign(_to, _role, _expiresOn, v[i], r[i], s[i]);

      // choose one of the signatures, add EIP712 address recovery if necessary
      sig = isUserInRole(sig, ROLE_ACCESS_MANAGER)? sig: recoverUpdateMsigRequestEIP712(_to, _role, _expiresOn, v[i], r[i], s[i]);

      // if signature is valid access manager
      if(isUserInRole(sig, ROLE_ACCESS_MANAGER)) {
        // add ot to the list and increment counter
        _by[signatures++] = sig;
      }
    }

    // ensure we have enough signatures now
    require(signatures == MSIG_QUORUM);

    // verify all signers in the array are different
    // let first pointer `i` iterate from second element `[1]` to the very end of the array
    for(uint256 i = 1; i < _by.length; i++) {
      // let second pointer `j` iterate from first element `[0]` to the first pointer [i]
      for(uint256 j = 0; j < i; j++) {
        // verify array elements at the specified pointers differ
        require(_by[j] != _by[i]);
      }
    }

    // update the nonce to protect again replay attack
    nonces[_to]++;

    // finally delegate call to `__updateRole` to perform the requested operation
    __updateRole(_by, _to, _role);
  }

  /**
   * @dev Used to create an update role request to be signed by the user
   * @dev Once signed by at least 2 users, the request can be executed
   *      using `updateRoleMsig` function
   * @param _to address of a user to alter permissions for or zero
   *      to alter global features of the smart contract
   * @param _role bitmask representing a set of permissions to
   *      enable/disable for a user specified
   * @param _expiresOn an expiration date of the request
   */
  function constructUpdateMsigRequest(address _to, uint256 _role, uint256 _expiresOn) public view returns(bytes32) {
    // verify expiration date is correct (is in the future)
    require(_expiresOn > now);

    // calculate sha3 of the tightly packed variables including nonce
    return keccak256(abi.encodePacked(_to, _role, _expiresOn, nonces[_to]));
  }

  /**
   * @dev Recovers an update role request signature according to eth_sign
   * @dev See https://github.com/paritytech/parity-ethereum/issues/8127
   * @dev See https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
   * @param _to address of a user to alter permissions for or zero
   *      to alter global features of the smart contract
   * @param _role bitmask representing a set of permissions to
   *      enable/disable for a user specified
   * @param _expiresOn an expiration date of the request
   * @param v an array of ECDSA signature outputs, "v"
   * @param r an array of ECDSA signature outputs, "r"
   * @param s an array of ECDSA signature outputs, "s"
   * @return the address which signed the request
   */
  function recoverUpdateMsigRequestEthSign(
    address _to,
    uint256 _role,
    uint256 _expiresOn,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) private view returns (address _signer) {
    // valid values are 27 and 28, some implementations may return 0 and 1 instead
    v = v < 27 ? v + 27 : v;

    // eth_sign, https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
    return ecrecover(keccak256(abi.encodePacked(
        "\x19Ethereum Signed Message:\n32",
          constructUpdateMsigRequest(_to, _role, _expiresOn)
      )), v, r, s);
  }

  /**
   * @dev Recovers an update role request signature according to EIP712
   * @param _to address of a user to alter permissions for or zero
   *      to alter global features of the smart contract
   * @param _role bitmask representing a set of permissions to
   *      enable/disable for a user specified
   * @param _expiresOn an expiration date of the request
   * @param v an array of ECDSA signature outputs, "v"
   * @param r an array of ECDSA signature outputs, "r"
   * @param s an array of ECDSA signature outputs, "s"
   * @return the address which signed the order
   */
  function recoverUpdateMsigRequestEIP712(
    address _to,
    uint256 _role,
    uint256 _expiresOn,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) private view returns (address _signer) {
    // valid values are 27 and 28, some implementations may return 0 and 1 instead
    v = v < 27 ? v + 27 : v;

    // EIP712, https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
    return ecrecover(constructUpdateMsigRequest(_to, _role, _expiresOn), v, r, s);
  }

}
