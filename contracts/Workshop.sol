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
   * @notice Enables gem leveling up and grade type upgrades
   * @dev Feature FEATURE_UPGRADES_ENABLED must be enabled to
   *      call the `upgrade()` and `bulkUpgrade()` functions
   */
  uint32 public constant FEATURE_UPGRADES_ENABLED = 0x00000001;

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
   * @dev Fired in upgrade() functions
   * @param tokenId ID of the token which level/grade was modified
   * @param level the level the gem reached after upgrade
   * @param grade the grade (type and value) the gem reached after upgrade
   */
  event UpgradeComplete(uint32 indexed tokenId, uint8 level, uint32 grade);

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
   * @notice Calculates amount of silver required to perform level up
   *      of a particular gem by a level delta specified
   * @dev This function contains same logic as in `upgrade()` and can
   *      be used before calling it externally to check
   *      sender has enough silver to perform the transaction
   * @dev Throws if `tokenId` is invalid (non-existent token)
   * @dev Throws if `levelDelta` is invalid, i.e. violates
   *      token level constraints (maximum level)
   * @dev Doesn't check token ID ownership, assuming it is checked
   *      when performing a level up transaction itself
   * @param tokenId a valid token ID to level up
   * @param levelDelta number of levels to increase token level by
   * @return an amount of silver required to level up the gem
   */
  function getLevelUpPrice(uint32 tokenId, uint8 levelDelta) public constant returns(uint8) {
    // get current token level
    uint8 currentLevel = gemInstance.getLevel(tokenId);

    // calculate new level
    uint8 newLevel = currentLevel + levelDelta;

    // arithmetic overflow check for level
    require(newLevel >= currentLevel);

    // verify maximum level constraint
    require(newLevel <= MAXIMUM_TOKEN_LEVEL);

    // calculate and return the result
    return LEVEL_PRICES[newLevel - 1] - LEVEL_PRICES[currentLevel - 1];
  }

  /**
   * @notice Calculates amount of gold required to perform an upgrade
   *      of the grade of a particular gem by a grade type delta specified
   * @dev This function contains same logic as in `upgrade()` and can
   *      be used before calling it externally to check
   *      sender has enough gold to perform the transaction
   * @dev Throws if `tokenId` is invalid (non-existent token)
   * @dev Throws if `gradeTypeDelta` is invalid, i.e. violates
   *      token grade constraints (maximum grade)
   * @dev Doesn't check token ID ownership, assuming it is checked
   *      when performing an upgrade transaction itself
   * @param tokenId a valid token ID to upgrade grade type for
   * @param gradeTypeDelta number of grades to increase token grade by
   * @return an amount of gold required to upgrade the gem
   */
  function getUpgradePrice(uint32 tokenId, uint8 gradeTypeDelta) public constant returns(uint8) {
    // get current token grade type
    uint8 currentGradeType = gemInstance.getGradeType(tokenId);

    // calculate new grade type value
    uint8 newGradeType = currentGradeType + gradeTypeDelta;

    // arithmetic overflow check for grade
    require(newGradeType >= currentGradeType);

    // verify maximum grade constraint
    require(newGradeType <= MAXIMUM_GRADE_TYPE);

    // calculate and return the result
    return GRADE_PRICES[newGradeType - 1] - GRADE_PRICES[currentGradeType - 1];
  }

  /**
   * @notice Levels up and/or upgrades a particular gem
   * @dev Increases gem's level and/or grade type by the values specified
   * @dev Throws if `tokenId` is invalid (non-existent token)
   * @dev Throws if `levelDelta` is invalid, i.e. violates
   *      token level constraints (maximum level)
   * @dev Throws if `gradeTypeDelta` is invalid, i.e. violates
   *      token grade constraints (maximum grade)
   * @dev Throws if `levelDelta` and `gradeTypeDelta` (level delta and
   *      grade delta combination) result in no level/grade change for the gem
   *      (ex.: both `levelDelta` and `gradeTypeDelta` are zero)
   * @dev Requires transaction sender to be an owner of the gem
   * @dev Throws if token owner (transaction sender) has not enough
   *      gold and/or silver on the balance
   * @dev Consumes gold and/or silver on success, amounts can be
   *      calculated using `getLevelUpPrice()` and `getUpgradePrice()` functions
   * @param tokenId ID of the gem to level up / upgrade
   * @param levelDelta number of levels to increase token level by
   * @param gradeTypeDelta number of grades to increase token grade by
   */
  function upgrade(uint32 tokenId, uint8 levelDelta, uint8 gradeTypeDelta) public {
    // verify that upgrades are enabled
    require(isFeatureEnabled(FEATURE_UPGRADES_ENABLED));

    // delegate call to `__upgrade`
    __upgrade(tokenId, levelDelta, gradeTypeDelta);
  }

  /**
   * @notice Calculates an amount of silver and gold required to perform an upgrade
   * @dev This function contains same logic as in `bulkUpgrade()` and can
   *      be used before calling it externally to check
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
  function getBulkUpgradePrice(
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
      // get amount of silver required to level up the gem
      uint8 silverDelta = getLevelUpPrice(tokenIds[i], levelDeltas[i]);

      // get amount of gold required to upgrade the gem
      uint8 goldDelta = getUpgradePrice(tokenIds[i], gradeDeltas[i]);

      // verify the level up / upgrade operation results
      // in the gem's level / grade change:
      // verify at least one of the prices is not zero
      require(silverDelta != 0 || goldDelta != 0);

      // calculate silver required value and add it to cumulative value
      silverRequired += silverDelta;

      // calculate fold required value and add it to the cumulative value
      goldRequired += goldDelta;

      // TODO: do we need to implement grade value upgrades for AAA gems?
    }

    // return calculated values
    return (silverRequired, goldRequired);
  }

  /**
   * @notice Levels up and/or upgrades several gems in single transaction (bulk mode)
   * @dev Increases all gem's level and/or grade type in the
   *      array specified by the values specified in corresponding input arrays
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
   * @dev Requires transaction sender to be an owner of all the gems
   * @dev Throws if token owner (transaction sender) has not enough
   *      gold and/or silver on the balance
   * @dev Consumes gold and/or silver on success, amounts can be
   *      calculated using `getBulkUpgradePrice()` function
   * @param tokenIds an array of valid token IDs to upgrade
   * @param levelDeltas an array of non-zero level deltas, each element
   *      corresponds to an element in tokenIds with the same index
   * @param gradeDeltas an array of non-zero grade deltas, each element
   *      corresponds to an element in tokenIds with the same index
   */
  function bulkUpgrade(uint32[] tokenIds, uint8[] levelDeltas, uint8[] gradeDeltas) public {
    // verify that upgrades are enabled
    require(isFeatureEnabled(FEATURE_UPGRADES_ENABLED));

    // perform input array lengths validations
    require(tokenIds.length != 0);
    require(tokenIds.length == levelDeltas.length);
    require(tokenIds.length == gradeDeltas.length);

    // iterate the data and perform an upgrade
    for(uint256 i = 0; i < tokenIds.length; i++) {
      // perform an individual gem upgrade
      __upgrade(tokenIds[i], levelDeltas[i], gradeDeltas[i]);
    }
  }

  /**
   * @notice Levels up and/or upgrades a particular gem
   * @dev Increases gem's level and/or grade type by the values specified
   * @dev Throws if `tokenId` is invalid (non-existent token)
   * @dev Throws if `levelDelta` is invalid, i.e. violates
   *      token level constraints (maximum level)
   * @dev Throws if `gradeTypeDelta` is invalid, i.e. violates
   *      token grade constraints (maximum grade)
   * @dev Throws if `levelDelta` and `gradeTypeDelta` (level delta and
   *      grade delta combination) result in no level/grade change for the gem
   *      (ex.: both `levelDelta` and `gradeTypeDelta` are zero)
   * @dev Requires transaction sender to be an owner of the gem
   * @dev Throws if token owner (transaction sender) has not enough
   *      gold and/or silver on the balance
   * @dev Consumes gold and/or silver on success, amounts can be
   *      calculated using `getLevelUpPrice()` and `getUpgradePrice()` functions
   * @dev Private, doesn't check if FEATURE_UPGRADES_ENABLED feature is enabled
   * @param tokenId ID of the gem to level up / upgrade
   * @param levelDelta number of levels to increase token level by
   * @param gradeTypeDelta number of grades to increase token grade by
   */
  function __upgrade(uint32 tokenId, uint8 levelDelta, uint8 gradeTypeDelta) private {
    // ensure token is owned by the sender, it also ensures token exists
    require(gemInstance.ownerOf(tokenId) == msg.sender);

    // get amount of silver required to level up the gem
    uint8 silverRequired = getLevelUpPrice(tokenId, levelDelta);

    // get amount of gold required to upgrade the gem
    uint8 goldRequired = getUpgradePrice(tokenId, gradeTypeDelta);

    // verify the level up / upgrade operation results
    // in the gem's level / grade change:
    // verify at least one of the prices is not zero
    require(silverRequired != 0 || goldRequired != 0);

    // if level up is requested
    if(silverRequired != 0) {
      // burn amount of silver required
      silverInstance.burn(msg.sender, silverRequired);

      // and perform a level up
      for(uint256 i = 0; i < levelDelta; i++) {
        // increment gem level by 1
        gemInstance.levelUp(tokenId);
      }
    }

    // if grade type upgrade is requested
    if(goldRequired != 0) {
      // burn amount of gold required
      goldInstance.burn(msg.sender, goldRequired);

      // perform token grade type upgrade
      gemInstance.upgradeGrade(tokenId, uint32(gemInstance.getGradeType(tokenId) + gradeTypeDelta) << 24); // TODO: generate random grade value
    }

    // emit an event
    emit UpgradeComplete(tokenId, gemInstance.getLevel(tokenId), gemInstance.getGrade(tokenId));
  }

}
