pragma solidity 0.5.8;

import "./__NowProvider.sol";
import "./Miner.sol";

/**
 * @title Miner Time Test (32 bit)
 *
 * @notice Helper smart contract for tests only, not for release deployment!
 *
 * @author Basil Gorin
 */
contract __Miner is Miner {
  /**
   * @dev NowProvider instance is responsible for providing now32() interface
   */
  __NowProvider public nowProvider;

  /**
   * @dev Creates a Miner instance, binding it to GemERC721, PlotERC721,
   *      ArtifactERC721, SilverERC20, GoldERC20, ArtifactERC20,
   *      FoundersKeyERC20, ChestKeyERC20 token instances specified
   * @param _gem address of the deployed GemERC721 instance with
   *      the `TOKEN_VERSION` equal to `GEM_UID_REQUIRED`
   * @param _plot address of the deployed PlotERC721 instance with
   *      the `TOKEN_UID` equal to `PLOT_UID_REQUIRED`
   * @param _artifact address of the deployed ArtifactERC721 instance with
   *      the `TOKEN_UID` equal to `ARTIFACT_UID_REQUIRED`
   * @param _silver address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_UID_REQUIRED`
   * @param _gold address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_UID_REQUIRED`
   * @param _artifactErc20 address of the deployed ArtifactERC20 instance with
   *      the `TOKEN_UID` equal to `ARTIFACT20_UID_REQUIRED`
   * @param _foundersKey address of the deployed FoundersKeyERC20 instance with
   *      the `TOKEN_UID` equal to `FOUNDERS_KEY_UID_REQUIRED`
   * @param _chestKey address of the deployed ChestKeyERC20 instance with
   *      the `TOKEN_UID` equal to `CHEST_KEY_UID_REQUIRED`
   * @param _nowProvider a NowProvider instance address providing now32() interface
   */
  constructor(
    address _gem,
    address _plot,
    address _artifact,
    address _silver,
    address _gold,
    address _artifactErc20,
    address _foundersKey,
    address _chestKey,
    address _nowProvider
  ) Miner (_gem, _plot, _artifact, _silver, _gold, _artifactErc20, _foundersKey, _chestKey) public {
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
