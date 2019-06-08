pragma solidity 0.5.8;

/**
 * @title Unix Time Utils
 *
 * @notice Provides functions to simplify work with UNIX dates;
 *      in particular allows to determine current month
 *
 * @notice This library is designed to work in the subset of UNIX Epoch time;
 *      it supports dates from January 1, 2000 till January 19, 2038 03:14:07
 *      and may work correctly up to February 28, 2100 but this is not guaranteed
 *
 * @dev Leap year is defined as divisible by 4 only (div 100, div 400 omitted)
 *
 * @author Basil Gorin
 */
library TimeUtils {

  /**
   * @dev Calculates a one-based index of the current month
   * @dev Month to index correspondence table
   *
   *      Month     | Index
   *      ----------+----------
   *      January   | 1
   *      February  | 2
   *      March     | 3
   *      April     | 4
   *      May       | 5
   *      June      | 6
   *      July      | 7
   *      August    | 8
   *      September | 9
   *      October   | 10
   *      November  | 11
   *      December  | 12
   *
   * @return one-based index of the specified date month
   */
  function monthIndex() internal view returns(uint8) {
    // delegate call to `monthIndexOf` passing current timestamp
    return monthIndexOf(now);
  }

  /**
   * @dev Calculates a one-based index of the month for the
   *      date defined by a unix timestamp provided as an input
   * @dev Month to index correspondence table
   *
   *      Month     | Index
   *      ----------+----------
   *      January   | 1
   *      February  | 2
   *      March     | 3
   *      April     | 4
   *      May       | 5
   *      June      | 6
   *      July      | 7
   *      August    | 8
   *      September | 9
   *      October   | 10
   *      November  | 11
   *      December  | 12
   *
   * @param timestamp unix timestamp representing the date of interest
   * @return one-based index of the specified date month
   */
  function monthIndexOf(uint256 timestamp) internal pure returns(uint8) {
    // Unix timestamp 951868800 seconds or 11017 days
    // is equal to March 1, 2000 12:00:00AM,
    // which is the next second after February 29, 2000 11:59:59PM
    uint32 MAR012000 = 11017 days;

    // Unix timestamp 4107542400 seconds or 47541 days
    // is equal to March 1, 2100 12:00:00 AM
    // which is the next second after February 28, 2100 11:59:59PM
    uint32 MAR012100 = 47541 days;

    // ensure we're in safe bounds for the date unix timestamp
    require(timestamp >= MAR012000 && timestamp < MAR012100);

    // Leap block represents how many seconds there are in
    // 4 full years, one of which is a leap year
    // This block contains 365 + 365 + 365 + 366 = 1461 days,
    // that is 1461 * 24 * 60 * 60 = 126230400 seconds

    // calculate the offset in seconds in a leap block
    uint32 offset = uint32(timestamp - MAR012000) % 1461 days;

    // if we've hit last 29 days in the block – that's a leap february
    if(offset >= 1432 days) {
      // Leap February – 29 days
      return 2;
    }

    // update offset to fit into 1 year block
    offset %= 365 days;

    // now its straightforward, just keep in mind we're starting from March
    if(offset < 31 days) {
      // March - 31 days
      return 3;
    }
    if(offset < 61 days) {
      // April – 30 days
      return 4;
    }
    if(offset < 92 days) {
      // May - 31 days
      return 5;
    }
    if(offset < 122 days) {
      // June - 30 days
      return 6;
    }
    if(offset < 153 days) {
      // July - 31 days
      return 7;
    }
    if(offset < 184 days) {
      // August - 31 days
      return 8;
    }
    if(offset < 214 days) {
      // September - 30 days
      return 9;
    }
    if(offset < 245 days) {
      // October - 31 days
      return 10;
    }
    if(offset < 275 days) {
      // November - 30 days
      return 11;
    }
    if(offset < 306 days) {
      // December - 31 days
      return 12;
    }
    if(offset < 337 days) {
      // January - 31 days
      return 1;
    }

    // 28 days has left - February
    return 2;
  }

}
