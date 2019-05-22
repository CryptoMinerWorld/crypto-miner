pragma solidity 0.5.8;

/**
 * @title Fractions 8-bit Library
 *
 * @notice Library for working with fractions.
 *
 * @notice A fraction is represented by two numbers - nominator and denominator.
 *
 * @dev A fraction is represented as uint8,
 *      higher 4 bits representing nominator
 *      and lower 4 bits representing denominator
 *
 * @author Basil Gorin
 */
library Fractions8 {
  /**
   * @dev Creates proper fraction with nominator < denominator
   * @dev Throws if nominator is equal or greater then denominator
   * @dev Throws if denominator is zero
   * @dev Throws if nominator doesn't fit into low 4 bits
   * @dev Throws if denominator doesn't fit into low 4 bits
   * @param n fraction nominator, only low 4 bits must be set
   * @param d fraction denominator, only low 4 bits must be set
   * @return fraction with nominator and denominator specified
   */
  function createProperFraction8(uint8 n, uint8 d) internal pure returns (uint8) {
    // nominator and denominator overflow checks
    require(n < 32 && d < 32);

    // denominator cannot be zero by the definition of division
    require(d != 0);

    // fraction has to be proper
    require(n < d);

    // construct fraction and return
    return n << 4 | d;
  }

  /**
   * @dev Converts a proper fraction to its percent representation,
   *      rounding down the value. For example,
   *        toPercent(1/10) is 10,
   *        toPercent(17/30) is 56,
   *        toPercent(1/30) is 3
   *        toPercent(19/31) is 61
   * @dev Supports proper fractions and 'one' (nominator equal to denominator),
   *      which is equal to 100%
   * @dev Throws if nominator is bigger than denominator
   * @param f positive proper fraction
   * @return a value in a range [0..100]
   */
  function toPercent(uint8 f) internal pure returns(uint8) {
    // extract nominator and denominator
    uint8 nominator = getNominator(f);
    uint8 denominator = getDenominator(f);

    // for a fraction representing one just return 100%
    if(nominator == denominator) {
      // one is 100%
      return 100;
    }

    // next section of code is for proper fractions only
    require(nominator < denominator);

    // since fraction is proper one it safe to perform straight forward calculation
    // the only thing to worry - possible arithmetic overflow
    // 100 * 31 = 3100 which doesn't fit in uint8, but fits in uint16
    return uint8(100 * uint16(nominator) / denominator);
  }

  /**
   * @dev Checks if a fraction represents zero (nominator is zero)
   * @param f a fraction
   * @return true if fraction is zero (nominator is zero), false otherwise
   */
  function isZero(uint8 f) internal pure returns(bool) {
    // just check if the nominator is zero
    return getNominator(f) == 0;
  }

  /**
   * @dev Checks if a fraction represents one (nominator is equal to denominator)
   * @param f a fraction
   * @return true if fraction is one (nominator is equal to denominator), false otherwise
   */
  function isOne(uint8 f) internal pure returns(bool) {
    // just check if the nominator is equal to denominator
    return getNominator(f) == getDenominator(f);
  }

  /**
   * @dev Checks if a fraction is proper (nominator is less than denominator)
   * @param f a fraction
   * @return true if fraction is proper (nominator is less than denominator), false otherwise
   */
  function isProper(uint8 f) internal pure returns(bool) {
    // just check that nominator is less than denominator
    // this automatically ensures denominator is not zero
    return getNominator(f) < getDenominator(f);
  }

  /**
   * @dev Extracts 4-bits fraction nominator
   * @param f a fraction
   * @return nominator
   */
  function getNominator(uint8 f) internal pure returns(uint8) {
    // return high 4 bits
    return f >> 4;
  }

  /**
   * @dev Extracts 4-bits fraction denominator
   * @param f a fraction
   * @return denominator
   */
  function getDenominator(uint8 f) internal pure returns(uint8) {
    // return low 4 bits
    return f & 0xF;
  }

  /**
   * @dev Multiplies a proper fraction by integer, the resulting integer is rounded down
   * @param f a fraction
   * @param by an integer to multiply fraction by
   * @return result of multiplication `f * by`
   */
  function multiplyByInteger(uint8 f, uint256 by) internal pure returns(uint256) {
    // extract nominator and denominator
    uint8 nominator = getNominator(f);
    uint8 denominator = getDenominator(f);

    // for a fraction representing one just return `by`
    if(nominator == denominator) {
      // the result of multiplication by one is the value itself
      return by;
    }

    // next section of code is for proper fractions only
    require(nominator < denominator);

    // for values small enough multiplication is straight forward
    if(by == uint248(by)) {
      // ensure the maximum precision of calculation
      return by * nominator / denominator;
    }

    // for big values we perform division first, loosing the precision
    return by / denominator * nominator;
  }
}
