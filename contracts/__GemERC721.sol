pragma solidity 0.5.8;

import "./__NowProvider.sol";
import "./GemERC721.sol";

/**
 * @title GemERC721 Time Test (32 bit)
 *
 * @notice Helper smart contract for tests only, not for release deployment!
 *
 * @author Basil Gorin
 */
contract __GemERC721 is GemERC721 {
  /**
   * @dev NowProvider instance is responsible for providing now32() interface
   */
  __NowProvider public nowProvider;

  /**
   * @param _nowProvider a NowProvider instance address providing now32() interface
   */
  constructor(address _nowProvider) GemERC721() public {
    // initialize NowProvider
    nowProvider = __NowProvider(_nowProvider);
  }

  /**
   * @dev Override parent `now32` proxy function
   * @return simulated time
   */
  function now32() public view returns(uint32) {
    // delegate call to NowProvider
    return nowProvider.now32();
  }
}
