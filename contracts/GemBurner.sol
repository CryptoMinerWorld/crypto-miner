pragma solidity 0.5.8;

import "./GemERC721.sol";
import "./SilverERC20.sol";

/**
 * @title Gem Burner
 *
 * @notice Gem Burner allows exchanging unused gems to Silver or Gold
 *
 * @notice The exchange rate is
 *      To get Silver:
 *        4 level 1 gems => 1,100 Silver
 *        4 level 2 gems => 2,800 Silver
 *        4 level 3 gems => 7,700 Silver
 *        4 level 4 gems => 20,000 Silver
 *        4 level 5 gems => 80,000 Silver
 *      To get Gold:
 *        4 grade D gems => 1 Gold
 *        4 grade C gems => 2 Gold
 *        4 grade B gems => 4 Gold
 *        4 grade A gems => 9 Gold
 *        4 grade AA gems => 33 Gold
 *        4 grade AAA gems => 69 Gold
 *      The exchange rate may be changed by contract manager(s).
 *
 * @dev Once exchanged, the gems stay in the ownership of the smart contract forever,
 *      which technically equivalent to the gems destruction
 * @dev We use term Gem Burner to emphasize that
 *
 * @author Basil Gorin
 */
contract GemBurner is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant BURNER_UID = 0xe7a5cb973b199eab508a709d187fbe2607ebc47965d41e79199b16b916122012;

  /**
   * @dev Expected version (UID) of the deployed GemERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GEM_UID_REQUIRED = 0x8012342b1b915598e6a8249110cd9932d7ee7ae8a8a3bbb3a79a5a545cefee72;

  /**
   * @dev Expected version (UID) of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant SILVER_UID_REQUIRED = 0xd2ed13751444fdd75b1916ee718753f38af6537fca083868a151de23e07751af;

  /**
   * @dev Expected version (UID) of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GOLD_UID_REQUIRED = 0xfaa04f5eafa80e0f8b560c49d4dffb3ca7e34fd289606af21700ba5685db87bc;

  /**
   * @notice Enables gem trading for silver
   * @dev Feature FEATURE_SILVER_TRADE_ENABLED must be enabled to
   *      call the `tradeForSilver()` function
   */
  uint32 public constant FEATURE_SILVER_TRADE_ENABLED = 0x00000001;

  /**
   * @notice Enables gem trading for gold
   * @dev Feature FEATURE_GOLD_TRADE_ENABLED must be enabled to
   *      call the `tradeForGold()` function
   */
  uint32 public constant FEATURE_GOLD_TRADE_ENABLED = 0x00000002;

  /**
   * @notice Exchange rate manager is responsible for changing the exchange rates
   * @dev Role ROLE_EX_RATE_MANAGER allows modifying the `silverExData` and `goldExData`
   *      data structures via `updateSilverExData`, `updateGoldExData`
   *      and `updateSilverAndGoldExData` functions
   */
  uint32 public constant ROLE_EX_RATE_MANAGER = 0x00000001;

  /**
   * @dev GemERC721 deployed instance to operate on, gems of that instance
   *      may be consumed (transferred) to the burner (this) smart contract
   */
  GemERC721 public gemInstance;

  /**
   * @dev GoldERC20 deployed instance to create silver of, silver of that instance
   *      may be created (minted) to a player in exchange for the gems
   */
  SilverERC20 public silverInstance;

  /**
   * @dev GoldERC20 deployed instance to create gold of, gold of that instance
   *      may be created (minted) to a player in exchange for the gems
   */
  GoldERC20 public goldInstance;

  /**
   * @dev Silver Exchange Data structure represents silver exchange rates.
   *      It contains an array of five elements, each element containing
   *      amount of silver (low 20 bits) to be given for
   *      an amount of gems (high 4 bits).
   *      Array index represents gem level (index + 1).
   */
  uint24[5] private silverExData = [
    0x40044C, // 1,100 (0x44C) silver for 4 level 1 (index 0) gems
    0x400AF0, // 2,800 (0xAF0) silver for 4 level 2 (index 1) gems
    0x401E14, // 7,700 (0x1E14) silver for 4 level 3 (index 2) gems
    0x404E20, // 20,000 (0x4E20) silver for 4 level 4 (index 3) gems
    0x413880 // 80,000 (0x13880) silver for 4 level 5 (index 4) gems
  ];

  /**
   * @dev Gold Exchange Data structure represents gold exchange rates.
   *      It contains an array of six elements, each element containing
   *      amount of gold (low 8 bits) to be given for
   *      an amount of gems (high 8 bits).
   *      Array index represents gem grade (index + 1).
   */
  uint16[6] private goldExData = [
    0x0401, // 1 gold for 4 grade D (index 0) gems
    0x0402, // 2 gold for 4 grade C (index 1) gems
    0x0404, // 4 gold for 4 grade B (index 2) gems
    0x0409, // 9 gold for 4 grade A (index 3) gems
    0x0421, // 33 (0x21) gold for 4 grade AA (index 4) gems
    0x0445 // 69 (0x45) gold for 4 grade AAA (index 5) gems
  ];

  event SilverExDataUpdated(address indexed _by, uint24[5] valueFrom, uint24[5] valueTo);
  event GoldExDataUpdated(address indexed _by, uint16[6] valueFrom, uint16[6] valueTo);
  event TradedForSilver(address indexed _by, uint32 silverMinted, uint24[] gemsConsumed);
  event TradedForGold(address indexed _by, uint32 goldMinted, uint24[] gemsConsumed);

  /**
   * @dev Creates a gem burner instance, binding it to gem (ERC721 token),
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

    // bind smart contract instances
    gemInstance = GemERC721(gemAddress);
    silverInstance = SilverERC20(silverAddress);
    goldInstance = GoldERC20(goldAddress);

    // verify smart contract versions
    require(gemInstance.TOKEN_UID() == GEM_UID_REQUIRED);
    require(silverInstance.TOKEN_UID() == SILVER_UID_REQUIRED);
    require(goldInstance.TOKEN_UID() == GOLD_UID_REQUIRED);
  }

  /**
   * @dev Auxiliary function to update silverExData
   * @dev Requires transaction sender to have exchange rate manager permission
   * @param _silverExData new value for silverExData
   */
  function updateSilverExData(uint24[5] memory _silverExData) public {
    // verify message sender has a permission to change the exchange rates
    require(isSenderInRole(ROLE_EX_RATE_MANAGER));

    // fire an event
    emit SilverExDataUpdated(msg.sender, silverExData, _silverExData);

    // update the silver exchange data
    silverExData = _silverExData;
  }

  /**
   * @dev Auxiliary function to update goldExData
   * @dev Requires transaction sender to have exchange rate manager permission
   * @param _goldExData new value for goldExData
   */
  function updateGoldExData(uint16[6] memory _goldExData) public {
    // verify message sender has a permission to change the exchange rates
    require(isSenderInRole(ROLE_EX_RATE_MANAGER));

    // fire an event
    emit GoldExDataUpdated(msg.sender, goldExData, _goldExData);

    // update the silver exchange data
    goldExData = _goldExData;
  }

  /**
   * @dev Auxiliary function to update both silverExData and goldExData
   * @dev Requires transaction sender to have exchange rate manager permission
   * @param _silverExData new value for silverExData
   * @param _goldExData new value for goldExData
   */
  function updateSilverAndGoldExData(uint24[5] memory _silverExData, uint16[6] memory _goldExData) public {
    // delegate call to `updateSilverExData`
    updateSilverExData(_silverExData);

    // delegate call to `updateGoldExData`
    updateGoldExData(_goldExData);
  }

  /**
   * @dev Auxiliary function to retrieve silver exchange rate that is
   *      how many silver can be exchanged for how many gems of the level specified
   * @param level gems level to read data for
   * @return a tuple containing amount of gems and amount of silver
   */
  function getSilverExRate(uint8 level) public view returns(uint8, uint24) {
    // load the data into tuple and return
    return (uint8(silverExData[level  - 1] >> 20), silverExData[level - 1] & 0x0FFFFF);
  }

  /**
   * @dev Auxiliary function to retrieve gold exchange rate that is
   *      how many gold can be exchanged for how many gems of the grade type specified
   * @param gradeType gems grade type to read data for
   * @return a tuple containing amount of gems and amount of gold
   */
  function getGoldExRate(uint8 gradeType) public view returns(uint8, uint24) {
    // load the data into tuple and return
    return (uint8(goldExData[gradeType - 1] >> 8), uint8(goldExData[gradeType - 1]));
  }

  /**
   * @notice Evaluates amount of silver one can get in exchange for the gems specified
   *
   * @dev This function performs all the safety checks and can be used safely from other functions
   * @dev Throws if number of the gems submitted is not multiple of 4 (configurable) or is empty
   * @dev Throws if number of the gems submitted is bigger than 65,535
   * @dev Throws if ids of the gems submitted are not sorted ascending
   * @dev Throws if ids of the gems submitted contain duplicates
   * @dev Throws if the gems have different level
   * @dev Throws if exchange rate for the gems level is undefined
   *
   * @param gemIds an array containing IDs of the gems to consume, sorted ascending, with no duplicates
   * @return amount of silver to be minted in return for the gems submitted
   */
  function evalSilver(uint24[] memory gemIds) public view returns(uint32) {
    // determine gems level, this will throw if array is empty
    uint8 level = gemInstance.getLevel(gemIds[0]);

    // load exchange rate data: how many gems we consume and how much silver we issue
    uint8 gemsPerBucket;
    uint24 silverPerBucket;
    (gemsPerBucket, silverPerBucket) = getSilverExRate(level);

    // verify number of gems submitted fits into uint16 (65,535)
    require(gemIds.length < 0x10000);

    // verify submitted amount of gems is multiple of 4 (configurable)
    require(gemIds.length % gemsPerBucket == 0);

    // verify no duplicates and all levels are the same
    for(uint256 i = 1; i < gemIds.length; i++) {
      // ensure `ids` arrays is sorted ascending and contains no duplicates
      require(gemIds[i] > gemIds[i - 1]);

      // ensure all gems have same level
      require(gemInstance.getLevel(gemIds[i]) == level);
    }

    // calculate the result
    return uint32(gemIds.length / gemsPerBucket * silverPerBucket);
  }

  /**
   * @notice Evaluates amount of gold one can get in exchange for the gems specified
   *
   * @dev This function performs all the safety checks and can be used safely from other functions
   * @dev Throws if number of the gems submitted is not multiple of 4 (configurable) or is empty
   * @dev Throws if number of the gems submitted is bigger than 65,535
   * @dev Throws if ids of the gems submitted are not sorted ascending
   * @dev Throws if ids of the gems submitted contain duplicates
   * @dev Throws if the gems have different grade type
   * @dev Throws if exchange rate for the gems grade type is undefined
   *
   * @param gemIds an array containing IDs of the gems to consume, sorted ascending, with no duplicates
   * @return amount of gold to be minted in return for the gems submitted
   */
  function evalGold(uint24[] memory gemIds) public view returns(uint32) {
    // determine gems grade type, this will throw if array is empty
    uint8 gradeType = gemInstance.getGradeType(gemIds[0]);

    // load exchange rate data: how many gems we consume
    uint8 gemsPerBucket = uint8(goldExData[gradeType - 1] >> 8);

    // verify number of gems submitted fits into uint16 (65,535)
    require(gemIds.length < 0x10000);

    // verify submitted amount of gems is multiple of 4 (configurable)
    require(gemIds.length % gemsPerBucket == 0);

    // verify no duplicates and all grade types are the same
    for(uint256 i = 1; i < gemIds.length; i++) {
      // ensure `ids` arrays is sorted ascending and contains no duplicates
      require(gemIds[i] > gemIds[i - 1]);

      // ensure all gems have same grade type
      require(gemInstance.getGradeType(gemIds[i]) == gradeType);
    }

    // load exchange rate data: how many silver we issue per `gemsPerBucket`
    uint8 goldPerBucket = uint8(goldExData[gradeType - 1]);

    // calculate the result
    return uint32(gemIds.length / gemsPerBucket * goldPerBucket);
  }

  /**
   * @notice Transfers specified gems from the owner forever.
   *      Mints some amount of silver in return.
   *      Can be called by the gems owner only.
   * @notice Use `evalSilver` function to evaluate amount of silver to be minted
   *
   * @dev Throws if number of the gems submitted is not multiple of 4 (configurable) or is empty
   * @dev Throws if number of the gems submitted is bigger than 65,535
   * @dev Throws if ids of the gems submitted are not sorted ascending
   * @dev Throws if ids of the gems submitted contain duplicates
   * @dev Throws if the gems have different level
   * @dev Throws if exchange rate for the gems level is undefined
   * @dev Throws if the gems belong to an account different from sender's account
   * @dev Throws if gems owner didn't authorise the transfer via ERC721.approve or ERC721.setApprovalForAll
   * @dev Requires `FEATURE_SILVER_TRADE_ENABLED` to be enabled
   *
   * @param gemIds an array containing IDs of the gems to transfer, sorted ascending, with no duplicates
   */
  function tradeForSilver(uint24[] memory gemIds) public {
    // verify trading for silver feature is enabled
    require(isFeatureEnabled(FEATURE_SILVER_TRADE_ENABLED));

    // determine amount of silver to mint
    // this will perform a lot of useful checks under the hood (see `evalSilver` function)
    uint32 silver = evalSilver(gemIds);

    // GemBurner doesn't support ERC721 - it cannot do anything with the gems it has
    // that's why to transfer gems here we use unsafe transfer
    // transfer the gems one by one using unsafe transfer,
    // verify that all the gems belong to transaction sender
    for(uint256 i = 0; i < gemIds.length; i++) {
      // ensure transaction sender account is an owner of the gem
      require(gemInstance.ownerOf(gemIds[i]) == msg.sender);

      // perform the unsafe transfer
      gemInstance.transferFrom(msg.sender, address(this), gemIds[i]);
    }

    // mint the amount of silver previously calculated
    silverInstance.mint(msg.sender, silver);

    // emit an event
    emit TradedForSilver(msg.sender, silver, gemIds);
  }

  /**
   * @notice Transfers specified gems from the owner forever.
   *      Mints some amount of gold in return.
   *      Can be called by the gems owner only.
   * @notice Use `evalGold` function to evaluate amount of gold to be minted
   *
   * @dev Throws if number of the gems submitted is not multiple of 4 (configurable) or is empty
   * @dev Throws if number of the gems submitted is bigger than 65,535
   * @dev Throws if ids of the gems submitted are not sorted ascending
   * @dev Throws if ids of the gems submitted contain duplicates
   * @dev Throws if the gems have different grade type
   * @dev Throws if exchange rate for the gems grade type is undefined
   * @dev Throws if the gems belong to an account different from sender's account
   * @dev Throws if gems owner didn't authorise the transfer via ERC721.approve or ERC721.setApprovalForAll
   * @dev Requires `FEATURE_GOLD_TRADE_ENABLED` to be enabled
   *
   * @param gemIds an array containing IDs of the gems to transfer, sorted ascending, with no duplicates
   */
  function tradeForGold(uint24[] memory gemIds) public {
    // verify trading for gold feature is enabled
    require(isFeatureEnabled(FEATURE_GOLD_TRADE_ENABLED));

    // determine amount of gold to mint
    // this will perform a lot of useful checks under the hood (see `evalGold` function)
    uint32 gold = evalGold(gemIds);

    // GemBurner doesn't support ERC721 - it cannot do anything with the gems it has
    // that's why to transfer gems here we use unsafe transfer
    // transfer the gems one by one using unsafe transfer,
    // verify that all the gems belong to transaction sender
    for(uint256 i = 0; i < gemIds.length; i++) {
      // ensure transaction sender account is an owner of the gem
      require(gemInstance.ownerOf(gemIds[i]) == msg.sender);

      // perform the unsafe transfer
      gemInstance.transferFrom(msg.sender, address(this), gemIds[i]);
    }

    // mint the amount of gold previously calculated
    goldInstance.mint(msg.sender, gold);

    // emit an event
    emit TradedForGold(msg.sender, gold, gemIds);
  }
}
