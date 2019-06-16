pragma solidity 0.5.8;

import "./AccessMultiSig.sol";

contract __NowProvider is AccessMultiSig {
  /**
   * @dev Time manager changes current time (now)
   */
  uint32 public constant ROLE_TIME_MANAGER = 0x00000010;

  /**
   * @dev Hold current time value
   * @dev Initialize with current time stamp
   */
  uint32 private _now32 = uint32(now);

  /**
   * @dev Fired in `incTime()`
   * @param _by operator which executed an inc update
   * @param _to new time value
   */
  event NowUpdated(address indexed _by, uint32 _to);

  /**
   * @dev Increase time by the value specified (seconds)
   * @dev Requires sender to have `ROLE_TIME_MANAGER` permission
   * @param delta duration in seconds to increase time by
   */
  function incTime(uint32 delta) public {
    // verify sender has permission to call the function
    require(isSenderInRole(ROLE_TIME_MANAGER));

    // update now
    _now32 = uint32(now);

    // arithmetic overflow check
    require(_now32 + delta > _now32);

    // time update
    _now32 += delta;

    // emit en event
    emit NowUpdated(msg.sender, _now32);
  }

  /**
   * @dev Override parent `now32` proxy function
   * @return simulated time
   */
  function now32() public view returns(uint32) {
    // read `_now32` and return
    return _now32;
  }
}
