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
  function __rndVal(uint256 randomness, uint256 mask, uint64 offset, uint64 length) internal pure returns (uint256) {
    // return random value in range [offset, offset + length)
    return offset + (mask & randomness) * length / (mask + 1);
  }

  /**
   * @dev Generates random value in range [offset, offset + length)
   *      based on the `__rawRandom` as a source of a randomness
   * @dev The value generated is uniformly distributed random
   * @dev The random value generated is not cryptographically secure
   *      and may be heavily influenced by miners, but its cheap though
   * @param seed a number to be added as a parameter to keccak256,
   *      can be zero (zero can be used as some default value)
   * @param offset lower output bound
   * @param length number of possible output values, upper bound is `offset + length - 1`
   * @return random value in range [offset, offset + length)
   */
  function __randomValue(uint256 seed, uint64 offset, uint64 length) internal constant returns (uint256) {
    // using `__rawRandom` as a source of randomness,
    uint256 randomness = __rawRandom(seed);

    // delegate call to `__rndVal` using only 128 bits of randomness
    return  __rndVal(randomness, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, offset, length);
  }

  /**
   * @dev Generates random value in range [offset, offset + length)
   *      based on the `__rawRandom` as a source of a randomness
   * @dev The value generated is not uniformly distributed random
   * @dev The random value generated is not cryptographically secure
   *      and may be heavily influenced by miners, but its cheap though
   * @param seed a number to be added as a parameter to keccak256,
   *      can be zero (zero can be used as some default value)
   * @param offset lower output bound
   * @param length number of possible output values, upper bound is `offset + length - 1`
   * @return random value in range [offset, offset + length)
   */
  function __quadraticRandom(uint256 seed, uint64 offset, uint64 length) internal constant returns (uint256) {
    // using `__rawRandom` as a source of randomness,
    uint256 randomness = __rawRandom(seed);

    // extract first uniformly distributed random, using 64 bits of randomness
    uint128 p1 = uint64(randomness);

    // extract second uniformly distributed random, using next 64 bits of randomness
    uint128 p2 = uint64(randomness >> 128);

    // calculate the result using `__rndVal`
    return __rndVal(p1 * p2, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF, offset, length);
  }

  /**
   * @dev Generates random value based on keccak256 hash of
   *      * seed
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
   * @param seed a number to be added as a parameter to keccak256,
   *      can be zero (zero can be used as some default value)
   * @return random value – all possible values of uint256
   */
  function __rawRandom(uint256 seed) internal constant returns (uint256) {
    // build the keccak256 hash of the transaction dependent values
    bytes32 hash = keccak256(
      seed,
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
