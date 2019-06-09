pragma solidity 0.5.8;

/**
 * @dev BalanceOf interface provides a function to query uint256
 *      balance of any address
 */
interface BalanceOf {
  /**
   * @dev Returns the number of items owned by `_owner`.
   * @param _owner Address for whom to query the balance.
   */
  function balanceOf(address _owner) external view returns (uint256);
}

/**
 * @title Balance Proxy
 *
 * @dev BalanceProxy provides a convenient way of queering several
 *    uint256 balances of any address(es) against some other smart contract
 *    address(es) implementing BalanceOf interface
 *
 * @author Basil Gorin
 */
contract BalanceProxy {
  /**
   * @dev Gets an array of balances of the owner specified
   *      against `BalanceOf` instances specified
   * @dev Requires array of instances not to be empty and contain
   *      valid addresses of the `BalanceOf` instances
   * @param instances an array of deployed `BalanceOf`
   * @param owner an address to query balances for
   */
  function balancesOf(address[] memory instances, address owner) public view returns(uint256[] memory) {
    // verify input array is not empty
    require(instances.length != 0);

    // allocate memory for the result
    uint256[] memory balances = new uint256[](instances.length);

    // iterate over instances
    for(uint256 i = 0; i < instances.length; i++) {
      // and fill in the owner balance information for each instance
      balances[i] = BalanceOf(instances[i]).balanceOf(owner);
    }

    // return the result
    return balances;
  }
}
