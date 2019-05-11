pragma solidity 0.4.23;

/**
 * @title Tier Math Library
 *
 * @notice The library helps working with tiers data structure (64-bit integer)
 *
 * @dev 64-bit integer data structure contains:
 *      1. Number of tiers this plot contains (8 bits)
 *      2. Tier structure of the plot (48 bits)
 *          - Tier 1 offset (start of Tier 1), usually zero, 8 bits
 *          - Tier 2 offset (start of Tier 2 / end of Tier 1), 8 bits
 *          - Tier 3 offset (start of Tier 3 / end of Tier 2), 8 bits
 *          - Tier 4 offset (start of Tier 4 / end of Tier 3), 8 bits
 *          - Tier 5 offset (start of Tier 5 / end of Tier 4), 8 bits
 *          - End of Tier 5 (block depth), 8 bits
 *      3. Current mining block index (8 bits)
 * @dev Common number of tiers is:
 *        two for Antarctica,
 *        five for the rest of the world
 * @dev Tier structure of the plot consists of six indexes, pointing
 *      to the end of (n)th tier and beginning of the (n+1)th tier
 * @dev For Antarctica tier 2 points to the end of ice tier, which is also
 *      the end of the entire plot, tier 2, tier 3, tier 4 and tier 5
 *      are equal to 100 in that case
 * @dev For the rest of the world, tier 5 points to the end of the obsidian tier,
 *      which is also the end of the entire plot, tier 5 is equal to 100
 * @dev Current mining block index (also known as offset or depth)
 *      initial value is zero meaning the plot was not mined yet,
 *      value equal to tier 5 end means the block is fully mined
 * @dev Used primarily in PlotERC721 and Miner smart contracts
 *
 * @author Basil Gorin
 */
library TierMath {
  /**
   * @dev Extracts number of tiers from the tiers structure
   *      - 2 for Antarctica, 5 for the rest of the World
   * @param tiers tiers data structure to extract number of tiers from
   * @return number of tiers the data structure defines,
   *      either 2 (Antarctica) or 5 (rest of the World)
   */
  function getNumberOfTiers(uint64 tiers) internal pure returns (uint8) {
    // extract number of tiers value from the tiers data structure and return
    return uint8(tiers >> 56);
  }

  /**
   * @dev Gets the depth of the tier defined by its one-based index:
   *      Tier 1: Dirt / Snow
   *      Tier 2: Clay / Ice
   *      Tier 3: Limestone - non-Antarctica only
   *      Tier 4: Marble - non-Antarctica only
   *      Tier 5: Obsidian - non-Antarctica only
   * @dev Passing index equal to zero returns Tier 1 offset,
   *      which is equal to zero by design
   * @dev Throws if index is too big (bigger than number of tiers)
   * @param tiers tiers data structure to extract depth from
   * @param k one-based tier index to query depth for
   * @return depth of the (k)th tier in blocks
   */
  function getTierDepth(uint64 tiers, uint8 k) internal pure returns (uint8) {
    // get number of tiers for the given tiers structure
    uint8 n = getNumberOfTiers(tiers);

    // ensure requested tier exists
    require(k <= n);

    // extract requested tier depth data from tier structure and return
    return uint8(tiers >> (6 - k) * 8);
  }

  /**
   * @dev Gets the depth of the tier, current mining depth (offset),
   *      and returns the greatest of two
   * @dev Safe to use with big tier index (bigger than number of tiers):
   *      number of tiers will be used instead in that case
   * @param tiers tiers data structure to extract depth from
   * @param k one-based tier index to query depth for
   * @return depth of the (k)th tier in blocks or current offset if its bigger
   */
  function getTierDepthOrMined(uint64 tiers, uint8 k) internal pure returns (uint8) {
    // get number of tiers for the given tiers structure
    uint8 n = getNumberOfTiers(tiers);

    // get tier depth safely, taking into account `k` can be big
    uint8 depth = getTierDepth(tiers, k < n? k: n);

    // get tiers offset
    uint8 offset = getOffset(tiers);

    // return the greatest of two
    return depth < offset? offset: depth;
  }

  /**
   * @dev Gets tier index by block index (offset)
   * @param tiers tiers data structure to evaluate
   * @param offset block offset to query tier index for
   * @return one-based tier index
   */
  function getTierIndex(uint64 tiers, uint8 offset) internal pure returns (uint8) {
    // get number of tiers for the given tiers structure
    uint8 n = getNumberOfTiers(tiers);

    // iterate over all tiers in the plot
    for(uint8 i = 1; i <= n; i++) {
      // check if offset is within current tier bounds
      if(getTierDepth(tiers, i - 1) <= offset && offset < getTierDepth(tiers, i)) {
        // and return the index
        return i;
      }
    }

    // if index was not found return maximum tier index
    return n;
  }

  /**
   * @dev Gets the depth of the tiers data structure, that is
   *      the depth of the deepest tier
   * @param tiers tiers data structure to extract maximum depth from
   * @return tiers depth – the maximum depth value
   */
  function getDepth(uint64 tiers) internal pure returns (uint8) {
    // get number of tiers for the given tiers structure
    uint8 n = getNumberOfTiers(tiers);

    // extract last tier value from the tiers and return
    return uint8(tiers >> (6 - n) * 8);
  }

  /**
   * @dev Gets token offset (a.k.a. depth)
   *      - current mined depth (initially zero)
   * @param tiers tiers data structure to extract offset from
   * @return token offset – current mined depth value
   */
  function getOffset(uint64 tiers) internal pure returns(uint8) {
    // extract the offset value from the tiers and return
    return uint8(tiers);
  }

  /**
   * @dev Verifies if tier structure is fully mined that is
   *      its offset is equal to the depth
   * @param tiers tiers data structure to check
   * @return true if structure is fully mined, false otherwise
   */
  function isFullyMined(uint64 tiers) internal pure returns(bool) {
    // get the offset value, depth value and compare them
    return getOffset(tiers) >= getDepth(tiers);
  }

}
