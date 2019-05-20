pragma solidity 0.4.23;

/**
 * @title Math Library
 *
 * @notice
 *
 * @author Basil Gorin
 */
library Math {
  /**
   * @dev Returns the largest of two numbers
   * @param a first integer
   * @param b second integer
   * @return the largest of first and second numbers
   */
  function max(uint256 a, uint256 b) internal pure returns (uint256) {
    // determine the largest number and return it
    return a >= b ? a : b;
  }

  /**
   * @dev Returns the lowest-valued number passed into
   * @param a first integer
   * @param b second integer
   * @return the smallest of first and second numbers
   */
  function min(uint256 a, uint256 b) internal pure returns (uint256) {
    // determine the smallest number and return it
    return a < b ? a : b;
  }
}
