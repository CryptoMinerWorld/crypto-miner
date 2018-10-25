pragma solidity 0.4.23;

/**
 * @notice Library for working with fractions.
 * @notice A fraction is represented by two numbers - nominator and denominator.
 */
library Fractions16 {
  /// @dev 16-bit structure representing proper fraction
  struct Fraction16 {
    // natural nominator, natural positive number including zero
    uint8 nominator;
    // natural denominator, natural positive number excluding zero
    uint8 denominator;
  }

  /**
   * @dev Creates proper fraction with nominator < denominator
   * @dev Throws if nominator is equal or greater then denominator
   * @dev Throws if denominator is zero
   * @param n fraction nominator
   * @param d fraction denominator
   * @return fraction with nominator and denominator specified
   */
  function createProperFraction16(uint8 n, uint8 d) internal pure returns (Fraction16) {
    // denominator cannot be zero by the definition of division
    require(d != 0);

    // fraction has to be proper
    require(n < d);

    // construct fraction and return
    return Fraction16(n, d);
  }

  /**
   * @dev Converts a proper fraction to its percent representation,
   *      rounding down the value. For example,
   *        toPercent(1/10) is 10,
   *        toPercent(37/100) is 37,
   *        toPercent(37/1000) is 3
   *        toPercent(19/37) is 51
   * @dev Supports proper fractions and 'one' (nominator equal to denominator),
   *      which is equal to 100%
   * @dev Throws if nominator is bigger than denominator
   * @param f positive proper fraction
   * @return a value in a range [0..100]
   */
  function toPercent(Fraction16 f) internal pure returns(uint8) {
    // for a fraction representing one just return 100%
    if(f.nominator == f.denominator) {
      // one is 100%
      return 100;
    }

    // next section of code is for proper fractions only
    require(f.nominator < f.denominator);

    // since fraction is proper one it safe to perform straight forward calculation
    // the only thing to worry - possible arithmetic overflow
    return uint8(100 * uint16(f.nominator) / f.denominator);
  }

  /**
   * @dev Checks if a fraction represents zero (nominator is zero)
   * @param f a fraction
   * @return true if fraction is zero (nominator is zero), false otherwise
   */
  function isZero(Fraction16 f) internal pure returns(bool) {
    // just check if the nominator is zero
    return f.nominator == 0;
  }

  /**
   * @dev Checks if a fraction represents one (nominator is equal to denominator)
   * @param f a fraction
   * @return true if fraction is one (nominator is equal to denominator), false otherwise
   */
  function isOne(Fraction16 f) internal pure returns(bool) {
    // just check if the nominator is equal to denominator
    return f.nominator == f.denominator;
  }

  /**
   * @dev Checks if a fraction is proper (nominator is less than denominator)
   * @param f a fraction
   * @return true if fraction is proper (nominator is less than denominator), false otherwise
   */
  function isProper(Fraction16 f) internal pure returns(bool) {
    // just check that nominator is less than denominator
    // this automatically ensures denominator is not zero
    return f.nominator < f.denominator;
  }

  /**
   * @dev Extracts fraction nominator
   * @param f a fraction
   * @return nominator
   */
  function getNominator(Fraction16 f) internal pure returns(uint8) {
    return f.nominator;
  }

  /**
   * @dev Extracts fraction denominator
   * @param f a fraction
   * @return denominator
   */
  function getDenominator(Fraction16 f) internal pure returns(uint8) {
    return f.denominator;
  }

  /**
   * @dev Multiplies a proper fraction by integer, the resulting integer is rounded down
   * @param f a fraction
   * @param by an integer to multiply fraction by
   * @return result of multiplication `f * by`
   */
  function multiplyByInteger(Fraction16 f, uint256 by) internal pure returns(uint256) {
    // for a fraction representing one just return `by`
    if(f.nominator == f.denominator) {
      // the result of multiplication by one is the value itself
      return by;
    }

    // next section of code is for proper fractions only
    require(f.nominator < f.denominator);

    // for values small enough multiplication is straight forward
    if(by == uint240(by)) {
      // ensure the maximum precision of calculation
      return by * f.nominator / f.denominator;
    }

    // for big values we perform division first, loosing the precision
    return by / f.denominator * f.nominator;
  }
}
