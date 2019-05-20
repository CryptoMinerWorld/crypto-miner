pragma solidity 0.4.23;

import "./Random.sol";

/**
 * @title Random Library Test
 *
 * @dev A proxy smart contract to test Random Library
 *
 * @author basil Gorin
 */
contract RandomTest {
  /**
   * see Random.__rndVal
   */
  function rndVal(uint256 randomness, uint256 mask, uint64 offset, uint64 length) public pure returns (uint256) {
    // delegate call to `Random.__rndVal` and return
    return Random.__rndVal(randomness, mask, offset, length);
  }

  /**
   * see Random.__randomValue
   */
  function randomValue(uint64 offset, uint64 length) public constant returns (uint256) {
    // delegate call to `Random.__randomValue` and return
    return Random.__randomValue(0, offset, length);
  }

  /**
   * see Random.__quadraticRandom
   */
  function quadraticRandom(uint64 offset, uint64 length) internal constant returns (uint256) {
    // delegate call to `Random.__quadraticRandom` and return
    return Random.__quadraticRandom(0, offset, length);
  }

  /**
   * see Random.__rawRandom
   */
  function rawRandom() internal constant returns (uint256) {
    // delegate call to `Random.__rawRandom` and return
    return Random.__rawRandom(0);
  }

  /**
   * @notice Number of different grade values defined for a gem
   * @dev Gem grade value is reassigned each time grade type increases,
   *      grade value is generated as non-uniform random in range [0, GRADE_VALUES)
   */
  uint24 public constant GRADE_VALUES = 1000000;

  /**
   * @dev A function to check `Workshop.randomGradeValue` generation,
   *      see Workshop.randomGradeValue
   * @param n how many grade values to generate
   * @return an array of grade values of length n
   */
  function randomGradeValues(uint32 n, uint32 iterations) public constant returns(uint24[]) {
    // declare a container to store all the generated grades
    uint24[] memory result = new uint24[](n);

    // generate amount of random grade values requested
    for(uint32 i = 0; i < n; i++) {
      // perform `iterations` number of iterations
      for(uint32 j = 0; j < iterations; j++) {
        // generate random using exactly the same logic as in Workshop.randomGradeValue,
        result[i] = uint24(Random.__quadraticRandom(i, result[i], GRADE_VALUES - result[i]));
      }
    }

    // return the result
    return result;
  }
}
