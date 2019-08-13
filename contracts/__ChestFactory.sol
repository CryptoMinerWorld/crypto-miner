pragma solidity 0.5.8;

import "./__NowProvider.sol";
import "./ChestFactory.sol";

/**
 * @title Miner Time Test (32 bit)
 *
 * @notice Helper smart contract for tests only, not for release deployment!
 *
 * @author Basil Gorin
 */
contract __ChestFactory is ChestFactory {
  /**
   * @dev NowProvider instance is responsible for providing now32() interface
   */
  __NowProvider public nowProvider;


  /**
   * @dev Creates a treasure chest factory binding it to Founders Chest Key
   *      and Chest Key ERC20 instances specified
   * @param _foundersKey address of the deployed Founders Chest Key ERC20 instance
   * @param _chestKey address of the deployed Chest Key ERC20 instance
   * @param _nowProvider a NowProvider instance address providing now32() interface
   */
  constructor(address _foundersKey, address _chestKey, address _nowProvider) ChestFactory(_foundersKey, _chestKey) public {
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
