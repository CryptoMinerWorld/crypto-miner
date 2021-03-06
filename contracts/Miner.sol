pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./GemERC721.sol";
import "./PlotERC721.sol";
import "./SilverERC20.sol";
import "./GoldERC20.sol";
import "./ArtifactERC20.sol";
import "./FoundersKeyERC20.sol";
import "./ChestKeyERC20.sol";
import "./TierMath.sol";
import "./Random.sol";
import "./TimeUtils.sol";

/**
 * @title Miner
 *
 * @notice Miner is responsible for mining mechanics of the CryptoMiner World
 *      and allows game tokens (ERC721 and ERC20) to interact with each other
 *
 * @dev Miner may read, write, mint, lock and unlock tokens
 *      (locked tokens cannot be transferred i.e. cannot change owner)
 *
 * @dev Following tokens may be accessed for reading (token properties affect mining):
 *      - ArtifactERC721
 *      - GemERC721
 *      - PlotERC721
 *
 * @dev Following tokens may be accessed for writing (token properties change when mining):
 *      - GemERC721, statistics updates - plots/blocks mined
 *      - PlotERC721, offset updates – currently mined depth
 *
 * @dev Following tokens may be created (token can be found in the land plot when mining):
 *      - ArtifactERC721
 *      - GemERC721
 *      - SilverERC20
 *      - GoldERC20
 *      - ArtifactERC20
 *      - FoundersKeyERC20
 *      - ChestKeyERC20
 *
 * @dev Following tokens may be locked or unlocked (tokens are locked when mining):
 *      - ArtifactERC721
 *      - GemERC721
 *      - PlotERC721
 *
 * @author Basil Gorin
 */
contract Miner is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant MINER_UID = 0x1a7eb1b821aaca4d043b15fcaa50ab6ba87adf5263adb9a1f852531eba2fd7c6;

  /**
   * @dev Expected version (UID) of the deployed GemERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GEM_UID_REQUIRED = 0x8012342b1b915598e6a8249110cd9932d7ee7ae8a8a3bbb3a79a5a545cefee72;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant PLOT_UID_REQUIRED = 0xd6aaa537603eeb960c566e695dd639249ed75a5a46d37efb279e100516686f6e;

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
   * @dev Expected version (UID) of the deployed ArtifactERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant ARTIFACT20_UID_REQUIRED = 0x951eea7b6e07fbde80a8d6b330cd61d2d6e1f7483c0317ddf9a1ffc2aa56524f;

  /**
   * @dev Expected version (UID) of the deployed FoundersKeyERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant FOUNDERS_KEY_UID_REQUIRED = 0x11df2ff3adbbb9c5e0824c6ec6f2a81cbeaa4a69b6302d8726fd7b854952d3aa;

  /**
   * @dev Expected version (UID) of the deployed ChestKeyERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant CHEST_KEY_UID_REQUIRED = 0xb09a25815aabc348579249353625bd63fa007579c1503f6af9c2aff075253789;

  /**
   * @dev Auxiliary data structure used in `plots` mapping to
   *      store information about gems and artifacts bound to mine
   *      a particular plot of land
   * @dev Additionally it stores the unix timestamp of the transaction
   *      when mining has started
   */
  struct MiningData {
    /**
     * @dev ID of the gem which is mining the plot,
     *      the gem is locked when mining
     */
    uint24 gemId;

    /**
     * @dev ID of the artifact which is mining the plot,
     *      the artifact is locked when mining
     */
    uint24 artifactId;

    /**
     * @dev Index of gem ID and plot ID in `allBoundTokens` array
     */
    uint24 globalIndex;

    /**
     * @dev Index of gem ID and plot ID in `boundCollections` array
     *      of a particular owner
     */
    uint24 ownerIndex;

    /**
     * @dev Unix timestamp of the `bind()` transaction
     */
    uint32 bound;

    /**
     * @dev Unix timestamp of the last `update()` transaction
     */
    uint32 updated;

    /**
     * @dev Owner of the bound tokens
     */
    address owner;
  }

  /**
   * @dev GemERC721 deployed instance,
   *      tokens of that instance can be read, minted, locked and unlocked
   *
   * @dev Miner should have `GemERC721.ROLE_TOKEN_CREATOR` permission to mint tokens
   * @dev Miner should have `GemERC721.ROLE_STATE_PROVIDER` permission lock/unlock tokens
   */
  GemERC721 public gemInstance;

  /**
   * @dev PlotERC721 deployed instance,
   *      tokens of that instance can be modified (mined), locked and unlocked
   *
   * @dev Miner should have `PlotERC721.ROLE_OFFSET_PROVIDER` permission to modify (mine) tokens
   * @dev Miner should have `PlotERC721.ROLE_STATE_PROVIDER` permission lock/unlock tokens
   */
  PlotERC721 public plotInstance;

  /**
   * @dev SilverERC20 deployed instance,
   *      tokens of that instance can be minted
   *
   * @dev Miner should have `SilverERC20.ROLE_TOKEN_CREATOR` permission to mint tokens
   */
  SilverERC20 public silverInstance;

  /**
   * @dev GoldERC20 deployed instance,
   *      tokens of that instance can be minted
   *
   * @dev Miner should have `GoldERC20.ROLE_TOKEN_CREATOR` permission to mint tokens
   */
  GoldERC20 public goldInstance;

  /**
   * @dev GoldERC20 deployed instance,
   *      tokens of that instance can be minted
   *
   * @dev Miner should have `GoldERC20.ROLE_TOKEN_CREATOR` permission to mint tokens
   */
  ArtifactERC20 public artifactErc20Instance;

  /**
   * @dev FoundersKeyERC20 deployed instance,
   *      tokens of that instance can be minted
   *
   * @dev Miner should have `FoundersKeyERC20.ROLE_TOKEN_CREATOR` permission to mint tokens
   */
  FoundersKeyERC20 public foundersKeyInstance;

  /**
   * @dev ChestKeyERC20 deployed instance,
   *      tokens of that instance can be minted
   *
   * @dev Miner should have `ChestKeyERC20.ROLE_TOKEN_CREATOR` permission to mint tokens
   */
  ChestKeyERC20 public chestKeyInstance;

  /**
   * @dev Mapping to store mining information that is which
   *      gems and artifacts mine which plots
   * @dev Can be modified only by `bind` and `__unlock` functions
   * @dev Maps plot ID => MiningData struct
   */
  mapping(uint24 => MiningData) public plots;

  /**
   * @dev Auxiliary mapping keeps track of what gems are mining
   *      which plots
   * @dev Can be modified only by `bind` and `__unlock` functions
   * @dev Maps gem ID => plot ID
   */
  mapping(uint24 => uint24) public gems;

  /**
   * @dev Enumerations of the tokens bound and locked by
   *      this smart contract for each owner
   * @dev Each element contains a "binding UID":
   *      artifact ID, 24 bits (reserved, not used yet)
   *      gem ID, 24 bits
   *      plot ID, 24 bits
   * @dev Can be modified only by `bind` and `__unlock` functions
   */
  mapping(address => uint72[]) public collections;

  /**
   * @dev Enumeration of all the tokens bound and locked by
   *      this smart contract
   * @dev Each element contains a "binding UID":
   *      artifact ID, 24 bits (reserved, not used yet)
   *      gem ID, 24 bits
   *      plot ID, 24 bits
   * @dev Can be modified only by `bind` and `__unlock` functions
   */
  uint72[] public allTokens;

  /**
   * @dev Gem colors available to be set for the gems
   */
  uint8[] public gemColors = [1, 2, 5, 6, 7, 9, 10];

  /**
   * @dev How many minutes of mining (resting) energy it takes
   *      to mine block of land depending on the tier number
   * @dev Array is zero-indexed, index 0 corresponds to Tier 1,
   *      index 4 corresponds to Tier 5
   */
  uint16[] public MINUTES_TO_MINE = [90, 720, 2160, 4320, 8640];

  /**
   * @notice Enables mining, that is the main feature of miner
   * @dev Required for `bind()` function to work properly
   */
  uint32 public constant FEATURE_MINING_ENABLED = 0x00000001;

  /**
   * @dev Enables updating and releasing the gem/plot/artifact on behalf
   * @dev Allows to call `update()` and `release()` on behalf of someone else
   */
  uint32 public constant ROLE_MINING_OPERATOR = 0x00000001;

  /**
   * @dev Enables rollback functionality
   * @dev Allows to call `rollback()` function
   */
  uint32 public constant ROLE_ROLLBACK_OPERATOR = 0x00000002;

  /**
   * @dev Gem colors provider may change the `gemColors` array
   */
  uint32 public constant ROLE_GEM_COLORS_PROVIDER = 0x00000004;

  /**
   * @dev Allows modifying mining rates coefficients
   */
  uint32 public constant ROLE_SPECIAL_GEMS_PROVIDER = 0x00000008;

  /**
   * @dev A bitmask indicating locked state of the ERC721 token
   * @dev Consists of a single bit at position 1 – binary 1
   * @dev The bit meaning in token's `state` is as follows:
   *      0: locked
   *      1: unlocked
   */
  uint8 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1

  /**
   * @dev A mask used to erase `DEFAULT_MINING_BIT`
   */
  uint8 public constant ERASE_MINING_BIT = 0xFF ^ DEFAULT_MINING_BIT;

  /**
   * @dev May be fired in `bind()`
   * @param _by an address which executed transaction, usually player, owner of the gem
   * @param gemId ID of the gem whose energy was consumed
   * @param energyLeft how much energy has left
   */
  event RestingEnergyConsumed(address indexed _by, uint24 indexed gemId, uint32 energyLeft);

  /**
   * @dev May be fired in `bind()`
   * @param _by an address which executed transaction, usually owner of the tokens
   * @param plotId ID of the plot to mine (bound)
   * @param gemId ID of the gem which mines the plot (bound)
   * param artifactId ID of the artifact used (bound)
   */
  event Bound(address indexed _by, uint24 indexed plotId, uint24 indexed gemId);

  /**
   * @dev May be fired in `bind()` and `release()`. Fired in `update()`
   * @param _by an address which executed transaction,
   *      usually owner of the plot/gem
   * @param plotId ID of the plot which was mined
   * @param gemId ID of the gem which mined the plot
   * param artifactId ID of the artifact engaged
   * @param offsetFrom initial depth for the plot
   * @param offsetTo mined depth for the plot
   * @param loot an array containing the loot information
   */
  event Updated(
    address indexed _by,
    uint24 indexed plotId,
    uint24 indexed gemId,
    uint8 offsetFrom,
    uint8 offsetTo,
    uint16[] loot
  );

  /**
   * @dev Fired in `release()`
   * @param _by an address which executed transaction, usually owner of the tokens
   * @param plotId ID of the plot released
   * @param gemId ID of the gem released
   * param artifactId ID of the artifact released
   */
  event Released(address indexed _by, uint24 indexed plotId, uint24 indexed gemId);


  /**
   * @dev Creates a Miner instance, binding it to GemERC721, PlotERC721,
   *      ArtifactERC721, SilverERC20, GoldERC20, ArtifactERC20,
   *      FoundersKeyERC20, ChestKeyERC20 token instances specified
   * @param _gem address of the deployed GemERC721 instance with
   *      the `TOKEN_VERSION` equal to `GEM_UID_REQUIRED`
   * @param _plot address of the deployed PlotERC721 instance with
   *      the `TOKEN_UID` equal to `PLOT_UID_REQUIRED`
   * @param _artifact address of the deployed ArtifactERC721 instance with
   *      the `TOKEN_UID` equal to `ARTIFACT_UID_REQUIRED`
   * @param _silver address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_UID_REQUIRED`
   * @param _gold address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_UID_REQUIRED`
   * @param _artifactErc20 address of the deployed ArtifactERC20 instance with
   *      the `TOKEN_UID` equal to `ARTIFACT20_UID_REQUIRED`
   * @param _foundersKey address of the deployed FoundersKeyERC20 instance with
   *      the `TOKEN_UID` equal to `FOUNDERS_KEY_UID_REQUIRED`
   * @param _chestKey address of the deployed ChestKeyERC20 instance with
   *      the `TOKEN_UID` equal to `CHEST_KEY_UID_REQUIRED`
   */
  constructor(
    address _gem,
    address _plot,
    address _artifact,
    address _silver,
    address _gold,
    address _artifactErc20,
    address _foundersKey,
    address _chestKey
  ) public {
    // check input addresses for zero values
    require(_gem != address(0));
    require(_plot != address(0));
    require(_artifact != address(0));
    require(_silver != address(0));
    require(_gold != address(0));
    require(_artifactErc20 != address(0));
    require(_foundersKey != address(0));
    require(_chestKey != address(0));

    // bind smart contract instances
    gemInstance = GemERC721(_gem);
    plotInstance = PlotERC721(_plot);
    //artifactInstance = ArtifactERC721(_artifact);
    silverInstance = SilverERC20(_silver);
    goldInstance = GoldERC20(_gold);
    artifactErc20Instance = ArtifactERC20(_artifactErc20);
    foundersKeyInstance = FoundersKeyERC20(_foundersKey);
    chestKeyInstance = ChestKeyERC20(_chestKey);

    // verify smart contract versions
    require(gemInstance.TOKEN_UID() == GEM_UID_REQUIRED);
    require(plotInstance.TOKEN_UID() == PLOT_UID_REQUIRED);
    //require(artifactInstance.TOKEN_UID() == ARTIFACT_UID_REQUIRED);
    require(silverInstance.TOKEN_UID() == SILVER_UID_REQUIRED);
    require(goldInstance.TOKEN_UID() == GOLD_UID_REQUIRED);
    require(artifactErc20Instance.TOKEN_UID() == ARTIFACT20_UID_REQUIRED);
    require(foundersKeyInstance.TOKEN_UID() == FOUNDERS_KEY_UID_REQUIRED);
    require(chestKeyInstance.TOKEN_UID() == CHEST_KEY_UID_REQUIRED);
  }

  /**
   * @dev Gets all the plot IDs, gem IDs, artifact IDs currently mined
   *      by a particular address
   * @param owner an address to query collection for
   * @return an ordered unsorted list of binding UIDs:
   *      artifact ID, 24 bits (reserved, not used yet)
   *      gem ID, 24 bits
   *      plot ID, 24 bits
   */
  function getCollection(address owner) public view returns(uint72[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Gets an amount of plots/gems/artifacts being currently
   *      mined by the miner for a given owner address
   * @param owner address to query mining balance for
   * @return amount of plots being currently mined by address
   */
  function balanceOf(address owner) public view returns(uint256) {
    // read owner's collection length and return
    return collections[owner].length;
  }

  /**
   * @dev Gets all the plot IDs, gem IDs, artifact IDs currently mined
   * @return an ordered unsorted list containing
   *      artifact ID, 24 bits (reserved, not used yet)
   *      gem ID, 24 bits
   *      plot ID, 24 bits
   */
  function getAllTokens() public view returns(uint72[] memory) {
    // read all tokens data and return
    return allTokens;
  }

  /**
   * @dev Gets an amount of plots/gems/artifacts being currently mined
   * @return total number of plots currently mined
   */
  function totalSupply() public view returns(uint256) {
    // read all tokens array length and return
    return allTokens.length;
  }

  /**
   * @dev Finds a gem and artifact bound to a particular plot
   * @param plotId ID of the plot to query bound gem/artifact for
   * @return a tuple containing IDs of the bound gem and artifact
   */
  function getPlotBinding(uint24 plotId) public view returns(uint24 gemId, uint24 artifactId) {
    // read and return the result
    return (plots[plotId].gemId, 0);
  }

  /**
   * @dev Finds a plot and artifact bound to a particular gem
   * @param gemId ID of the gem to query bound plot/artifact for
   * @return a tuple containing IDs of the bound plot and artifact
   */
  function getGemBinding(uint24 gemId) public view returns(uint24 plotId, uint24 artifactId) {
    // read and return the result
    return (gems[gemId], 0);
  }

  /**
   * @dev Updates `availableColors` array
   * @dev Requires sender to have `ROLE_AVAILABLE_COLORS_PROVIDER` permission
   * @dev Requires input array not to be empty
   * @param colors array of available colors to set
   */
  function setGemColors(uint8[] memory colors) public {
    // ensure sender has permission to set colors
    require(isSenderInRole(ROLE_GEM_COLORS_PROVIDER));

    // ensure array is not empty and number of colors
    // doesn't exceed 12
    require(colors.length != 0 && colors.length <= 12);

    // set `availableColors` array
    gemColors = colors;
  }

  /**
   * @dev Getter for an entire `availableColors` array
   * @return array of available colors - `availableColors`
   */
  function getGemColors() public view returns(uint8[] memory) {
    // just return an array as is
    return gemColors;
  }

  /**
   * @dev Auxiliary function to read special gem properties from ext256
   * @dev Reads mining rate multiplier and special gem color
   * @dev For gems out of special gem ID bounds (0xF000, 0xF100) returns zeros
   * @param gemId ID of the gem to get mining rate multiplier and special color for
   * @return a tuple containing  mining rate multiplier and special color
   */
  function getSpecialGem(uint24 gemId) public view returns(uint8 multiplier, uint8 color) {
    // ensure gem ID is in proper bounds
    // for wrong bounds return zeros
    if(gemId > 0xF000 && gemId < 0xF100) {
      // load special gem multiplier (8 bits) from its ext256 data, page 0xF000, offset 0
      multiplier = uint8(gemInstance.readPage(gemId, 0xF000, 0, 8));

      // load special gem color (8 bits) from its ext256 data, page 0xF000, offset 8
      color = uint8(gemInstance.readPage(gemId, 0xF000, 8, 8));
    }
    // result is returned automatically but we can write it explicitly for convenience
    return (multiplier, color);
  }

  /**
   * @dev Allows to introduce new special gem mining rate multiplier
   *      or to modify existing special gem mining rate multiplier
   * @dev Allows to bind the multiplier to specific month using special gem color
   *      parameter named `color`
   * @dev If color is set the multiplier is applied only if gem started mining in
   *      the corresponding month
   * @dev Zero color is treated as unset and is ignored, meaning
   *      multiplier is applied regardless of the month
   * @dev Requires sender to have `ROLE_MINING_RATES_PROVIDER` permission
   * @dev Requires gem ID to be in range (0xF000, 0xF100)
   * @param gemId special gem ID to send mining rate multiplier and color for
   * @param multiplier mining rate multiplier to set
   * @param color special gem color (month index affecting multiplier)
   */
  function setSpecialGem(uint24 gemId, uint8 multiplier, uint8 color) public {
    // ensure sender has permission to set special gem mining rate
    require(isSenderInRole(ROLE_SPECIAL_GEMS_PROVIDER));

    // ensure gem ID is in proper bounds
    require(gemId > 0xF000 && gemId < 0xF100);

    // we store color and mining rate multiplier in the gem's ext256 data structure
    // multiplier is stored at page 0xF000, offset 0, length 8 bits
    // color is stored at page 0xF000, offset 8, length 8 bits
    // prepare 16 bits to write at page 0xF000, offset 0
    uint16 value = uint16(color) << 8 | multiplier;

    // write the data to the destination
    gemInstance.writePage(gemId, 0xF000, value, 0, 16);
  }

  /**
   * @notice Binds a gem and (optionally) an artifact to a land plot
   *      and starts mining of the plot
   * @dev Locks all the tokens passed as parameters
   * @dev Throws if any of the tokens is already locked
   * @dev Throws if any of the tokens specified doesn't exist or
   *      doesn't belong to transaction sender
   * @param plotId ID of the land plot to mine
   * @param gemId ID of the gem to mine land plot with
   * param artifactId ID of the artifact to affect the gem
   *      properties during mining process
   */
  function bind(uint24 plotId, uint24 gemId) public {
    // verify mining feature is enabled
    require(isFeatureEnabled(FEATURE_MINING_ENABLED));

    // verify all the tokens passed belong to sender,
    // verifies token existence under the hood
    require(plotInstance.ownerOf(plotId) == msg.sender);
    require(gemInstance.ownerOf(gemId) == msg.sender);

    // verify all tokens are not in a locked state
    require(plotInstance.getState(plotId) & DEFAULT_MINING_BIT == 0);
    require(gemInstance.getState(gemId) & DEFAULT_MINING_BIT == 0);

    // read tiers structure of the plot
    uint64 tiers = plotInstance.getTiers(plotId);

    // determine maximum depth this gem can mine to (by level)
    uint8 maxOffset = TierMath.getTierDepthOrMined(tiers, gemInstance.getLevel(gemId));

    // ensure gem level allows mining deeper
    require(TierMath.getOffset(tiers) < maxOffset);

    // calculate effective energy
    uint32 effectiveEnergy = effectiveRestingEnergyWith(gemId, plotId);

    // define variable to store new plot offset
    uint8 offset;

    // delegate call to `evaluateWith`
    (offset, effectiveEnergy) = evaluateWith(tiers, maxOffset, effectiveEnergy);

    // if gem can mine with resting energy (offset increased)
    // we perform initial mining in the same transaction
    if(offset > TierMath.getOffset(tiers)) {
      // delegate call to `__mine` to update plot and mint loot
      __mine(plotId, gemId, offset);

      // recalculate energy left taking into account gem's mining rate
      uint32 energy = uint32(uint64(effectiveEnergy) * 1000000 / miningRateWith(gemId, plotId));

      // save unused energetic age of the gem, in seconds
      gemInstance.setAge(gemId, unusedEnergeticAge(energy));

      // emit an energy consumed event
      emit RestingEnergyConsumed(msg.sender, gemId, effectiveEnergy);
    }

    // if gem's level allows to mine deeper,
    if(offset < maxOffset) {
      // lock the plot, erasing everything else in its state
      plotInstance.setState(plotId, DEFAULT_MINING_BIT);
      // lock the gem, erasing everything else in its state
      gemInstance.setState(gemId, DEFAULT_MINING_BIT);
      // lock artifact if any, also erasing everything in its state
      // artifactInstance.setState(artifactId, DEFAULT_MINING_BIT);

      // energetic age is fully consumed, erase it
      gemInstance.setAge(gemId, 0);

      // check the tokens are not in bound state already
      require(plots[plotId].bound == 0 && gems[gemId] == 0);

      // calculate binding UID,
      // composed of plotId, gemId and artifactId (if provided)
      uint72 bindingUid = uint48(gemId) << 24 | plotId;

      // we assume sender is an owner
      address owner = msg.sender;

      // create a binding data structure in the memory, pointing to the
      // ends of allTokens and collections[msg.sender] arrays
      MiningData memory m = MiningData({
        gemId: gemId,
        artifactId: 0,
        globalIndex: uint24(allTokens.length),
        ownerIndex: uint24(collections[owner].length),
        bound: now32(),
        updated: 0,
        owner: owner
      });

      // add binding UID to the ends of mentioned arrays
      allTokens.push(bindingUid);
      collections[owner].push(bindingUid);

      // save binding data structure to the both mappings
      plots[plotId] = m;
      gems[gemId] = plotId;

      // emit en event
      emit Bound(msg.sender, plotId, gemId);
    }
  }

  /**
   * @notice Releases a gem and an artifact (if any) bound earlier
   *      with `bind()` from a land plot and stops mining of the plot
   * @dev Saves updated land plot state into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev Unlocks all the tokens involved (previously bound)
   * @dev Throws if land plot token specified doesn't exist or
   *      doesn't belong to transaction sender
   * @dev Throws if land plot specified is not in mining state
   *      (was not bound previously using `bind()`)
   * @param plotId ID of the land plot to stop mining
   */
  function release(uint24 plotId) public {
    // verify sender is owner of the plot or mining operator
    // verifies plot existence under the hood
    require(plotInstance.ownerOf(plotId) == msg.sender || isSenderInRole(ROLE_MINING_OPERATOR));

    // evaluate the plot
    uint8 offset = evaluate(plotId);

    // if offset increased
    if(offset > plotInstance.getOffset(plotId)) {
      // delegate call to `__mine` to update plot and mint loot
      __mine(plotId, plots[plotId].gemId, offset);
    }

    // unlock the tokens - delegate call to `__unlock`
    __unlock(plotId);
  }

  /**
   * @notice Updates plot state without releasing a gem and artifact (if any)
   *      bound earlier with `bind()` from a land plot, doesn't stop mining
   * @dev Saves updated land plot state into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev All the tokens involved (previously bound) remain in a locked state
   * @dev Throws if land plot token specified doesn't exist or
   *      doesn't belong to transaction sender
   * @dev Throws if land plot specified is not in mining state
   *      (was not bound previously using `bind()`)
   * @param plotId ID of the land plot to update state for
   */
  function update(uint24 plotId) public {
    // verify sender is owner of the plot or mining operator
    // verifies plot existence under the hood
    require(plotInstance.ownerOf(plotId) == msg.sender || isSenderInRole(ROLE_MINING_OPERATOR));

    // evaluate the plot
    uint8 offset = evaluate(plotId);

    // load binding data
    MiningData memory m = plots[plotId];

    // delegate call to `__mine` to update plot and mint loot
    __mine(plotId, m.gemId, offset);

    // if plot is fully mined now
    if(plotInstance.isFullyMined(plotId)) {
      // unlock the tokens - delegate call to `__unlock`
      __unlock(plotId);
    }
    // if plot still can be mined do not unlock
    else {
      // keeping it locked and updating state change date
      gemInstance.setState(m.gemId, DEFAULT_MINING_BIT);

      // update the 'updated' timestamp
      plots[plotId].updated = now32();
    }
  }

  /**
   * @dev Service function to unlock plot and associated gem and artifact if any
   * @dev Reverts the mining (doesn't update plot)
   * @dev May be executed only by rollback operator
   * @param plotId ID of the plot to unlock
   */
  function rollback(uint24 plotId) public {
    // ensure function is called by rollback operator
    require(isSenderInRole(ROLE_ROLLBACK_OPERATOR));

    // unlock the tokens - delegate call to `__unlock`
    __unlock(plotId);
  }

  /**
   * @dev Auxiliary function to release plot and all bound tokens
   * @dev Unsafe, must be kept private
   * @param plotId ID of the plot to unlock
   */
  function __unlock(uint24 plotId) private {
    // load binding data
    MiningData memory m = plots[plotId];

    // unlock the plot, erasing everything else in its state
    plotInstance.setState(plotId, 0);
    // unlock the gem, erasing everything else in its state
    gemInstance.setState(m.gemId, 0);
    // unlock artifact if any, erasing everything in its state
    // artifactInstance.setState(m.artifactId, 0);

    // we need to delete binding from 5 places:
    // 1. plots mapping
    // 2. gems mapping
    // 3. artifacts mapping (optional)
    // 4. allTokens array
    // 5. collections[owner] array

    // ensure the data is consistent (exists)
    require(m.bound != 0);

    // get the owner
    address owner = m.owner;

    // to remove binding from allTokens and collections[owner] arrays
    // (partially items 4 and 5) we move last elements in these arrays to the
    // position to be removed and then shrink both arrays

    // move last token data in an array to the freed position
    allTokens[m.globalIndex] = allTokens[allTokens.length - 1];
    // same for owner's collection - move last to the freed position
    collections[owner][m.ownerIndex] = collections[owner][collections[owner].length - 1];

    // now we need to fix data in the plots mapping for the moved plot
    // update binding data for moved element
    plots[uint24(allTokens[m.globalIndex])].globalIndex = m.globalIndex;
    plots[uint24(collections[owner][m.ownerIndex])].ownerIndex = m.ownerIndex;

    // delete the rest of the bindings (items 1, 2 and 3)
    delete plots[plotId];
    delete gems[m.gemId];

    // shrink both arrays by removing last element (finish with items 4 and 5)
    allTokens.length--;
    collections[owner].length--;

    // emit en event
    emit Released(msg.sender, plotId, m.gemId);
  }

  /**
   * @notice Evaluates current state of the plot without performing a transaction
   * @dev Doesn't update land plot state in the distributed ledger
   * @dev Used internally by `release()` and `update()` to calculate state of the plot
   * @dev May be used by frontend to display current mining state close to realtime
   * @param plotId ID of the land plot to evaluate current state for
   * @return evaluated current mining block index for the given land plot
   */
  function evaluate(uint24 plotId) public view returns(uint8 offset) {
    // verify plot is locked
    // verifies token existence under the hood
    require(plotInstance.getState(plotId) & DEFAULT_MINING_BIT != 0);

    // load binding data
    MiningData memory m = plots[plotId];

    // ensure binding data entry exists
    require(m.bound != 0);

    // read tiers structure of the plot
    uint64 tiers = plotInstance.getTiers(plotId);

    // read level data of the gem
    uint8 level = gemInstance.getLevel(m.gemId);

    // determine maximum depth this gem can mine to (by level)
    uint8 maxOffset = TierMath.getTierDepthOrMined(tiers, level);

    // determine gem's effective mining energy
    uint32 energy = effectiveMiningEnergyWith(m.gemId, plotId);

    // delegate call to `evaluateWith`
    (offset, energy) = evaluateWith(tiers, maxOffset, energy);

    // calculated offset returned automatically
    return offset;
  }

  /**
   * @notice Evaluates current state of the plot without performing a transaction
   * @dev Doesn't update land plot state in the distributed ledger
   * @dev Used internally by `release()` and `update()` to calculate state of the plot
   * @dev May be used by frontend to display current mining state close to realtime
   * @param tiers tiers data structure of the land plot to evaluate current state for
   * @param maxOffset maximum offset the gem can mine to
   * @param initialEnergy available energy to be spent by the gem
   * @return a tuple containing:
   *      offset – evaluated current mining block index for the given land plot
   *      energy - energy left after mining
   */
  function evaluateWith(
    uint64 tiers,
    uint8 maxOffset,
    uint32 initialEnergy
  ) public view returns(
    uint8 offset,
    uint32 energyLeft
  ) {
    // determine current plot offset, this will also be returned
    offset = TierMath.getOffset(tiers);

    // init return energy value with an input one
    energyLeft = initialEnergy;

    // in case when energy is not zero, we perform initial mining
    // in the same transaction
    if(energyLeft != 0 && offset < maxOffset) {
      // iterate over all tiers
      for(uint8 i = 1; i <= TierMath.getNumberOfTiers(tiers); i++) {
        // determine tier offset
        uint8 tierDepth = TierMath.getTierDepth(tiers, i);

        // if current tier depth is bigger than offset – we mine
        if(offset < tierDepth) {
          // determine how deep we can mine in that tier
          uint16 canMineTo = uint16(offset) + energyToBlocks(i, energyLeft);

          // we are not crossing the tier though
          uint8 willMineTo = canMineTo < tierDepth? uint8(canMineTo): tierDepth;

          // determine how much energy is consumed and decrease energy
          energyLeft -= blocksToEnergy(i, willMineTo - offset);

          // update offset
          offset = willMineTo;

          // if we don't have enough energy to mine deeper
          // or gem level doesn't allow to mine deeper
          if(offset >= maxOffset || canMineTo <= tierDepth) {
            // we're done, exit the loop
            break;
          }
        }
      }
    }
  }

  /**
   * @dev Auxiliary function which performs mining of the plot
   * @dev Unsafe, must be kept private at all times
   * @param plotId ID of the plot to mine
   * @param offset depth to mine the plot to,
   *      must be bigger than current plot depth
   */
  function __mine(uint24 plotId, uint24 gemId, uint8 offset) private {
    // get tiers structure of the plot
    uint64 tiers = plotInstance.getTiers(plotId);

    // extract current offset to be used in event emitter
    uint8 offset0 = TierMath.getOffset(tiers);

    // calculate the loot based on the offset
    // ensures new offset is bigger than initial one under the hood
    uint16[] memory loot = tiersLoot(tiers, offset, new uint16[](9));

    // loot processing - delegate call to `processLoot`
    __processLoot(loot, plotId);

    // update plot's offset
    plotInstance.mineTo(plotId, offset);

    // update gem's stats
    gemInstance.increaseMinedCounters(gemId, TierMath.isBottomOfStack(tiers, offset)? 1: 0, offset - offset0);

    // emit an event
    emit Updated(msg.sender, plotId, gemId, offset0, offset, loot);
  }

  /**
   * @dev Auxiliary function to mint the loot defined in input array:
   *      index 0: gems level 1
   *      index 1: gems level 2
   *      index 2: gems level 3
   *      index 3: gems level 4
   *      index 4: gems level 5
   *      index 5: silver
   *      index 6: gold
   *      index 7: artifacts
   *      index 8: keys
   * @dev The loot is minted to transaction sender
   * @dev Unsafe, must be kept private at all times
   * @param loot an array defining the loot as described above
   * @param plotId ID of the plot the gem is found in
   */
  function __processLoot(uint16[] memory loot, uint24 plotId) private {
    // mint gems level 1, 2, 3, 4, 5
    for(uint8 i = 0; i < 5; i++) {
      // mint gems level `i`
      __mintGems(15 * i, i + 1, loot[i]);
    }

    // if there is silver to mint
    if(loot[5] != 0) {
      // mint silver
      silverInstance.mint(msg.sender, loot[5]);
    }

    // if there is gold to mint
    if(loot[6] != 0) {
      // mint gold
      goldInstance.mint(msg.sender, loot[6]);
    }

    // if there are artifacts to mint
    if(loot[7] != 0) {
      // mint artifacts
      artifactErc20Instance.mint(msg.sender, loot[7]);
    }

    // if there are keys to mint
    if(loot[8] != 0) {
      // mint keys
      // plots in Antarctica have zero country ID (high 8 bits)
      if(plotId >> 16 == 0) {
        // for Antarctica we mint founder's chest keys
        foundersKeyInstance.mint(msg.sender, loot[8]);
      }
      else {
        // for the rest of the World - regular chest keys
        chestKeyInstance.mint(msg.sender, loot[8]);
      }
    }
  }

  /**
   * @dev Auxiliary function to mint gems
   * @dev The loot is minted to transaction sender
   * @dev Unsafe, must be kept private at all times
   * @param seedOffset seed offset to be used for random generation, there
   *      will be `n / 3` of seeds used [seedOffset, seedOffset + n / 3)
   * @param level level of the gems to mint
   * @param n number of gems to mint
   */
  function __mintGems(uint256 seedOffset, uint8 level, uint16 n) private {
    // variable to store some randomness to work with
    uint256 rnd;

    // we're about to mint `n` gems
    for(uint16 i = 0; i < n; i++) {
      // each 3 iterations starting from iteration 0
      if(i % 3 == 0) {
        // generate new randomness to work with
        rnd = Random.generate256(seedOffset + i / 3);
      }

      // generate random value in the [0, 10000) range
      // for grade type generation
      uint16 rnd10000 = uint16(Random.uniform(rnd >> 72 * (i % 3), 24, 10000));

      // extract 16 bits of randomness - range [0, 65536) for color generation
      uint16 rnd65k = uint16(rnd >> 24 + 72 * (i % 3));

      // generate random value in range [0, 1000000) range
      // to be used as a grade value
      uint24 rnd1000000 = uint24(Random.uniform(rnd >> 40 + 72 * (i % 3), 32, 1000000));

      // define variable to store grade type
      uint8 gradeType;

      // grade D: 50%
      if(rnd10000 < 5000) {
        gradeType = 1;
      }
      // grade C: 25%
      else if(rnd10000 < 7500) {
        gradeType = 2;
      }
      // grade B: 15%
      else if(rnd10000 < 9000) {
        gradeType = 3;
      }
      // grade A: 7%
      else if(rnd10000 < 9700) {
        gradeType = 4;
      }
      // grade A: 2%
      else if(rnd10000 < 9900) {
        gradeType = 5;
      }
      // grade AAA: 1%
      else {
        gradeType = 6;
      }

      // mint the gem with randomized properties
      gemInstance.mintNext(
        msg.sender,
        randomColor(rnd65k),
        level,
        uint32(gradeType) << 24 | rnd1000000
      );
    }
  }

  /**
   * @dev Picks random color from `availableColors` array
   * @param randomness a random number in range [0, 65536)
   *      used to pick a color
   * @return gem color, an integer [1, 12]
   */
    function randomColor(uint16 randomness) public view returns(uint8) {
      // generate random index and return random number from the array
      return gemColors[Random.uniform(randomness, 16, gemColors.length)];
    }

  /**
   * @dev Auxiliary function to generate loot for mining `tiers` structure
   * @dev Loot data is accumulated in `loot` array, containing:
   *      index 0: gems level 1
   *      index 1: gems level 2
   *      index 2: gems level 3
   *      index 3: gems level 4
   *      index 4: gems level 5
   *      index 5: silver
   *      index 6: gold
   *      index 7: artifacts
   *      index 8: keys
   * @param tiers tiers data structure of the land plot to evaluate loot for
   * @param offset depth to mine tiers structure to,
   *      must be bigger than current offset
   * @param loot an array containing loot information
   */
  function tiersLoot(uint64 tiers, uint8 offset, uint16[] memory loot) public view returns(uint16[] memory) {
    // extract current offset
    //    [           '.....................|.............................|...................|.........|....]
    uint8 offset0 = TierMath.getOffset(tiers);

    // ensure new offset is bigger than initial one
    //    [           '                     |                             |          "........|.........|....]
    require(offset0 < offset);

    // get indexes of first and last tiers
    //    [11111111111'111111111111111111111|                             |                   |         |    ]
    uint8 tier0 = TierMath.getTierIndex(tiers, offset0);
    //    [                                 |                             |3333333333"33333333|         |    ]
    uint8 tier1 = TierMath.getTierIndex(tiers, offset);

    // if we do not cross tiers
    //    [    '                     "      |                             |                   |         |    ]
    if(tier0 == tier1) {
      // just process current tier according to offsets
      //  [    '*********************"      |                             |                   |         |    ]
      loot = tierLoot(
        tier0,
        offset - offset0,
        TierMath.getNumberOfTiers(tiers) == 2,
        TierMath.isBottomOfStack(tiers, offset) ? 1 : 0,
        loot
      );
    }
    // otherwise, if we cross one or more tiers
    //    [           '                     |                             |          "        |         |    ]
    else {
      // process first tier
      //  [           '*********************|                             |          "        |         |    ]
      loot = tierLoot(
        tier0,
        TierMath.getTierDepth(tiers, tier0) - offset0,
        TierMath.getNumberOfTiers(tiers) == 2,
        0,
        loot
      );

      // process middle tiers
      //  [           '                     |*****************************|          "        |         |    ]
      for(uint8 i = tier0 + 1; i < tier1; i++) {
        // process full tier `i`
        loot = tierLoot(
          i,
          TierMath.getTierHeight(tiers, i),
          TierMath.getNumberOfTiers(tiers) == 2,
          0,
          loot
        );
      }

      // process last tier
      //  [           '                     |                             |**********"        |         |    ]
      loot = tierLoot(
        tier1,
        offset - TierMath.getTierOffset(tiers, tier1),
        TierMath.getNumberOfTiers(tiers) == 2,
        TierMath.isBottomOfStack(tiers, offset) ? 1 : 0,
        loot
      );
    }

    // return the result
    return loot;
  }

  /**
   * @dev Auxiliary function to generate loot for mining `n` blocks in tier `k`
   * @dev Loot data is accumulated in `loot` array, containing:
   *      index 0: gems level 1
   *      index 1: gems level 2
   *      index 2: gems level 3
   *      index 3: gems level 4
   *      index 4: gems level 5
   *      index 5: silver
   *      index 6: gold
   *      index 7: artifacts
   *      index 8: keys
   * @param k one-based tier index to process loot for
   * @param n number of blocks to process for tier specified
   * @param a boolean flag indicating Antarctica plot type
   *      (founder's drop rates apply)
   * @param b bottom of stack counter, specifies how many blocks
   *      should be considered to be bottom of the stack;
   *      usually equals to zero if bottom is not reached or
   *      one if bottom of the stack is reached
   * @param loot an array containing loot information
   */
  function tierLoot(uint8 k, uint16 n, bool a, uint16 b, uint16[] memory loot) public view returns(uint16[] memory) {
    // for each block out of `n` blocks in tier `k`
    // we need to generate up to 11 random numbers,
    // with the precision up to 0.01%, that is 10^-4

    // Antarctica
    if(a) {
      // for tier 1
      if(k == 1) {
        // gem (lvl 1): 0.3%
        loot[0] += rndEval(0, 30, n);
        // gem (lvl 2): 0.03%
        loot[1] += rndEval(n, 3, n);
        // silver (1pc): 7%, silver (5pcs): 0.3%, silver (15pcs): 0.05%
        loot[5] += rndEval(5 * n, 700, n) + 5 * rndEval(6 * n, 30, n) + 15 * rndEval(7 * n, 5, n);
      }
      // for tier 2
      else if(k == 2) {
        // gem (lvl 1): 0.24%
        loot[0] += rndEval(0, 24, n);
        // gem (lvl 2): 0.09%
        loot[1] += rndEval(n, 9, n);
        // gem (lvl 3): 0.04%
        loot[2] += rndEval(2 * n, 4, n);
        // gem (lvl 4): 0.02%
        loot[3] += rndEval(3 * n, 2, n);
        // silver (1pc): 10%, silver (5pcs): 0.9%, silver (15pcs): 0.2%
        loot[5] += rndEval(5 * n, 1000, n) + 5 * rndEval(6 * n, 90, n) + 15 * rndEval(7 * n, 20, n);
        // gold (1): 0.02%
        loot[6] += rndEval(8 * n, 2, n);
        // artifact: 0.02%
        loot[7] += rndEval(9 * n, 2, n);
      }
      // any other tier is invalid
      else {
        // throw an exception
        require(false);
      }

      // for bottom of the stack blocks
      for(uint16 i = 0; i < b; i++) {
        // generate some random data to work with
        uint256 rnd = Random.generate256(11 * n + i);

        // determine how many items we get based on low 16 bits of the randomness
        uint256 items = 2 + Random.uniform(rnd, 16, 3);

        // generate that amount of items
        for(uint8 j = 0; j < items; j++) {
          // generate random value in range [0, 10000)
          // using bits (16, 88] - (16, 136]
          uint256 rnd10000 = Random.uniform(rnd >> (16 + 24 * j), 24, 10000);

          // generate loot according to the probabilities
          // gem (lvl 1): 4%
          if(rnd10000 < 400) {
            loot[0]++;
          }
          // gem (lvl 2): 2.5%
          else if(rnd10000 < 650) {
            loot[1]++;
          }
          // gem (lvl 3): 1.8%
          else if(rnd10000 < 830) {
            loot[2]++;
          }
          // gem (lvl 4): 0.5%
          else if(rnd10000 < 880) {
            loot[3]++;
          }
          // gem (lvl 5): 0.2%
          else if(rnd10000 < 900) {
            loot[4]++;
          }
          // silver (1): 50.2%
          else if(rnd10000 < 5920) {
            loot[5]++;
          }
          // silver (5): 31%
          else if(rnd10000 < 9020) {
            loot[5] += 5;
          }
          // silver (15): 8%
          else if(rnd10000 < 9820) {
            loot[5] += 15;
          }
          // gold (1): 0.7%
          else if(rnd10000 < 9890) {
            loot[6]++;
          }
          // artifact: 0.9%
          else if(rnd10000 < 9980) {
            loot[7]++;
          }
          // key: 0.2%
          else {
            loot[8]++;
          }
        }
      }

      // return the loot
      return loot;
    }

    // Rest of the World

    // for tier 1
    if(k == 1) {
      // gem (lvl 1): 0.26%
      loot[0] += rndEval(0, 26, n);
      // gem (lvl 2): 0.03%
      loot[1] += rndEval(n, 3, n);
      // silver (1pc): 8%
      loot[5] += rndEval(5 * n, 800, n);
    }
    // for tier 2
    else if(k == 2) {
      // gem (lvl 1): 0.16%
      loot[0] += rndEval(0, 16, n);
      // gem (lvl 2): 0.09%
      loot[1] += rndEval(n, 9, n);
      // gem (lvl 3): 0.02%
      loot[2] += rndEval(n, 2, n);
      // silver (1pc): 8%, silver (5pcs): 0.5%
      loot[5] += rndEval(5 * n, 800, n) + 5 * rndEval(6 * n, 50, n);
      // artifact: 0.01%
      loot[7] += rndEval(9 * n, n, 1);
    }
    // for tier 3
    else if(k == 3) {
      // gem (lvl 1): 0.15%
      loot[0] += rndEval(0, 15, n);
      // gem (lvl 2): 0.07%
      loot[1] += rndEval(n, 7, n);
      // gem (lvl 3): 0.08%
      loot[2] += rndEval(2 * n, 8, n);
      // gem (lvl 4): 0.01%
      loot[3] += rndEval(2 * n, n, 1);
      // silver (1): 5%, silver (5): 2.3%, silver (15): 0.2%
      loot[5] += rndEval(5 * n, 500, n) + 5 * rndEval(6 * n, 230, n) + 15 * rndEval(7 * n, 20, n);
      // gold (1): 0.01%
      loot[6] += rndEval(8 * n, n, 1);
      // artifact: 0.04%
      loot[7] += rndEval(9 * n, 4, n);
    }
    // for tier 4
    else if(k == 4) {
      // gem (lvl 1): 0.24%
      loot[0] += rndEval(0, 24, n);
      // gem (lvl 2): 0.06%
      loot[1] += rndEval(n, 6, n);
      // gem (lvl 3): 0.05%
      loot[2] += rndEval(2 * n, 5, n);
      // gem (lvl 4): 0.08%
      loot[3] += rndEval(3 * n, 8, n);
      // silver (1): 7%, silver (5): 3.75%, silver (15): 1%
      loot[5] += rndEval(5 * n, 700, n) + 5 * rndEval(6 * n, 375, n) + 15 * rndEval(7 * n, 100, n);
      // gold (1): 0.03%
      loot[6] += rndEval(8 * n, 3, n);
      // artifact: 0.13%
      loot[7] += rndEval(9 * n, 13, n);
    }
    // for tier 5
    else if(k == 5) {
      // gem (lvl 1): 0.25%
      loot[0] += rndEval(0, 25, n);
      // gem (lvl 2): 0.06%
      loot[1] += rndEval(n, 6, n);
      // gem (lvl 3): 0.08%
      loot[2] += rndEval(2 * n, 8, n);
      // gem (lvl 4): 0.06%
      loot[3] += rndEval(3 * n, 6, n);
      // gem (lvl 5): 0.03%
      loot[4] += rndEval(4 * n, 3, n);
      // silver (1): 10%, silver (5): 5.75%, silver (15): 3.4%
      loot[5] += rndEval(5 * n, 1000, n) + 5 * rndEval(6 * n, 575, n) + 15 * rndEval(7 * n, 340, n);
      // gold (1): 0.08%
      loot[6] += rndEval(8 * n, 8, n);
      // artifact: 0.4%
      loot[7] += rndEval(9 * n, 40, n);
      // key: 0.02%
      loot[8] += rndEval(10 * n, 2, n);
    }
    // any other tier is invalid
    else {
      // throw an exception
      require(false);
    }

    // for bottom of the stack blocks
    for(uint16 i = 0; i < b; i++) {
      // generate some random data to work with
      uint256 rnd = Random.generate256(11 * n + i);

      // determine how many items we get based on low 16 bits of the randomness
      uint256 items = 2 + Random.uniform(rnd, 16, 3);

      // generate that amount of items
      for(uint8 j = 0; j < items; j++) {
        // generate random value in range [0, 10000)
        // using bits (16, 88] - (16, 136]
        uint256 rnd10000 = Random.uniform(rnd >> (16 + 24 * j), 24, 10000);

        // generate loot according to the probabilities
        // gem (lvl 1): 2.17%
        if(rnd10000 < 217) {
          loot[0]++;
        }
        // gem (lvl 2): 1.5%
        else if(rnd10000 < 367) {
          loot[1]++;
        }
        // gem (lvl 3): 0.5%
        else if(rnd10000 < 417) {
          loot[2]++;
        }
        // gem (lvl 4): 0.2%
        else if(rnd10000 < 437) {
          loot[3]++;
        }
        // gem (lvl 5): 0.12%
        else if(rnd10000 < 449) {
          loot[4]++;
        }
        // silver (1): 62%
        else if(rnd10000 < 6649) {
          loot[5]++;
        }
        // silver (5): 26%
        else if(rnd10000 < 9249) {
          loot[5] += 5;
        }
        // silver (15): 6%
        else if(rnd10000 < 9849) {
          loot[5] += 15;
        }
        // gold (1): 0.37%
        else if(rnd10000 < 9886) {
          loot[6]++;
        }
        // artifact: 1.1%
        else if(rnd10000 < 9996) {
          loot[7]++;
        }
        // key: 0.04%
        else {
          loot[8]++;
        }
      }
    }

    // return the loot
    return loot;
  }

  /**
   * @dev Auxiliary function to calculate amount of successful experiments
   *      in `n` iterations with the `p` probability each
   * @param seedOffset seed offset to be used for random generation, there
   *      will be `n / 10` of seeds used [seedOffset, seedOffset + n / 10)
   * @param p probability of successful event in bp (basis point, ‱)
   * @param n number of experiments to launch
   */
  function rndEval(uint16 seedOffset, uint16 p, uint16 n) public view returns(uint16 amount) {
    // variable to store some randomness to work with
    uint256 rnd;

    // we perform `iterations` number of iterations
    for(uint16 i = 0; i < n; i++) {
      // each 10 iterations starting from iteration 0
      if(i % 10 == 0) {
        // generate new randomness to work with
        rnd = Random.generate256(seedOffset + i / 10);
      }

      // generate random value in the [0, 10000) range
      uint16 rnd10000 = uint16(Random.uniform(rnd >> 24 * (i % 10), 24, 10000));

      // check if we've got a probability hit
      if(rnd10000 < p) {
        // and if yes we increase the counter
        amount++;
      }
    }

    // return the result
    return amount;
  }

  /**
   * @notice Binds several gems and (optionally) artifacts to land plots
   *      and starts mining of these plots in a single transaction
   * @dev Bulk version of the `bind()` function
   * @dev Locks all the tokens passed as parameters
   * @dev Throws if any of the tokens is already locked
   * @dev Throws if any of the tokens specified doesn't exist or
   *      doesn't belong to transaction sender
   * @dev Throws if arrays lengths provided mismatch
   * @dev Throws if arrays provided contain duplicates
   * @dev Throws if arrays specified are zero-sized
   * @param plotIds an array of IDs of the land plots to mine
   * @param gemIds an array of IDs of the gems to mine land plots with
   * param artifactIds an array of IDs of the artifacts to affect the gems
   *      properties during mining process
   */
  function bulkBind(uint24[] memory plotIds, uint24[] memory gemIds) public {
    // verify arrays have same lengths
    require(plotIds.length == gemIds.length);
    //require(plotIds.length == artifactIds.length);

    // ensure arrays are not zero sized
    require(plotIds.length != 0);

    // simply iterate over each element
    for(uint32 i = 0; i < plotIds.length; i++) {
      bind(plotIds[i], gemIds[i]);
    }
  }

  /**
   * @notice Releases several gems and artifacts (if any) bound earlier
   *      with `bind()` or `bulkBind()` from land plots and stops mining of plots
   * @dev Bulk version of the `release()` function
   * @dev Saves updated land plots states into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev Unlocks all the tokens involved (previously bound)
   * @dev Throws if array specified is zero-sized
   * @dev Throws if any of the land plot tokens specified
   *      doesn't exist or doesn't belong to transaction sender
   * @dev Throws if any of the land plots specified is not in mining state
   *      (was not bound previously using `bind()` or `bulkBind()`)
   * @param plotIds an array of IDs of the land plots to stop mining
   */
  function bulkRelease(uint24[] memory plotIds) public {
    // ensure arrays are not zero sized
    require(plotIds.length != 0);

    // simply iterate over each element
    for(uint32 i = 0; i < plotIds.length; i++) {
      // delegate call to `release`
      release(plotIds[i]);
    }
  }

  /**
   * @notice Updates several plots states without releasing gems and artifacts (if any)
   *      bound earlier with `bind()` or `bulkBind()` from land plots, doesn't stop mining
   * @dev Bulk version of the `update()` function
   * @dev Saves updated land plots states into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev All the tokens involved (previously bound) remain in a locked state
   * @dev Throws if array specified is zero-sized
   * @dev Throws if any of the land plot tokens specified
   *      doesn't exist or doesn't belong to transaction sender
   * @dev Throws if any of the land plots specified is not in mining state
   *      (was not bound previously using `bind()` or `bulkBind()`)
   * @param plotIds an array of IDs of the land plots to update states for
   */
  function bulkUpdate(uint24[] memory plotIds) public {
    // ensure arrays are not zero sized
    require(plotIds.length != 0);

    // simply iterate over each element
    for(uint32 i = 0; i < plotIds.length; i++) {
      // delegate call to `update`
      update(plotIds[i]);
    }
  }

  /**
   * @notice Evaluates current state of several plots without performing a transaction
   * @dev Bulk version of the `evaluate()` function
   * @dev Doesn't update land plots states in the distributed ledger
   * @dev May be used by frontend to display current mining state close to realtime
   * @dev Throws if array specified is zero-sized
   * @dev Throws if any of the land plots specified is not in mining state
   *      (was not bound previously using `bind()` or `bulkBind()`)
   * @param plotIds an array of IDs of the land plots to evaluate current states for
   * @return an array of evaluated current mining block indexes for the given land plots array
   */
  function bulkEvaluate(uint24[] memory plotIds) public view returns(uint8[] memory offsets) {
    // ensure arrays are not zero sized
    require(plotIds.length != 0);

    // allocate memory for the array
    offsets = new uint8[](plotIds.length);

    // simply iterate over each element
    for(uint32 i = 0; i < plotIds.length; i++) {
      // delegate call to `evaluate`
      offsets[i] = evaluate(plotIds[i]);
    }

    // offsets array is returned automatically
    return offsets;
  }


  /**
   * @notice Determines how deep can particular gem mine on a particular plot
   * @dev This function verifies current plot offset and based on the gem's level
   *      and plot's offset determines how deep this gem can mine
   * @dev Throws if the gem or plot specified doesn't exist
   * @param gemId ID of the gem to use
   * @param plotId ID of the plot to mine
   * @return number of blocks the gem can mine, zero if it cannot mine more
   */
  function gemMinesTo(uint24 gemId, uint24 plotId) public view returns(uint8) {
    // delegate call to `levelAllowsToMineTo`
    return TierMath.getTierDepthOrMined(plotInstance.getTiers(plotId), gemInstance.getLevel(gemId));
  }

  /**
   * @notice Determines how many minutes of energy is required to mine
   *      `n` blocks of tier number `tier`
   * @dev See also `energyToBlocks` function
   * @param tier tier number of interest
   * @param n number of blocks to mine in the specified tier
   * @return required energy in minutes
   */
  function blocksToEnergy(uint8 tier, uint8 n) public view returns(uint32) {
    // calculate based on the tier number and return
    // array bounds keep tier index to be valid
    return MINUTES_TO_MINE[tier - 1] * n;
  }

  /**
   * @notice Determines how many blocks in tier number `tier` can be
   *      mined using the energy of `energy` minutes
   * @dev See also `blocksToEnergy` function
   * @param tier tier number of interest
   * @param energy available energy in minutes
   * @return number of blocks which can be mined
   */
  function energyToBlocks(uint8 tier, uint32 energy) public view returns(uint8) {
    // calculate based on the tier number
    uint32 blocks = energy / MINUTES_TO_MINE[tier - 1];

    // array bounds keep tier index to be valid
    return blocks < 0xFF? uint8(blocks): 0xFF;
  }

  /**
   * @notice Determines effective mining energy of a particular gem
   * @notice Gems of any grades accumulate mining energy when mining
   * @dev See `energeticAgeOf` and `effectiveEnergy` functions for more details
   * @dev Throws if the gem specified doesn't exist
   * @param gemId ID of the gem to calculate effective mining energy for
   * @return effective mining energy for the specified gem
   */
  function effectiveMiningEnergyOf(uint24 gemId) public view returns(uint32) {
    // delegate call to `effectiveMiningEnergyWith` passing zero plot ID
    return effectiveMiningEnergyWith(gemId, 0);
  }

  /**
   * @notice Determines effective mining energy of a particular gem
   * @notice Gems of any grades accumulate mining energy when mining
   * @dev See `energeticAgeOf` and `effectiveEnergy` functions for more details
   * @dev Throws if the gem specified doesn't exist
   * @param gemId ID of the gem to calculate effective mining energy for
   * @param plotId ID of the plot the gem mines, usually not important and can
   *      be set to zero, but may result in 50% bonus for a combination
   *      of country special gem and a plot belonging to that country
   * @return effective mining energy for the specified gem
   */
  function effectiveMiningEnergyWith(uint24 gemId, uint24 plotId) private view returns(uint32) {
    // determine mining energy of the gem,
    // by definition it's equal to its energetic age (converted to minutes)
    // verifies gem's existence under the hood
    uint32 energy = energeticAgeOf(gemId);

    // if energy is not zero
    if(energy != 0) {
      // convert mining energy into effective mining energy
      energy = effectiveEnergyWith(gemId, plotId, energy);
    }

    // return energy value
    return energy;
  }

  /**
   * @notice Determines effective resting energy of a particular gem
   * @notice Gems of grades A, AA and AAA accumulate resting energy when not mining
   * @dev See `restingEnergyOf` and `effectiveEnergy` functions for more details
   * @dev Throws if the gem specified doesn't exist
   * @param gemId ID of the gem to calculate effective resting energy for
   * @return effective resting energy for the specified gem
   */
  function effectiveRestingEnergyOf(uint24 gemId) public view returns(uint32) {
    // delegate call to `effectiveRestingEnergyWith` passing zero plot ID
    return effectiveRestingEnergyWith(gemId, 0);
  }

  /**
   * @notice Determines effective resting energy of a particular gem
   * @notice Gems of grades A, AA and AAA accumulate resting energy when not mining
   * @dev See `restingEnergyOf` and `effectiveEnergy` functions for more details
   * @dev Throws if the gem specified doesn't exist
   * @param gemId ID of the gem to calculate effective resting energy for
   * @param plotId ID of the plot the gem mines, usually not important and can
   *      be set to zero, but may result in 50% bonus for a combination
   *      of country special gem and a plot belonging to that country
   * @return effective resting energy for the specified gem
   */
  function effectiveRestingEnergyWith(uint24 gemId, uint24 plotId) private view returns(uint32) {
    // determine resting energy of the gem
    // verifies gem's existence under the hood
    uint32 energy = restingEnergyOf(gemId);

    // if energy is not zero (grades A, AA and AAA)
    if(energy != 0) {
      // convert resting energy into effective resting energy
      energy = effectiveEnergyWith(gemId, plotId, energy);
    }

    // return energy value
    return energy;
  }

  /**
   * @notice Calculates effective energy of the gem based on its base energy and grade
   * @dev Effective energy is base energy multiplied by mining rate of the gem
   * @param gemId ID of the gem to calculate effective energy for
   * @param energy base energy of the gem
   * @return effective energy of the gem in minutes
   */
  function effectiveEnergyOf(uint24 gemId, uint32 energy) public view returns(uint32) {
    // delegate call to `effectiveEnergyWith` passing zero plot ID
    return effectiveEnergyWith(gemId, 0, energy);
  }

  /**
   * @notice Calculates effective energy of the gem based on its base energy and grade
   * @dev Effective energy is base energy multiplied by mining rate of the gem
   * @dev In rare cases (for special gems) additional bonuses may apply
   * @param gemId ID of the gem to calculate effective energy for
   * @param plotId ID of the plot the gem mines, usually not important and can
   *      be set to zero, but may result in 50% bonus for a combination
   *      of country special gem and a plot belonging to that country (high 8 bits)
   * @param energy base energy of the gem
   * @return effective energy of the gem in minutes
   */
  function effectiveEnergyWith(uint24 gemId, uint24 plotId, uint32 energy) private view returns(uint32) {
    // determine effective gem energy of the gem,
    // taking into account its mining rate,
    // and return the result
    return uint32(uint64(energy) * miningRateWith(gemId, plotId) / 1000000);
  }

  /**
   * @notice Determines mining rate of a particular gem based on its grade
   * @dev See `miningRate` function for more details
   * @dev Throws if gem specified doesn't exist
   * @param gemId ID of the gem to calculate mining rate for
   * @return mining rate of the gem multiplied by 10^6
   */
  function miningRateOf(uint24 gemId) public view returns(uint32 rate) {
    // delegate call to `miningRateWith` passing zero plot ID
    return miningRateWith(gemId, 0);
  }

  /**
   * @notice Determines mining rate of a particular gem based on its grade
   * @dev In rare cases (for special gems) additional bonuses may apply
   * @dev See `miningRate` function for more details
   * @dev Throws if gem specified doesn't exist
   * @param gemId ID of the gem to calculate mining rate for
   * @param plotId ID of the plot the gem mines, usually not important and can
   *      be set to zero, but may result in 50% bonus for a combination
   *      of country special gem and a plot belonging to that country
   * @return mining rate of the gem multiplied by 10^6
   */
  function miningRateWith(uint24 gemId, uint24 plotId) public view returns(uint32 rate) {
    // read the color of the gem
    uint8 color = gemInstance.getColor(gemId);

    // read the grade of the given gem
    // verifies gem existence under the hood
    uint32 grade = gemInstance.getGrade(gemId);

    // calculate base mining rate value based on the grade
    // delegate call to `miningRate`
    rate = miningRate(grade);

    // load gem bound timestamp
    uint32 bound = plots[gems[gemId]].bound;

    // if gem is not bound within the miner, calculate as if its bound right now
    // determine the month index of that bound
    uint8 monthBound = TimeUtils.monthIndexOf(bound == 0? now32(): bound);

    // for gem color equal current month – add 5% mining rate bonus
    if(color == monthBound) {
      // multiplication by 21 may overflow uint32 in this particular case
      // since maximum value which `miningRate` may produce is 268,103,795,
      // multiplied by 21 is 5,630,179,695 (0x1 4F 95 B9 6F)
      // therefore do division first and multiplication next
      // maximum possible rate at this point is 281,508,969
      rate = rate / 20 * 21;
    }

    // for special gems in range (0xF000, 0xF100)
    if(gemId > 0xF000 && gemId < 0xF100) {
      // define variable to read multiplier and color into
      uint8 multiplier;
      uint8 specialColor;

      // load the data - delegate call to `getSpecialGem`
      (multiplier, specialColor) = getSpecialGem(gemId);

      // if color is set match it with the month when mining started,
      // if not – ignore color and treat it as a match
      // if multiplier is not set (zero) – do not apply it
      if(multiplier != 0 && (specialColor == 0 || specialColor == monthBound)) {
        // apply special gem mining rate multiplier
        // maximum percent value is 255, which means multiplication by 3.55
        // maximum outcome of this multiplication is 999,356,595, which fits into uint32
        // note: multiplier is uint8 and overflows the addition
        rate = rate / 100 * (uint16(100) + multiplier);
      }
    }
    // for special country gems in range (0xF100, 0xF200)
    // no special gem for Antarctica possible (country ID 0)
    // Bermuda Triangle may have special gem (country ID 255)
    else if(gemId > 0xF100 && gemId < 0xF200) {
      // additionally verify that plot country ID (high 8 bits) matches with the gem ID
      // if plot ID is not specified (zero) match is impossible
      if(plotId >> 16 == gemId - 0xF100) {
        // apply special country gem bonus rate of 50%
        // maximum intermediary value here is 2,998,069,785, which fits into uint32
        // maximum final outcome of this multiplication is 1,499,034,892
        rate = rate * 3 / 2;
      }
    }

    // return the result
    return rate;
  }

  /**
   * @notice Calculates mining rate of the gem by its grade
   * @dev Calculates mining rate `r` of the gem, based on its grade type `e`
   *      and grade value `u` according to the formulas:
   *        r = 1.0 + 0.25 * u * 10^-6, e = 1
   *        r = 2.0 + 0.5  * u * 10^-6, e = 2
   *        r = 3.3 + 0.9  * u * 10^-6, e = 3
   *        r = 7.2 + 1.8  * u * 10^-6, e = 4
   *        r = 25  + 6    * u * 10^-6, e = 5
   *        r = 50  + 13   * u * 10^-6, e = 6
   * @dev Gem's grade type and value are extracted from the packed `grade`
   * @dev The value returned is multiplied by 10^6
   * @dev Maximum allowed input is 0x06FFFFFF (AAA, 16,777,215)
   * @dev Maximum possible output is 0xFFAF073 (268,103,795)
   * @param grade grade of the gem,
   *      high 8 bits of which contain grade type e = [1, 2, 3, 4, 5, 6]
   *      low 24 bits contain grade value u = [0, 1000000)
   * @return `r * 10^6`, where `r` is the mining rate of the gem of grade `grade`
   */
  function miningRate(uint32 grade) public pure returns(uint32) {
    // extract grade type of the gem - high 8 bits
    uint32 e = grade >> 24;

    // extract grade value of the gem - low 24 bits
    uint32 u = 0xFFFFFF & grade;

    // for grade D: e = 1
    if(e == 1) {
      // r = 1 + 0.25 * u * 10^-6
      return 1000000 + u / 4;
    }

    // for grade C: e = 2
    if(e == 2) {
      // r = 2 + 0.5 * u * 10^-6
      return 2000000 + u / 2;
    }

    // for grade B: e = 3
    if(e == 3) {
      // r = 3.3 + 0.9 * u * 10^-6
      return 3300000 + 9 * u / 10;
    }

    // for grade A: e = 4
    if(e == 4) {
      // r = 7.2 + 1.8 * u * 10^-6
      return 7200000 + 9 * u / 5;
    }

    // for grade AA: e = 5
    if(e == 5) {
      // r = 25 + 6 * u * 10^-6
      return 25000000 + 6 * u;
    }

    // for grade AAA: e = 6
    if(e == 6) {
      // r = 50 + 13 * u * 10^-6
      return 50000000 + 13 * u;
    }

    // if we get here it means the grade is not valid
    // grade is not one of D, C, B, A, AA, AAA
    // throw an exception
    require(false);

    // return fallback default value equal to one
    return 1000000;
  }

  /**
   * @notice Calculates resting energy for the gem specified,
   *      see `restingEnergy` for more details on resting energy
   * @notice The gem accumulates resting energy when it's not mining
   * @dev Throws if gem with the given ID doesn't exist
   * @dev Maximum output value is 85,479,532 minutes (162 years)
   * @param gemId ID of the gem to calculate resting energy for
   * @return resting energy of the given gem (minutes of resting)
   */
  function restingEnergyOf(uint24 gemId) public view returns(uint32) {
    // determine gems' grade type
    // verifies gem existence under the hood
    uint8 e = gemInstance.getGradeType(gemId);

    // resting energy is defined only for gems with grade A, AA and AAA
    if(e < 4) {
      // for grades D, C and B it is zero by definition
      return 0;
    }

    // determine energetic age of the gem - delegate call to `energeticAgeOf`
    uint32 age = gemInstance.getAge(gemId) + energeticAgeOf(gemId);

    // calculate the resting energy - delegate call to `restingEnergy`
    // and return the result
    return restingEnergy(age);
  }

  /**
   * @notice Resting Energy (R) formula implementation:
   *      R = -7 * 10^-6 * a^2 + 0.5406 * a, if a < 37193, R ∈ [0, 10423)
   *      R = 10423 + 0.0199 * (a - 37193), if a ≥ 37193, R ∈ [10423, ∞)
   *      where `a` stands for Energetic Age of the gem (minutes)
   * @dev Linear threshold `37193` in the equation above is
   *      the root of the equation `-7 * 10^-6 * x^2 + 0.5406x = 0.0199`,
   *      where x is gem age in minutes and `k = 0.0199` is energy increase per minute,
   *      which is calculated as `k = 10437 / 525600`,
   *      where `525600 = 365 * 24 * 60` is number of minutes in one year and `n = 10437`
   *      is the right root of equation `-7 * 10^-6 * x^2 + 0.5406x = 0`,
   *      `n` is the number of minutes to parabola peak
   * @dev Maximum input value is 4,294,967,295 minutes (8171 years)
   * @dev Maximum output value is 85,479,532 minutes (162 years)
   * @param energeticAge number of minutes the gem was not mining
   * @return Resting Energy (R) calculated based on Energetic Age (a) provided
   */
  function restingEnergy(uint32 energeticAge) public pure returns(uint32) {
    // to avoid arithmetic overflow we need to use significantly more
    // bits than the original 32-bit number, 128 bits is more than enough
    uint128 a = energeticAge;

    // the result of the calculation is stored in 128-bit integer as well
    uint128 r = 0;

    // perform calculation according to the formula (see function header)
    // if a < 37193:
    if(a < 37193) {
      // R = -7 * 10^-6 * a^2 + 0.5406 * a
      r = 2703 * a / 5000 - 7 * a ** 2 / 1000000;
    }
    // if a >= 37193
    else {
      // R = 10423 + 0.0199 * (a - 37193)
      r = 10423 + (a - 37193) * 199 / 10000;
    }

    // cast the result into uint32 and return the result
    return uint32(r);
  }

  /**
   * @notice Unused Energetic Age (a0) formula implementation:
   *                            __________________________
   *      a0 = 38614 - 71429 * √0.29225 - 2.8 * 10^-5 * R , if R < 10423, a0 ∈ [0, 38614)
   *      a0 = 38614 + (R - 10423) / 0.0199, if R ≥ 10423, a0 ∈ (38614, ∞)
   *      where `R` stands for Unused Resting Energy of the gem (minutes)
   * @dev See `restingEnergy` function and Resting Energy original formula
   *      for more information about the inverse
   * @dev The square root in the first part of the formula is calculated
   *      using fast inverse square root algorithm by Michael Abrash from id Software
   * @dev See https://en.wikipedia.org/wiki/Fast_inverse_square_root
   * @param unusedRestingEnergy resting energy in minutes the gem accumulated while was not mining
   * @return Energetic Age (a) calculated based on Resting Energy (R) provided
   */
  function unusedEnergeticAge(uint32 unusedRestingEnergy) public pure returns(uint32) {
    // to avoid arithmetic overflow we need to use more
    // bits than the original 16-bit number, 64 bits is enough
    int64 r = unusedRestingEnergy;

    // the result of the calculation is stored in 64-bit integer as well
    int64 a = 0;

    // for small inputs just approximate result with linear function
    if(r < 413) {
      // approximate parabola with a linear function y = 0.5406 * x,
      // and calculate the reverse - x = y / 0.5406
      a = 5000 * r / 2703;
    }
    // perform calculation according to the formula (see function header)
    // if r < 10423 (corresponds to a < 37193 case)
    else if(r < 10423) {
      // Newton method - initial guess
      a = 18596;

      // apply few Newton iterations
      for(uint8 i = 0; i < 3 || (r > 10000 && i < 5); i++) {
        // according to formula x1 = x0 - f(x0) / f'(x0)
        a = a - (540600 * a - 7 * int64(uint64(a) ** 2) - r * 1000000) / (540600 - 14 * a);
      }
    }
    // if r ≥ 10423 (corresponds to a ≥ 37193 case)
    else {
      // R = 10423 + 0.0199 * (a - 37193)
      // a = 37193 + (R - 10423) / 0.0199
      a = 37193 + 10000 * (r - 10423) / 199;
    }

    // cast the result into uint32 and return
    return uint32(a);
  }

  /**
   * @dev Energetic age is the time period the gem accumulated energy
   * @dev The time is measured from the time when gem modified its properties
   *      (level or grade) or its state for the last time till now
   * @dev If the gem didn't change its properties or state since its genesis,
   *      the time is measured from gem's creation time
   * @dev For resting (non-mining) gems of grades A, AA and AAA energetic age
   *      is used to calculate their resting energy
   * @dev For mining gems of any grade energetic age is equal to mining energy
   * @param gemId ID of the gem to calculate energetic age for
   * @return energetic age of the gem in minutes
   */
  function energeticAgeOf(uint24 gemId) public view returns(uint32) {
    // read gem modification date, which can also be gem creation date
    uint32 modified = gemInstance.getModified(gemId);

    // get current time using test-friendly now32 function
    uint32 n32 = now32();

    // convert the time passed into minutes and return
    return n32 > modified? uint32(n32 - modified) / 60: 0;
  }

  /**
   * @dev Proxy function for built-in 'now', returns 'now' as uint32
   * @dev Testing time-dependent functionality in Solidity is challenging.
   *      The time flows in unpredictable way, at variable speed
   *      from block to block, from miner to miner.
   *      Testrpc (ganache) doesn't solve the issue. It helps to unlock
   *      the speed of time changes introducing though numerous testrpc-specific
   *      problems.
   * @dev In most test cases, however, time change emulation on the block level
   *      is not required and contract-based simulation is enough.
   * @dev To simulate time change on contract level we introduce a `now32`
   *      proxy-function which proxies all calls to built-in 'now' function.
   *      It doesn't modify time and doesn't affect smart contract logic by any means.
   *      But it allows to extend this smart contract by a test smart contract,
   *      which will allow time change simulation by overriding this function only.
   * @return uint32(now) – current timestamp as uint32
   */
  function now32() public view returns(uint32) {
    // call built-in 'now' and return
    return uint32(now);
  }


}

