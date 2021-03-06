pragma solidity 0.5.8;

import "./AccessMultiSig.sol";

/**
 * @title Referral Points Tracker
 *
 * @notice RefPointsTracker keeps track of referral points earned and consumed by players
 *
 * @dev Keeps track of issued and consumed referral points, calculates available referral
 *      points as difference between issued and consumed
 * @dev Based on improved access control list (ACL Light), allowing issuers and consumers
 *      to issue and consume respectively referral points to players' addresses
 *
 * @author Basil Gorin
 */
contract RefPointsTracker is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   *      and changes smart contract itself is to be redeployed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TRACKER_UID = 0xe2e757604d700ca3a2a49e36a752c3974a10fd4fea31f1fe3ee944eaa535513c;

  /**
   * @notice Referral points issuer is responsible for issuing
   *      referral points to a player address
   * @dev Role `ROLE_REF_POINTS_ISSUER` allows increasing `issued` -
   *      issued referral points counter
   */
  uint32 public constant ROLE_REF_POINTS_ISSUER = 0x00000001;

  /**
   * @notice Referral points consumer is responsible for consuming
   *      referral points from a player address
   * @dev Role `ROLE_REF_POINTS_CONSUMER` allows increasing `consumed` -
   *      consumed referral points counter
   */
  uint32 public constant ROLE_REF_POINTS_CONSUMER = 0x00000002;

  /**
   * @notice Seller is responsible for selling any kind of
   *      stuff to the players
   * @dev Role `ROLE_SELLER` allows adding known addresses -
   *      calling `addKnownAddress` and modifying `knownAddresses`
   */
  uint32 public constant ROLE_SELLER = 0x00000004;

  /**
   * @notice Issued referral points counter, tracks how much points
   *      a particular address earned over the entire time
   * @dev Initially zero, may only increase over time, must be equal to
   *      or greater than `consumed` - consumed referral points counter
   */
  mapping(address => uint256) public issued;

  /**
   * @notice Consumed referral points counter, tracks how much points
   *      a particular address consumed (spent) over the entire time
   * @dev Initially zero, may only increase over time, must be equal to
   *      or less than `issued` - issued referral points counter
   */
  mapping(address => uint256) public consumed;

  /**
   * @notice Addresses known to spent some wei in the past
   *      and eligible to be used as referring addresses
   * @dev These addresses may earn referral points when
   *      referring them in sales
   */
  mapping(address => bool) public known;

  /**
   * @notice Enumeration of all referral points holders
   * @dev Contains all the addresses which earned referral points
   */
  address[] public holders;

  /**
   * @notice Enumeration of all known addresses
   * @dev Contains all the addresses added using `addKnownAddress`
   *      or `addKnownAddresses` functions
   */
  address[] public knownAddresses;

  /**
   * @dev Fired in issueTo() function
   * @param _by caller of the function (issuer),
   *      an address with `ROLE_REF_POINTS_ISSUER` permission
   * @param _to an address referral points were issued to
   * @param _amount number of referral points issued
   * @param _total total number of referral points address has
   *      after function (transaction) execution
   * @param _available number of referral points available to be spent
   *      after function (transaction) execution
   */
  event RefPointsIssued(address indexed _by, address indexed _to, uint256 _amount, uint256 _total, uint256 _available);

  /**
   * @dev Fired in consumeFrom() function
   * @param _by caller of the function (consumer),
   *      an address with `ROLE_REF_POINTS_CONSUMER` permission
   * @param _from an address referral points were consumed from
   * @param _amount number of referral points consumed
   * @param _total total number of referral points address has
   *      after function (transaction) execution
   * @param _available number of referral points available to be spent
   *      after function (transaction) execution
   */
  event RefPointsConsumed(address indexed _by, address indexed _from, uint256 _amount, uint256 _total, uint256 _available);

  /**
   * @dev Fired in addKnownAddress() callback function
   * @param _by caller of the function (seller),
   *      an address with `ROLE_SELLER` permission
   * @param _address new address to add (which has spent some wei)
   */
  event KnownAddressAdded(address indexed _by, address indexed _address);

  /**
   * @notice Available referral points counter of a particular address,
   *      referral points available to be spent
   * @dev Calculated as difference between issued points counter and consumed points counter
   * @dev Unsafe, doesn't check for `issued >= consumed` constraint,
   *      relies on proper behaviour of `issued/consumed` update functions
   * @param owner address of the player address to get available referral points for
   * @return available referral points counter for address specified
   */
  function available(address owner) public view returns (uint256) {
    // calculate difference and return, unsafe
    return issued[owner] - consumed[owner];
  }

  /**
   * @notice ERC20-compatible alias for `available` referral points counter
   * @param owner address of the player address to get available referral points for
   * @return available referral points counter for address specified
   */
  function balanceOf(address owner) public view returns (uint256) {
    // delegate call to `available`
    return available(owner);
  }

  /**
   * @notice Verifies if an address is known to the tracker
   * @dev Address is known if it was added as known by `ROLE_SELLER`
   *      or was issued some referral points by `ROLE_REF_POINTS_ISSUER`
   * @param _address address to query known status for
   * @return true if address is known (added ot has some ref points issued)
   */
  function isKnown(address _address) public view returns(bool) {
    // verify if address was added as known or
    // has some referral points issued, and return
    return known[_address] || issued[_address] != 0;
  }

  /**
   * @notice Verifies if referrer and referred addresses are valid,
   *      that is if a referrer can invite given referred
   * @dev Addresses are treated as valid if referrer is already known to
   *      the smart contract and referred is not known
   * @dev Zero referrer address is treated as not valid
   * @dev Zero referred address is treated as not valid
   * @param referrer address of the referrer (known address)
   * @param referred address of the referred (unknown address)
   * @return true if referrer is known and referred is unknown,
   *      false otherwise; false if any of the addresses is zero
   */
  function isValid(address referrer, address referred) public view returns(bool) {
    // perform validation based on two calls to `isKnown` and return
    return referrer != address(0) && referred != address(0) && isKnown(referrer) && !isKnown(referred);
  }

  /**
   * @notice Lists all referral points holders addresses
   * @return an array of referral points holders addresses,
   *      doesn't contain duplicates
   */
  function getAllHolders() public view returns (address[] memory) {
    // read `holders` array and return
    return holders;
  }

  /**
   * @notice Number of all referral points holders
   * @return length of the referral points holders array
   */
  function getNumberOfHolders() public view returns (uint256) {
    // read `holders` array length and return
    return holders.length;
  }

  /**
   * @notice Lists all known addresses as an array
   * @return an array of known addresses,
   *      doesn't contain duplicates
   */
  function getKnownAddresses() public view returns(address[] memory) {
    // read `knownAddresses` array and return
    return knownAddresses;
  }

  /**
   * @notice Number of all known addresses
   * @return length of the known addresses array
   */
  function getNumberOfKnownAddresses() public view returns(uint256) {
    // read `knownAddresses` array length and return
    return knownAddresses.length;
  }

  /**
   * @notice Issues referral points to a player address
   * @dev Requires sender to have `ROLE_REF_POINTS_ISSUER` permission
   * @param _to an address to issue referral points to
   * @param _amount number of referral points to issue
   */
  function issueTo(address _to, uint256 _amount) public {
    // check if caller has sufficient permissions to issue referral points
    require(isSenderInRole(ROLE_REF_POINTS_ISSUER));

    // arithmetic overflow check, non-zero amount check
    require(issued[_to] + _amount > issued[_to]);

    // if `_to` address is new address -
    if(issued[_to] == 0) {
      // - track it in `holders` array
      holders.push(_to);
    }

    // issue referral points requested
    issued[_to] += _amount;

    // emit an event
    emit RefPointsIssued(msg.sender, _to, _amount, issued[_to], available(_to));
  }

  /**
   * @notice Consumes referral points from a player address
   * @dev Requires sender to have `ROLE_REF_POINTS_CONSUMER` permission
   * @param _from an address to consume referral points from
   * @param _amount number of referral points to consume
   */
  function consumeFrom(address _from, uint256 _amount) public {
    // check if caller has sufficient permissions to consume referral points
    require(isSenderInRole(ROLE_REF_POINTS_CONSUMER));

    // arithmetic overflow check, non-zero amount check
    require(consumed[_from] + _amount > consumed[_from]);

    // verify that there are enough referral points to consume
    require(consumed[_from] + _amount <= issued[_from]);

    // consume referral points requested
    consumed[_from] += _amount;

    // emit an event
    emit RefPointsConsumed(msg.sender, _from, _amount, issued[_from], available(_from));
  }

  /**
   * @dev A callback function called by seller on successful sale
   *      and some wei being spent by the player
   * @dev Adds address specified to `knownAddresses` mapping
   * @dev Requires sender to have `ROLE_SELLER` permission
   * @param _address an address which spent some wei (bought something)
   */
  function addKnownAddress(address _address) public {
    // check if caller has sufficient permissions to add an address
    require(isSenderInRole(ROLE_SELLER));

    // if `_address` is valid (non-zero) and new -
    if(_address != address(0) && !isKnown(_address)) {
      // - track it in `knownAddresses` array
      knownAddresses.push(_address);

      // add known address to `known` mapping
      known[_address] = true;

      // emit an event
      emit KnownAddressAdded(msg.sender, _address);
    }
  }

}
