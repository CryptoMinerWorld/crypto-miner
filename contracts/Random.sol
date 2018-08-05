pragma solidity 0.4.23;

/**
 * Library for working with random numbers
 */
library Random {
  /**
   * @dev Extracts a random value in range [offset, offset + length),
   *      from the `randomness` given after applying a `mask`
   * @dev mask - maximum value the `randomness` can have,
   *      for example, if `randomness` is 32-bits long, `mask` = 0xFFFFFFFF,
   *                   if `randomness` is 16-bits long, `mask` = 0xFFFF
   * @param randomness source of randomness
   * @param mask maximum value the `randomness` can have
   * @param offset lower output bound
   * @param length number of possible output values, upper bound is `offset + length - 1`
   * @return random value in range [offset, offset + length)
   */
  function __rndVal(uint256 randomness, uint256 mask, uint256 offset, uint256 length) internal pure returns (uint256) {
    // return random value in range [offset, offset + length)
    return offset + (mask & randomness) * length / (mask + 1);
  }

  /**
   * @dev Generates random value in range [offset, offset + length)
   *      based on the `__rawRandom` as a source of a randomness
   * @dev The random value generated is not cryptographically secure
   *      and may be heavily influenced by miners, but its cheap though
   * @param offset lower output bound
   * @param length number of possible output values, upper bound is `offset + length - 1`
   * @return random value in range [offset, offset + length)
   */
  function __randomValue(uint256 offset, uint256 length) internal constant returns (uint256) {
    // using `__rawRandom` as a source of randomness,
    uint256 randomness = __rawRandom();

    // delegate call to `__rndVal` using only 128 bits of randomness
    return  __rndVal(randomness, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, offset, length);
  }

  /**
   * @dev Generates random value based on keccak256 hash of
   *      * block.difficulty,
   *      * block.number,
   *      * gasleft(),
   *      * msg.data,
   *      * msg.sender,
   *      * msg.value,
   *      * tx.gasprice,
   *      * tx.origin
   * @dev The random value generated is not cryptographically secure
   *      and may be heavily influenced by miners, but its cheap though
   * @return random value – all possible values of uint256
   */
  function __rawRandom() internal constant returns (uint256) {
    // build the keccak256 hash of the transaction dependent values
    bytes32 hash = keccak256(
      block.difficulty,
      block.number,
      gasleft(),
      msg.data,
      msg.sender,
      msg.value,
      tx.gasprice,
      tx.origin
    );
    // and return the result
    return uint256(hash);
  }
}
