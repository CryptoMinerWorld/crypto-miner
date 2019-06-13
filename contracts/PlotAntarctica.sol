pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./PlotERC721.sol";
import "./TierMath.sol";
import "./Random.sol";

/**
 * @dev An auxiliary interface to extract single function `geodeBalances` from
 *      Presale/Presale2 smart contracts to allow exchanging geodes to founders'
 *      plots in Antarctica using PlotAntarctica smart contract
 */
interface FoundersPlots {
  /**
   * @dev Given founder's address, returns amount of geodes this founder has
   * @dev This number is equal to number of land plots in Antarctica this
   *      address can get, see `PlotAntarctica`
   * @param addr founder's address
   * @return number of geodes this founder has
   */
  function geodeBalances(address addr) external view returns (uint16);

}

/**
 * @title Plot Sale – Antarctica
 *
 * @notice PlotAntarctica is responsible for issuing land plots in Antarctica.
 *      These are game founders' plots which are issued for free for geode owners –
 *      founders of the game which bought geodes on the game's early stage
 *
 * @notice There are 5,000 land plots available for exchange, only about 1,500,
 *      however will be exchanged since only about 1,500 geodes was bought
 *
 * @dev 5,000 constraint is not part of this smart contract, it is ensured in
 *      Presale/Presale2 smart contracts executed earlier
 *
 * @dev Plot Sale – Antarctica acts as `ROLE_TOKEN_CREATOR` for PlotERC721 token
 *
 * @author Basil Gorin
 */
contract PlotAntarctica is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant CONTRACT_UID = 0xcdf58c4cb6f0ff5f4364d95b6a91852b0ab317f4fe34a8e0c44a63fa51a55eb3;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant PLOT_UID_REQUIRED = 0xc5b810e451b3296f5ffa4087dc00adac5c57a053c276db3987921c798b153571;

  /**
   * @notice Enables getting tokens for free for game founders
   * @dev Feature FEATURE_GET_ENABLED must be enabled to
   *      call the `get()` function
   */
  uint32 public constant FEATURE_GET_ENABLED = 0x00000001;

  /**
   * @dev Antarctica Country ID, virtual country, doesn't exist in CountryERC721
   * @dev Used to issue land plots for game founder's - owners of founder's geodes
   */
  uint8 public constant ANTARCTICA_COUNTRY_ID = 0;

  /**
   * @dev A mapping to keep track of issued tokens
   * @dev Maps founder's address to an amount of tokens issued
   */
  mapping(address => uint16) issuedTokens;

  /**
   * @dev FoundersPlots deployed instance to use `geodeBalances` function from
   */
  FoundersPlots public foundersPlots;

  /**
   * @dev PlotERC721 deployed instance to mint land plots
   */
  PlotERC721 public plotInstance;

  /**
   * @dev Fired in `buy()` and `get()`
   * @param _by an address which has bought a land plot
   * @param _tokenId ID of the plot bought
   */
  event PlotIssued(address indexed _by, uint24 _tokenId);

  /**
   * @dev Instantiates Plot Sale – Antarctica, binding it to
   *      FoundersPlots/Presale/Presale2 instance - a smart contract providing
   *      `geodeBalances` function;
   *      PlotERC721 instance which is used to mint land plots
   * @param _foundersPlots valid FoundersPlots/Presale/Presale2 instance
   * @param _plot address of the deployed PlotERC721 instance with
   *      the `TOKEN_UID` equal to `PLOT_UID_REQUIRED`
   */
  constructor(address _foundersPlots, address _plot) public {
    // check inputs
    require(_foundersPlots != address(0));
    require(_plot != address(0));

    // bind smart contract instances
    foundersPlots = FoundersPlots(_foundersPlots);
    plotInstance = PlotERC721(_plot);

    // "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69" is a service account known to own
    // some geodes in both test and main networks
    require(foundersPlots.geodeBalances(0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69) != 0);
    // verify smart contract versions
    require(plotInstance.TOKEN_UID() == PLOT_UID_REQUIRED);
  }

  /**
   * @notice Issues land plots in Antarctica for game founders (geode owners)
   * @dev Mints tokens requested (Country ID 0 – Antarctica)
   * @dev Requires sender to have some geodes, which is checked through
   *      `FoundersPlots` instance supplied during contract deployment
   * @param n amount of tokens to mint
   */
  function get(uint8 n) public {
    // verify that founder's plot exchange is enabled
    require(isFeatureEnabled(FEATURE_GET_ENABLED));

    // call sender gracefully – founder
    address founder = msg.sender;

    // get founder's token balance
    uint16 balance = foundersPlots.geodeBalances(founder);

    // get amount of token already issued
    uint16 issued = issuedTokens[founder];

    // arithmetic overflow and non-zero `n` check
    require(issued + n > issued);

    // ensure we have tokens to issue to the founder
    require(balance >= issued + n);

    // save current sold by country value, we'll use it heavily
    uint16 minted = plotInstance.minted(ANTARCTICA_COUNTRY_ID);

    // arithmetic overflow check
    require(minted + n > minted);

    // update issued tokens counter
    issuedTokens[founder] += n;

    // mint tokens required - delegate to `__mint`
    __mint(founder, ANTARCTICA_COUNTRY_ID, n);
  }

  /**
   * @dev Auxiliary function used to mint `length` tokens to `to`
   * @param to an address to mint tokens to
   * @param countryId ID of the country the tokens belong to
   * @param n number of tokens to mint
   */
  function __mint(address to, uint8 countryId, uint8 n) private {
    // we're going to mint `length` tokens
    for(uint8 i = 0; i < n; i++) {
      // generate randomized tiers structure
      // delegate call to `random2Tiers`
      uint64 tiers = random2Tiers(7 * i);

      // delegate call to `PlotERC721.mint` and get generated token ID
      uint24 tokenId = plotInstance.mint(to, countryId, tiers);

      // emit an event
      emit PlotIssued(to, tokenId);
    }
  }

  /**
   * @dev Auxiliary function to generate randomized tier structure
   *      of two tiers (Antarctica)
   * @dev Function generates random 256-bit number 7 times, which
   *      should be taken into account when using it in cycle
   *      and supplying seed offset which should increase at least by 7
   *      in each cycle call
   * @param seedOffset initial seed to use for random generation
   * @return randomized tiers structure consisting of five tiers
   */
  function random2Tiers(uint256 seedOffset) public view returns(uint64 tiers) {
    // variable to store some randomness to work with
    uint256 rnd;

    // variables to store tiers lengths
    uint8 offset1; // Tier 1 length, equal to its depth
    uint8 offset2; // Tier 2 length

    // we are generating 100 blocks of land
    for(uint8 i = 0; i < 100; i++) {
      // each 16 iterations starting from iteration 0
      if(i % 16 == 0) {
        // generate new randomness to work with
        rnd = Random.generate256(seedOffset + i / 16);
      }

      // generate random value in the [0, 100) range
      uint8 rnd100 = uint8(Random.uniform(rnd >> 16 * (i % 16), 16, 100));

      // depending on the value generated add to corresponding tier length
      // tier 1: first 35 blocks
      if(rnd100 < 35) {
        offset1++;
        offset2++;
      }
      // tier 2: next 65 blocks
      else {
        offset2++;
      }
    }

    // pack all the data and return
    return TierMath.pack(2, 0, offset1, offset2, offset2, offset2, offset2, 0);
  }

  /**
   * @dev Auxiliary function to generate `n` randomized tier structures
   *      of five tiers (non-Antarctica - rest of the World)
   * @param seedOffset initial seed to use for random generation
   * @param n number of tiers structures to generate
   * @return an array of randomized tiers structures consisting of five tiers each
   */
  function random2TiersArray(uint256 seedOffset, uint32 n) public view returns(uint64[] memory) {
    // allocate memory for the result
    uint64[] memory tiers = new uint64[](n);

    // generate requested amount of tiers
    for(uint32 i = 0; i < n; i++) {
      // generate structure - delegate call to `random5Tiers`
      tiers[i] = random2Tiers(seedOffset + 7 * i);
    }

    // return the result
    return tiers;
  }
}
