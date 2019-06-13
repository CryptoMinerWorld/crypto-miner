pragma solidity 0.5.8;

import "./PlotAntarctica.sol";

/**
 * @dev Founders Plots Mock, simplest FoundersPlots implementation,
 *      returning 15 plots for any address except zero address
 */
contract FoundersPlotsMock is FoundersPlots {
  /**
   * @dev Dummy implementation returning 15 for all inputs except zero
   *      input which results in zero output
   * @param addr address to query balance for
   * @return 15 if address is not zero, zero otherwise
   */
  function geodeBalances(address addr) external view returns (uint16) {
    // check input and return 15
    return addr == address(0)? 0: 0xF;
  }
}
