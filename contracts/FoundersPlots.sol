pragma solidity 0.4.23;

/**
 * @dev An auxiliary interface to extract single function `geodeBalances` from
 *      Presale/Presale2 smart contracts to allow exchanging geodes to founders'
 *      plots in Antarctica using PlotAntarctica smart contract
 */
interface FoundersPlots {
  /**
   * @dev Given founder's address, returns amount of geodes this founder has
   * @dev This number is equal to number of land plots in Antarctica this
   *      address can get, see `PlotAntarctica`
   * @param addr founder's address
   * @return number of geodes this founder has
   */
  function geodeBalances(address addr) external constant returns (uint16);

}
