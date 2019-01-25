pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./GemERC721.sol";
import "./GoldERC20.sol";
import "./SilverERC20.sol";

/**
 * @title Workshop (Gem Upgrade Smart Contract)
 *
 * @notice Workshop smart contract is responsible for gem leveling/upgrading logic;
 *      usually the gem may be upgrading by spending some gold and silver
 *
 * @dev Workshop acts as role provider (ROLE_LEVEL_PROVIDER) and
 *      grade provider (ROLE_GRADE_PROVIDER) for the gem ERC721 token (GemERC721),
 *      providing an ability to level up and upgrade their gems
 * @dev Workshop acts as a token destroyer (ROLE_TOKEN_DESTROYER)
 *      for the gold and silver ERC20 tokens (GoldERC20 and SilverERC20),
 *      consuming (burning) these tokens when leveling and upgrading gem(s)
 *
 * @author Basil Gorin
 */
contract Workshop is AccessControlLight {
  /**
   * @dev Smart contract version
   * @dev Should be incremented manually in this source code
   *      each time smart contact source code is changed and deployed
   */
  uint32 public constant WORKSHOP_VERSION = 0x1;

  /**
   * @dev Expected version of the deployed GemERC721 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant GEM_TOKEN_VERSION_REQUIRED = 0x3;

  /**
   * @dev Expected version of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant SILVER_TOKEN_VERSION_REQUIRED = 0x1;

  /**
   * @dev Expected version of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant GOLD_TOKEN_VERSION_REQUIRED = 0x10001;

  /**
   * @dev Maximum token level this workshop can level up gem to
   */
  uint8 public constant MAXIMUM_TOKEN_LEVEL = 5;

  /**
   * @dev Maximum token grade type this workshop can upgrade a gem to
   */
  uint8 public constant MAXIMUM_GRADE_TYPE = 6;

  /**
   * @dev Prices of the gem levels 1, 2, 3, 4, 5 accordingly
   * @dev A level up price from level i to level j is calculated
   *      as a difference between level j price and level i price
   */
  uint8[] public LEVEL_PRICES = [0, 5, 20, 65, 200];

  /**
   * @dev Prices of the gem grade types D, C, B, A, AA, AAA accordingly
   * @dev An upgrade price from grade i to grade j is calculated
   *      as a difference between grade j price and grade i price
   * TODO: @dev When upgrading grade value only (for grade AAA only),
   * TODO:      an upgrade price is calculated as from grade AA to AAA
   */
  uint8[] public GRADE_PRICES = [0, 1, 3, 7, 15, 31];

  /**
   * @dev GemERC721 deployed instance to operate on, gems of that instance
   *      may be upgraded using this smart contract deployed instance
   */
  GemERC721 public gemInstance;

  /**
   * @dev GoldERC20 deployed instance to consume silver from, silver of that instance
   *      may be consumed (burnt) from a player in order to level up a gem
   */
  SilverERC20 public silverInstance;

  /**
   * @dev GoldERC20 deployed instance to consume gold from, gold of that instance
   *      may be consumed (burnt) from a player in order to upgrade a gem
   */
  GoldERC20 public goldInstance;

  /**
   * @dev Creates a workshop instance, binding it to gem (ERC721 token),
   *      silver (ERC20 token) and gold (ERC20 token) instances specified
   * @param gemAddress address of the deployed GemERC721 instance with
   *      the `TOKEN_VERSION` equal to `GEM_TOKEN_VERSION_REQUIRED`
   * @param silverAddress address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_TOKEN_VERSION_REQUIRED`
   * @param goldAddress address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_TOKEN_VERSION_REQUIRED`
   */
  constructor(address gemAddress, address silverAddress, address goldAddress) public {
    // verify the inputs (dummy mistakes only)
    require(gemAddress != address(0));
    require(silverAddress != address(0));
    require(goldAddress != address(0));
    require(gemAddress != goldAddress);
    require(silverAddress != goldAddress);

    // bind smart contract instances
    gemInstance = GemERC721(gemAddress);
    silverInstance = SilverERC20(silverAddress);
    goldInstance = GoldERC20(goldAddress);

    // verify smart contract versions
    require(gemInstance.TOKEN_VERSION() == GEM_TOKEN_VERSION_REQUIRED);
    require(silverInstance.TOKEN_VERSION() == SILVER_TOKEN_VERSION_REQUIRED);
    require(goldInstance.TOKEN_VERSION() == GOLD_TOKEN_VERSION_REQUIRED);
  }

  /**
   * @notice Estimates amount of silver and gold to perform an upgrade
   * @dev This function contains same logic as in `upgrade()` and can
   *      be used before calling `upgrade()` externally to check
   *      sender has enough silver and gold to perform the transaction
   * @dev Throws on empty inputs
   * @dev Throws if input arrays differ in size
   * @dev Throws if `tokenIds` contains invalid token IDs
   * @dev Throws if `levelDeltas` contains invalid values, i.e. values
   *      which violate token level constraints (maximum level)
   * @dev Throws if `gradeDeltas` contains invalid values, i.e. values
   *      which violate token grade constraints (maximum grade)
   * @dev Throws if for any token ID in the `tokenIds` array, corresponding
   *      values in `levelDeltas` and `gradeDeltas` (level delta and
   *      grade delta combination) result in no level/grade change for the gem
   * @dev Doesn't check token ID ownership, assuming it is checked
   *      when performing an upgrade transaction itself
   * @param tokenIds an array of valid token IDs to upgrade
   * @param levelDeltas an array of non-zero level deltas, each element
   *      corresponds to an element in tokenIds with the same index
   * @param gradeDeltas an array of non-zero grade deltas, each element
   *      corresponds to an element in tokenIds with the same index
   * @return a tuple of two elements, first represents an amount of
   *      silver required, second – amount of gold required
   */
  function getUpgradePrice(
    uint32[] tokenIds,
    uint8[] levelDeltas,
    uint8[] gradeDeltas
  ) public constant returns(
    uint32 silverRequired, // cumulative silver required
    uint32 goldRequired    // cumulative gold required
  ) {
    // perform rough input validations
    require(tokenIds.length != 0);
    require(tokenIds.length == levelDeltas.length);
    require(tokenIds.length == gradeDeltas.length);

    // iterate the data, validate it and perform calculation
    for(uint256 i = 0; i < tokenIds.length; i++) {
      // extract token ID
      uint32 tokenId = tokenIds[i];

      // get current token level, it also ensures token ID is valid
      uint8 currentLevel = gemInstance.getLevel(tokenId);

      // get current token grade type
      uint8 currentGradeType = gemInstance.getGradeType(tokenId);

      // calculate new level
      uint8 newLevel = currentLevel + levelDeltas[i];

      // calculate new grade type value
      uint8 newGradeType = currentGradeType + gradeDeltas[i];

      // arithmetic overflow check for level
      require(newLevel >= currentLevel);

      // verify maximum level constraint
      require(newLevel <= MAXIMUM_TOKEN_LEVEL);

      // arithmetic overflow check for grade
      require(newGradeType >= currentGradeType);

      // verify maximum grade constraint
      require(newGradeType <= MAXIMUM_GRADE_TYPE);

      // verify the level up / upgrade operation results
      // in the gem's level / grade type / grade value change
      require(newLevel > currentLevel || newGradeType > currentGradeType);

      // calculate silver required value and add it to cumulative value
      silverRequired += LEVEL_PRICES[newLevel - 1] - LEVEL_PRICES[currentLevel - 1];

      // calculate fold required value and add it to the cumulative value
      goldRequired += GRADE_PRICES[newGradeType - 1] - GRADE_PRICES[currentGradeType - 1];

      // TODO: do we need to implement grade value upgrades for AAA gems?
    }

    // return calculated values
    return (silverRequired, goldRequired);
  }

}
