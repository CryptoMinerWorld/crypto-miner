pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./GemERC721.sol";
import "./PlotERC721.sol";
import "./SilverERC20.sol";
import "./GoldERC20.sol";
import "./ArtifactERC20.sol";
import "./FoundersKeyERC20.sol";
import "./ChestKeyERC20.sol";
import "./Math.sol";

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
 *      - GemERC721
 *      - PlotERC721
 *      - ArtifactERC721
 *
 * @dev Following tokens may be accessed for writing (token properties change when mining):
 *      - PlotERC721
 *
 * @dev Following tokens may be minted (token can be found in the land plot when mining):
 *      - GemERC721
 *          can be found usually close to last block of land // TODO: clarify
 *      - ArtifactERC721
 *          can be found usually close to last block of land // TODO: clarify
 *      - SilverERC20
 *          can be found usually close to last block of land // TODO: clarify
 *      - GoldERC20
 *          can be found usually close to last block of land // TODO: clarify
 *      - ArtifactERC20 // TODO: to be removed after ArtifactERC721 release
 *          can be found usually close to last block of land // TODO: clarify
 *      - FoundersKeyERC20
 *          can be found only after mining the last block of land in Antarctica
 *      - ChestKeyERC20
 *          can be found only after mining the last block of land
 *
 * @dev Following tokens may be locked or unlocked (tokens are locked when mining):
 *      - GemERC721
 *      - PlotERC721
 *      - ArtifactERC721
 *
 * @author Basil Gorin
 */
contract Miner is AccessControlLight {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant MINER_UID = 0x8efa3734774da9ddb6fa72666081cc4446bae6e3fd60bfb806961a11cdda45a0;

  /**
   * @dev Expected version (UID) of the deployed GemERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GEM_UID_REQUIRED = 0x0000000000000000000000000000000000000000000000000000000000000003;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant PLOT_UID_REQUIRED = 0x429c5993d58398640c80b2d9ff7667713a4d472cb2c3beda544c8d19e1ac1d54;

  /**
   * @dev Expected version (UID) of the deployed ArtifactERC721 instance
   *      this smart contract is designed to work with
   */
  // TODO: this value should be defined later, after ArtifactERC721 smart contract is released
  uint256 public constant ARTIFACT_UID_REQUIRED = 0x0000000000000000000000000000000000000000000000000000000000000000;

  /**
   * @dev Expected version (UID) of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant SILVER_UID_REQUIRED = 0x0000000000000000000000000000000000000000000000000000000000000030;

  /**
   * @dev Expected version (UID) of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GOLD_UID_REQUIRED = 0x00000000000000000000000000000000000000000000000000000000000000300;

  /**
   * @dev Expected version (UID) of the deployed ArtifactERC20 instance
   *      this smart contract is designed to work with
   */
  // TODO: this may be completely removed after ArtifactERC721 release
  uint256 public constant ARTIFACT_ERC20_UID_REQUIRED = 0xfe81d4b23218a9d32950b26fad0ab9d50928ece566126c1d1bf0c1bfe2666da6;

  /**
   * @dev Expected version (UID) of the deployed FoundersKeyERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant FOUNDERS_KEY_UID_REQUIRED = 0x70221dffd5103663ba8bf65a43517466ba616c4937710b99c7f003a7ae99fbc7;

  /**
   * @dev Expected version (UID) of the deployed ChestKeyERC20 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant CHEST_KEY_UID_REQUIRED = 0xbf1ea2fd198dbe93f19827f1e3144b045734667c5483124adc3715df6ce853f6;

  /**
   * @dev Auxiliary data structure used in `miningPlots` mapping to
   *      store information about gems and artifacts bound tto mine
   *      a particular plot of land
   * @dev Additionally it stores address of the player who initiated
   *      the `bind()` transaction and its unix timestamp
   */
  struct MiningData {
    /**
     * @dev ID of the gem which is mining the plot,
     *      the gem is locked when mining
     */
    uint32 gemId;

    /**
     * @dev ID of the artifact which is mining the plot,
     *      the artifact is locked when mining
     */
    uint16 artifactId;

    /**
     * @dev A player, an address who initiated `bind()` transaction
     */
    address player;

    /**
     * @dev Unix timestamp of the `bind()` transaction
     */
    uint32 bound;
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
   * @dev ArtifactERC721 deployed instance,
   *      tokens of that instance can be read, minted, locked and unlocked
   *
   * @dev Miner should have `ArtifactERC721.ROLE_TOKEN_CREATOR` permission to mint tokens
   * @dev Miner should have `ArtifactERC721.ROLE_STATE_PROVIDER` permission lock/unlock tokens
   */
  // TODO: uncomment when ready
  //ArtifactERC721 public artifactInstance;

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
  // TODO: to be removed when ArtifactERC721 is ready
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
   * @dev See `MiningData` data structure for more details
   */
  mapping(uint24 => MiningData) miningPlots;

  /**
   * @dev How many minutes of mining (resting) energy it takes
   *      to mine block of land depending on the tier number
   * @dev Array is zero-indexed, index 0 corresponds to Tier 1,
   *      index 4 corresponds to Tier 5
   */
  uint16[] public MINUTES_TO_MINE = [30, 240, 720, 1440, 2880];

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
  event RestingEnergyConsumed(address indexed _by, uint32 indexed gemId, uint32 energyLeft);

  /**
   * @dev May be fired in `bind()`
   * @param _by an address which executed transaction, usually owner of the tokens
   * @param plotId ID of the plot to mine (bound)
   * @param gemId ID of the gem which mines the plot (bound)
   * @param artifactId ID of the artifact used (bound)
   */
  event Bound(address indexed _by, uint24 indexed plotId, uint32 indexed gemId, uint16 artifactId);

  /**
   * @dev May be fired in `bind()` and `release()`. Fired in `update()`
   * @param _by an address which executed transaction, usually owner of the plot
   * @param plotId ID of the plot which was mined
   * @param offset mined depth for the plot
   */
  event Updated(address indexed _by, uint24 indexed plotId, uint8 offset);

  /**
   * @dev Fired in `release()`
   * @param _by an address which executed transaction, usually owner of the tokens
   * @param plotId ID of the plot released
   * @param gemId ID of the gem released
   * @param artifactId ID of the artifact released
   */
  event Released(address indexed _by, uint24 indexed plotId, uint32 indexed gemId, uint16 artifactId);

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
   *      the `TOKEN_UID` equal to `ARTIFACT_ERC20_UID_REQUIRED`
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
    //artifactInstance = ArtifactERC721(_artifact); // TODO: uncomment
    silverInstance = SilverERC20(_silver);
    goldInstance = GoldERC20(_gold);
    artifactErc20Instance = ArtifactERC20(_artifactErc20);
    foundersKeyInstance = FoundersKeyERC20(_foundersKey);
    chestKeyInstance = ChestKeyERC20(_chestKey);

    // verify smart contract versions
    require(gemInstance.TOKEN_VERSION() == GEM_UID_REQUIRED);
    require(plotInstance.TOKEN_UID() == PLOT_UID_REQUIRED);
    //require(artifactInstance.TOKEN_UID() == ARTIFACT_UID_REQUIRED); // TODO: uncomment
    require(silverInstance.TOKEN_VERSION() == SILVER_UID_REQUIRED);
    require(goldInstance.TOKEN_VERSION() == GOLD_UID_REQUIRED);
    require(artifactErc20Instance.TOKEN_UID() == ARTIFACT_ERC20_UID_REQUIRED);
    require(foundersKeyInstance.TOKEN_UID() == FOUNDERS_KEY_UID_REQUIRED);
    require(chestKeyInstance.TOKEN_UID() == CHEST_KEY_UID_REQUIRED);
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
   * @param artifactId ID of the artifact to affect the gem
   *      properties during mining process
   */
  function bind(uint24 plotId, uint32 gemId, uint16 artifactId) public {
    // verify mining feature is enabled
    require(isFeatureEnabled(FEATURE_MINING_ENABLED));

    // verify all the tokens passed belong to sender,
    // verifies token existence under the hood
    require(plotInstance.ownerOf(plotId) == msg.sender);
    require(gemInstance.ownerOf(gemId) == msg.sender);
    //require(artifactId == 0 || artifactInstance.ownerOf(artifactId) == msg.sender); // TODO: uncomment

    // verify all tokens are not in a locked state
    require(plotInstance.getState(plotId) & DEFAULT_MINING_BIT == 0);
    require(gemInstance.getState(gemId) & DEFAULT_MINING_BIT == 0);
    //require(artifactId == 0 || artifactInstance.getState(artifactId) & DEFAULT_MINING_BIT == 0); // TODO: uncomment

    // determine maximum depth this gem can mine to (by level)
    uint8 maxOffset = levelAllowsToMineTo(gemId, plotId);

    // determine gem's effective resting energy, taking into account its grade
    uint32 energy = effectiveRestingEnergyOf(gemId);

    // define variable to store new plot offset
    uint8 offset;

    // delegate call to `evaluateWith`
    (offset, energy) = evaluateWith(plotId, maxOffset, energy);

    // in case when offset has increased, we perform initial mining
    // in the same transaction
    if(offset > plotInstance.getOffset(plotId)) {
      // update plot's offset
      plotInstance.mineTo(plotId, offset);

      // save unused resting energy into gem's state
      gemInstance.setState(gemId, uint48(energy) << 16);

      // TODO: loot processing

      // emit an energy consumed event
      emit RestingEnergyConsumed(msg.sender, gemId, energy);

      // emit plot updated event
      emit Updated(msg.sender, plotId, offset);
    }

    // if gem's level allows to mine deeper,
    if(offset < maxOffset) {
      // lock the plot, erasing everything else in its state
      plotInstance.setState(plotId, DEFAULT_MINING_BIT);
      // lock the gem, keeping saved resting energy value
      gemInstance.setState(gemId, gemInstance.getState(gemId) | DEFAULT_MINING_BIT);
      // lock artifact if any, also erasing everything in its state
      // artifactInstance.setState(artifactId, DEFAULT_MINING_BIT);

      // store mining information in the internal mapping
      miningPlots[plotId] = MiningData({
        gemId: gemId,
        artifactId: artifactId,
        player: msg.sender,
        bound: uint32(now)
      });

      // emit en event
      emit Bound(msg.sender, plotId, gemId, artifactId);
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

    // if offset changed
    if(offset != plotInstance.getOffset(plotId)) {
      // update plot's offset
      plotInstance.mineTo(plotId, offset);

      // emit an event
      emit Updated(msg.sender, plotId, offset);
    }

    // release tokens involved
    // load binding data
    MiningData memory m = miningPlots[plotId];

    // unlock the plot, erasing everything else in its state
    plotInstance.setState(plotId, 0);
    // unlock the gem, keeping saved resting energy value
    gemInstance.setState(m.gemId, gemInstance.getState(m.gemId) & ERASE_MINING_BIT);
    // unlock artifact if any, also erasing everything in its state
    // artifactInstance.setState(m.artifactId, 0);

    // erase mining information in the internal mapping
    delete miningPlots[plotId];

    // emit en event
    emit Released(msg.sender, plotId, m.gemId, m.artifactId);
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

    // update plot's offset
    plotInstance.mineTo(plotId, offset);

    // update gem's state to erase energy, keeping it locked
    gemInstance.setState(miningPlots[plotId].gemId, DEFAULT_MINING_BIT);

    // emit an event
    emit Updated(msg.sender, plotId, offset);
  }

  /**
   * @notice Evaluates current state of the plot without performing a transaction
   * @dev Doesn't update land plot state in the distributed ledger
   * @dev Used internally by `release()` and `update()` to calculate state of the plot
   * @dev May be used by frontend to display current mining state close to realtime
   * @param plotId ID of the land plot to evaluate current state for
   * @return evaluated current mining block index for the given land plot
   */
  function evaluate(uint24 plotId) public constant returns(uint8) {
    // verify plot is locked
    // verifies token existence under the hood
    require(plotInstance.getState(plotId) & DEFAULT_MINING_BIT != 0);

    // load binding data
    MiningData memory m = miningPlots[plotId];

    // ensure binding data entry exists
    require(m.bound != 0);

    // determine maximum depth this gem can mine to (by level)
    uint8 maxOffset = levelAllowsToMineTo(m.gemId, plotId);

    // determine gem's effective mining energy
    uint32 energy = effectiveMiningEnergyOf(m.gemId);

    // define variable to store new plot offset
    uint8 offset;

    // delegate call to `evaluateWith`
    (offset, energy) = evaluateWith(plotId, maxOffset, energy);

    // return calculated offset
    return offset;
  }

  /**
   * @notice Evaluates current state of the plot without performing a transaction
   * @dev Doesn't update land plot state in the distributed ledger
   * @dev Used internally by `release()` and `update()` to calculate state of the plot
   * @dev May be used by frontend to display current mining state close to realtime
   * @param plotId ID of the land plot to evaluate current state for
   * @param maxOffset maximum offset the gem can mine to
   * @param initialEnergy available energy to be spent by the gem
   * @return a tuple containing:
   *      offset – evaluated current mining block index for the given land plot
   *      energy - energy left after mining
   */
  function evaluateWith(
    uint24 plotId,
    uint8 maxOffset,
    uint32 initialEnergy
  ) private constant returns(
    uint8 offset,
    uint32 energyLeft
  ) {
    // determine current plot offset, this will also be returned
    offset = plotInstance.getOffset(plotId);

    // verify the gem can mine that plot
    require(offset < maxOffset);

    // init return energy value with an input one
    energyLeft = initialEnergy;

    // in case when energy is not zero, we perform initial mining
    // in the same transaction
    if(energyLeft != 0) {
      // iterate over all tiers
      for(uint8 i = 1; i <= plotInstance.getNumberOfTiers(plotId); i++) {
        // determine tier offset
        uint8 tierDepth = plotInstance.getTierDepth(plotId, i);

        // if current tier depth is bigger than offset – we mine
        if(offset < tierDepth) {
          // determine how deep we can mine in that tier
          uint8 canMineTo = offset + energyToBlocks(i, energyLeft);

          // we are not crossing the tier though
          uint8 willMineTo = uint8(Math.min(canMineTo, tierDepth));

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
   * @param artifactIds an array of IDs of the artifacts to affect the gems
   *      properties during mining process
   */
/*
  function bulkBind(uint24[] plotIds, uint32[] gemIds, uint16[] artifactIds) public {
    // TODO: implement
  }
*/

  /**
   * @notice Releases several gems and artifacts (if any) bound earlier
   *      with `bind()` or `bulkBind()` from land plots and stops mining of plots
   * @dev Bulk version of the `release()` function
   * @dev Saves updated land plots states into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev Unlocks all the tokens involved (previously bound)
   * @dev Throws if any of the land plot tokens specified
   *      doesn't exist or doesn't belong to transaction sender
   * @dev Throws if any of the land plots specified is not in mining state
   *      (was not bound previously using `bind()` or `bulkBind()`)
   * @param plotIds an array of IDs of the land plots to stop mining
   */
/*
  function bulkRelease(uint24[] plotIds) public {
    // TODO: implement
  }
*/

  /**
   * @notice Updates several plots states without releasing gems and artifacts (if any)
   *      bound earlier with `bind()` or `bulkBind()` from land plots, doesn't stop mining
   * @dev Bulk version of the `update()` function
   * @dev Saves updated land plots states into distributed ledger and may
   *      produce (mint) some new tokens (silver, gold, etc.)
   * @dev All the tokens involved (previously bound) remain in a locked state
   * @dev Throws if any of the land plot tokens specified
   *      doesn't exist or doesn't belong to transaction sender
   * @dev Throws if any of the land plots specified is not in mining state
   *      (was not bound previously using `bind()` or `bulkBind()`)
   * @param plotIds an array of IDs of the land plots to update states for
   */
/*
  function bulkUpdate(uint24[] plotIds) public {
    // TODO: implement
  }
*/

  /**
   * @notice Evaluates current state of several plots without performing a transaction
   * @dev Bulk version of the `evaluate()` function
   * @dev Doesn't update land plots states in the distributed ledger
   * @dev May be used by frontend to display current mining state close to realtime
   * @param plotIds an array of IDs of the land plots to evaluate current states for
   * @return an array of evaluated current mining block indexes for the given land plots array
   */
/*
  function bulkEvaluate(uint24[] plotIds) public constant returns(uint8[]) {
    // TODO: implement
  }
*/


  /**
   * @notice Determines how many blocks can particular gem mine on a particular plot
   * @dev This function verifies current plot offset and based on the gem's level
   *      and plot's offset determines how many blocks this gem can mine deeper
   * @dev Zero return value means that the gem cannot mine deeper, which in turn
   *      means that either the gem level doesn't allow to mine deeper
   *      or that the plot is already fully mined
   * @dev Throws if the gem or plot specified doesn't exist
   * @param gemId ID of the gem to use
   * @param plotId ID of the plot to mine
   * @return number of blocks the gem can mine, zero if it cannot mine more
   */
  function levelAllowsToMineBy(uint32 gemId, uint24 plotId) public constant returns(uint8) {
    // delegate call to `getOffset` and `canMineTo` and return the difference
    return levelAllowsToMineTo(gemId, plotId) - plotInstance.getOffset(plotId);
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
  function levelAllowsToMineTo(uint32 gemId, uint24 plotId) public constant returns(uint8) {
    // get plot offset
    uint8 offset = plotInstance.getOffset(plotId);

    // verify if plot is already mined
    if(plotInstance.isFullyMined(plotId)) {
      // we cannot go deeper in that case
      return offset;
    }

    // read the gem's level
    uint8 level = gemInstance.getLevel(gemId);

    // read number of tiers the plot has
    uint8 n = plotInstance.getNumberOfTiers(plotId);

    // if level is lower then number of tiers the plot has
    if(level < n) {
      // we cannot fully mine that plot,
      // we can go through only to tier number `level`
      // it is possible, however, that we already got deeper,
      // so we need to consider current offset as well
      return uint8(Math.max(plotInstance.getTierDepth(plotId, level), offset));
    }
    // otherwise, if the level is big enough
    else {
      // we can mine fully down to the bottom
      return plotInstance.getDepth(plotId);
    }
  }

  /**
   * @notice Determines how many minutes of energy is required to mine
   *      `n` blocks of tier number `tier`
   * @dev See also `energyToBlocks` function
   * @param tier tier number of interest
   * @param n number of blocks to mine in the specified tier
   * @return required energy in minutes
   */
  function blocksToEnergy(uint8 tier, uint8 n) public constant returns(uint32) {
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
  function energyToBlocks(uint8 tier, uint32 energy) public constant returns(uint8) {
    // calculate based on the tier number and return
    // array bounds keep tier index to be valid
    return uint8(Math.min(energy / MINUTES_TO_MINE[tier - 1], 0xFF));
  }

  /**
   * @notice Determines effective mining energy of a particular gem
   * @notice Gems of any grades accumulate mining energy when mining
   * @dev See `energeticAgeOf` and `effectiveEnergy` functions for more details
   * @dev Throws if the gem specified doesn't exist
   * @param gemId ID of the gem to calculate effective mining energy for
   * @return effective mining energy for the specified gem
   */
  function effectiveMiningEnergyOf(uint32 gemId) public constant returns(uint32) {
    // determine mining energy of the gem,
    // by definition it's equal to its energetic age
    // verifies gem's existence under the hood
    uint32 energy = energeticAgeOf(gemId);

    // if energy is not zero
    if(energy != 0) {
      // convert mining energy into effective mining energy
      energy = effectiveEnergy(energy, gemInstance.getGrade(gemId));
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
  function effectiveRestingEnergyOf(uint32 gemId) public constant returns(uint32) {
    // determine resting energy of the gem
    // verifies gem's existence under the hood
    uint32 energy = restingEnergyOf(gemId);

    // if energy is not zero (grades A, AA and AAA)
    if(energy != 0) {
      // convert resting energy into effective resting energy
      energy = effectiveEnergy(energy, gemInstance.getGrade(gemId));
    }

    // return energy value
    return energy;
  }

  /**
   * @notice Calculates effective energy of the gem based on its base energy and grade
   * @dev Effective energy is base energy multiplied by mining rate of the gem
   * @param energy base energy of the gem
   * @param grade full grade value of the gem, containing grade type and value
   * @return effective energy of the gem in minutes
   */
  function effectiveEnergy(uint32 energy, uint32 grade) public pure returns(uint32) {
    // calculate mining rate of the gem
    // delegate call to `miningRate`
    uint32 r = miningRate(grade);

    // determine effective gem energy of the gem,
    // taking into account its mining rate,
    // and return the result
    return uint32(uint64(energy) * r / 100000000);
  }

  /**
   * @notice Determines mining rate of a particular gem based on its grade
   * @dev See `miningRate` function for more details
   * @dev Throws if gem specified doesn't exist
   * @param gemId ID of the gem to calculate mining rate for
   * @return mining rate of the gem multiplied by 10^8
   */
  function miningRateOf(uint32 gemId) public constant returns(uint32) {
    // read the grade of the given gem
    // verifies gem existence under the hood
    uint32 grade = gemInstance.getGrade(gemId);

    // calculate mining rate - delegate call to `miningRate`
    // and return the result
    return miningRate(grade);
  }

  /**
   * @notice Calculates mining rate of the gem by its grade
   * @dev Calculates mining rate `r` of the gem, based on its grade type `e`
   *      and grade value `u` according to the formulas:
   *        r = 1 + (e - 1) * 10^-1 + 5 * u * 10^-8, e = [1, 2, 3]
   *        r = 1.4 + 15 * u * 10^-8, e = 4
   *        r = 2 + 2 * u * 10^-7, e = 5
   *        r = 4 + u * 10^-6, e = 6
   * @dev Gem's grade type and value are extracted from the packed `grade`
   * @dev The value returned is multiplied by 10^8
   * @param grade grade of the gem,
   *      high 8 bits of which contain grade type e = [1, 2, 3, 4, 5, 6]
   *      low 24 bits contain grade value u = [0, 1000000)
   * @return `r * 10^8`, where `r` is the mining rate of the gem of grade `grade`
   */
  function miningRate(uint32 grade) public pure returns(uint32) {
    // extract grade type of the gem - high 8 bits
    uint32 e = grade >> 24;

    // extract grade value of the gem - low 24 bits
    uint32 u = 0xFFFFFF & grade;

    // for grades D, C, B: e = [1, 2, 3]
    if(e == 1 || e == 2 || e == 3) {
      // r = 1 + (e - 1) * 10^-1 + 5 * u * 10^-8
      return 100000000 + 10000000 * (e - 1) + 5 * u;
    }

    // for grade A: e = 4
    if(e == 4) {
      // r = 1.4 + 15 * u * 10^-8
      return 140000000 + 15 * u;
    }

    // for grade AA: e = 5
    if(e == 5) {
      // r = 2 + 2 * u * 10^-7
      return 200000000 + 20 * u;
    }

    // for grade AAA: e = 6
    if(e == 6) {
      // r = 4 + u * 10^-6
      return 400000000 + 100 * u;
    }

    // if we get here it means the grade is not valid
    // grade is not one of D, C, B, A, AA, AAA
    // throw an exception
    require(false);
  }

  /**
   * @notice Calculates resting energy for the gem specified,
   *      see `restingEnergy` for more details on resting energy
   * @notice The gem accumulates resting energy when it's not mining
   * @dev Throws if gem with the given ID doesn't exist
   * @param gemId ID of the gem to calculate resting energy for
   * @return resting energy of the given gem
   */
  function restingEnergyOf(uint32 gemId) public constant returns(uint16) {
    // determine gems' grade type
    // verifies gem existence under the hood
    uint8 e = gemInstance.getGradeType(gemId);

    // resting energy is defined only for gems with grade A, AA and AAA
    if(e < 4) {
      // for grades D, C and B it is zero by definition
      return 0;
    }

    // determine energetic age of the gem - delegate call to `energeticAgeOf`
    uint32 age = energeticAgeOf(gemId);

    // calculate the resting energy - delegate call to `restingEnergy`
    // and return the result
    return restingEnergy(age);
  }

  /**
   * @notice Resting Energy (R) formula implementation:
   *      R = -7 * 10^-6 * a^2 + 0.5406 * a, if a < 37193
   *      R = 10423 + 0.0199 * (a - 37193), if a >= 37193,
   *      where `a` stands for Energetic Age of the gem (minutes)
   * @dev Linear threshold `37193` in the equation above is
   *      the root of the equation `-7 * 10^-6 * x^2 + 0.5406x = 0.0199`,
   *      where x is gem age in minutes and `k = 0.0199` is energy increase per minute,
   *      which is calculated as `k = 10437 / 525600`,
   *      where `525600 = 365 * 24 * 60` is number of minutes in one year and `n = 10437`
   *      is the right root of equation `-7 * 10^-6 * x^2 + 0.5406x = 0`,
   *      `n` is the number of minutes to parabola peak
   * @param energeticAge number of minutes the gem was not mining
   * @return Resting Energy (R) calculated based on Energetic Age (a) provided
   */
  function restingEnergy(uint32 energeticAge) public pure returns(uint16) {
    // to avoid arithmetic overflow we need to use significantly more
    // bits than the original 32-bit number, 128 bits is more than enough
    uint128 a = energeticAge;

    // the result of the calculation is stored in 128-bit integer as well
    uint128 energy = 0;

    // perform calculation according to the formula (see function header)
    // if a < 37193:
    if(a < 37193) {
      // R = -7 * 10^-6 * a^2 + 0.5406 * a
      energy = 2703 * a / 5000 - 7 * a ** 2 / 1000000;
    }
    // if a >= 37193
    else {
      // R = 10423 + 0.0199 * (a - 37193)
      energy = 10423 + (a - 37193) * 199 / 10000;
    }

    // cast the result into uint16, maximum value 65535
    // corresponds to energetic age of 2,806,625 minutes,
    // which is approximately 5 years and 124 days,
    // that should be more than enough
    return energy > 0xFFFF? 0xFFFF : uint16(energy);
  }

  /**
   * @dev Energetic age is an approximate number of minutes the gem accumulated energy
   * @dev The time is measured from the time when gem modified its properties
   *      (level or grade) or its state for the last time till now
   * @dev If the gem didn't change its properties ot state since its genesis,
   *      the time is measured from gem's creation time
   * @dev For resting (non-mining) gems of grades A, AA and AAA energetic age
   *      is used to calculate their resting energy
   * @dev For mining gems of any grade energetic age is equal to mining energy
   * @param gemId ID of the gem to calculate energetic age for
   * @return energetic age of the gem in minutes
   */
  function energeticAgeOf(uint32 gemId) public constant returns(uint32) {
    // gem's age in blocks is defined as a difference between current block number
    // and the maximum of gem's levelModified, gradeModified, creationTime and stateModified
    uint32 ageBlocks = uint32(block.number - Math.max(
      Math.max(gemInstance.getLevelModified(gemId), gemInstance.getGradeModified(gemId)),
      Math.max(gemInstance.getCreationTime(gemId),  gemInstance.getStateModified(gemId))
    ));

    // average block time is 15 seconds, meaning that approximately
    // 4 blocks correspond to one minute of energetic age
    uint32 ageMinutes = ageBlocks / 4;

    // return the result
    return ageMinutes;
  }

}

