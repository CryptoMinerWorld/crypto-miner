pragma solidity 0.4.23;

import "./AccessControlLight.sol";

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
contract RefPointsTracker is AccessControlLight {
  /**
   * @notice Referral points issuer is responsible for issuing
   *      referral points to a player address
   * @dev Role ROLE_REF_POINTS_ISSUER allows increasing `issued` -
   *      issued referral points counter
   */
  uint32 public constant ROLE_REF_POINTS_ISSUER = 0x00000001;

  /**
   * @notice Referral points consumer is responsible for consuming
   *      referral points from a player address
   * @dev Role ROLE_REF_POINTS_CONSUMER allows increasing `consumed` -
   *      consumed referral points counter
   */
  uint32 public constant ROLE_REF_POINTS_CONSUMER = 0x00000002;

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
   * @notice Enumeration of all referral points holders
   * @dev Contains all the addresses which earned referral points
   */
  address[] public holders;

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
   * @notice Available referral points counter of a particular address,
   *      referral points available to be spent
   * @dev Calculated as difference between issued points counter and consumed points counter
   * @dev Unsafe, doesn't check for `issued >= consumed` constraint,
   *      relies on proper behaviour of `issued/consumed` update functions
   * @param owner address of the player address to get available referral points for
   * @return available referral points counter for address specified
   */
  function available(address owner) public constant returns (uint256) {
    // calculate difference and return, unsafe
    return issued[owner] - consumed[owner];
  }

  /**
   * @notice ERC20-compatible alias for `available` referral points counter
   */
  function balanceOf(address owner) public constant returns (uint256) {
    // delegate call to `available`
    return available(owner);
  }

  /**
   * @notice Lists all referral points holders addresses
   * @return an array of referral points holders addresses,
   *      doesn't contain duplicates
   */
  function getAllHolders() public constant returns (address[]) {
    // read `holders` array and return
    return holders;
  }

  /**
   * @notice Number of all referral points holders
   * @return length of the referral points holders array
   */
  function getNumberOfHolders() public constant returns (uint256) {
    // read `holders` array length and return
    return holders.length;
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
   * @notice Issues referral points to players addresses
   * @dev This is a bulk version of `issueTo` function
   * @dev Requires sender to have `ROLE_REF_POINTS_ISSUER` permission
   * @param _to array of addresses to issue referral points to
   * @param _amount array of referral points values to issue
   */
  function bulkIssue(address[] _to, uint256[] _amount) public {
    // verify input arrays lengths consistency
    require(_to.length == _amount.length);

    // verify input arrays are not empty
    require(_to.length != 0);

    // iterate over both arrays (they have same size)
    for(uint256 i = 0; i < _to.length; i++) {
      // and issue referral points for each element
      issueTo(_to[i], _amount[i]);
    }
  }

  /**
   * @notice Consumes referral points from players addresses
   * @dev This is a bulk version of `consumeFrom` function
   * @dev Requires sender to have `ROLE_REF_POINTS_CONSUMER` permission
   * @param _from array of addresses to consume referral points from
   * @param _amount array of referral points values to consume
   */
  function bulkConsume(address[] _from, uint256[] _amount) public {
    // verify input arrays lengths consistency
    require(_from.length == _amount.length);

    // verify input arrays are not empty
    require(_from.length != 0);

    // iterate over both arrays (they have same size)
    for(uint256 i = 0; i < _from.length; i++) {
      // and consume referral points for each element
      consumeFrom(_from[i], _amount[i]);
    }
  }

}
