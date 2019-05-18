pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./RefPointsTracker.sol";
import "./PlotERC721.sol";
import "./CountryERC721.sol";
import "./TierMath.sol";
import "./Random.sol";

/**
 * @title World Land Plot Sale
 *
 * @notice PlotSale is responsible for selling (minting in exchange for ETH)
 *      PlotERC721 land plot tokens to the players
 *
 * @notice There are 500 000 land plot tokens available for sale
 *
 * @notice Each token on sale "belongs" to some country (see CountryERC721)
 *      which receives 10% sale tax.
 *      Country owner can withdraw accumulated tax at any moment
 *
 * @notice Sale price is fixed to 0.02 ETH per land plot (one PlotERC721 token).
 * @notice Incoming funds are distributed in the following way:
 *      10% goes to the country owner (10% country tax)
 *      20% goes to the World Chest
 *      5%  goes to the Monthly Chest
 *      65% goes to the beneficiary
 * @notice If corresponding country was not sold and its owner doesn't exist,
 *        10% country tax goes to the beneficiary
 *
 * @notice When referring another player, referrer gets two referral points and
 *      referred gets one referral point for each five plots referred bought
 * @notice Note that referrer must be already known to the system,
 *      while referred must be new, unknown address
 *
 * @dev Technically, 10% country tax value is not hardcoded into sale smart contract
 *      and is accessed from each country token (see the CountryERC721)
 *
 * @dev Land Plot Sale acts as `ROLE_TOKEN_CREATOR` for PlotERC721 token
 *
 * @author Basil Gorin
 */
contract PlotSale is AccessControlLight {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant SALE_UID = 0x0a40d894a35fc577fd19196f8abb2efe24eed6c63f53711469d4678763fca63f;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant REF_TRACKER_UID_REQUIRED = 0x0000000000000000000000000000000000000000000000000000000000000003;

  /**
   * @dev Expected version (UID) of the deployed CountryERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant COUNTRY_UID_REQUIRED = 0x0000000000000000000000000000000000000000000000000000000000000001;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant PLOT_UID_REQUIRED = 0x216c71f30bc2bf96dd0dfeae5cf098bfe9e0da295785ebe16a6696b0d997afec;

  /**
   * @notice Enables world land plot sale
   * @dev Feature FEATURE_SALE_ENABLED must be enabled to
   *      call the `buy()` function
   */
  uint32 public constant FEATURE_SALE_ENABLED = 0x00000001;

  /**
   * @notice Withdraw manager is allowed to withdraw a balance for country owner
   *      and may be used, for example, to allow free withdrawals (no gas fee)
   * @notice Withdraw manager can transfer the funds to no one except the funds owner
   * @dev Role `ROLE_WITHDRAW_MANAGER` is required to call `withdrawTo` function
   */
  uint32 public constant ROLE_WITHDRAW_MANAGER = 0x00000001;

  /**
   * @notice Price of a single token. When buying several tokens
   *      the price is multiplied by the amount to be bought
   * @dev Note: maximum uint64 value is
   *      0xFFFFFFFFFFFFFFFF = 18446744073709551615 ≈ 18.44 ETH
   */
  uint64 public constant SALE_PRICE = 20 finney;

  /**
   * @dev RefPointsTracker deployed instance to issue referral points to
   *      and to consume referral points from
   */
  RefPointsTracker public refPointsTracker;

  /**
   * @dev CountryERC721 deployed instance used to calculate sale tax
   */
  CountryERC721 public countryInstance;

  /**
   * @dev PlotERC721 deployed instance to mint land plots
   */
  PlotERC721 public plotInstance;

  /**
   * @notice World Chest address – an address to send 20% of the incoming funds
   */
  address public worldChest;

  /**
   * @notice Monthly Chest address - an address to send 5% of the incoming funds
   */
  address public monthlyChest;

  /**
   * @notice Beneficiary address – an address to send rest of the incoming funds
   * @notice Note that 10% country sale tax is extracted from funds to be sent to
   *      beneficiary address
   */
  address public beneficiary;

  /**
   * @notice Sale start date, buying land plot tokens is possible
   *      only after the sale begins
   * @dev Sale start date is stored as a unix timestamp
   */
  uint32 public saleStartUTC;

  /**
   * @dev Mapping to store country balances – an amount of wei each country
   *      accumulated as a country sale tax
   * @dev Country owner may withdraw that balance
   * @dev Maps Country ID => Available to Withdraw Balance (wei)
   */
  mapping(uint8 => uint256) public balancesByCountry;

  /**
   * @dev Fired in `buy()`
   * @param _by an address which has bought a land plot
   * @param _tokenId ID of the plot bought
   */
  event PlotBought(address indexed _by, uint24 _tokenId);

  /**
   * @dev Fired in `buy()`, `withdraw()` and `withdrawFrom()`
   * @param countryId ID of the country which increased its balance due to
   *      10% sales tax payed by the land plot buyer
   * @param owner country owner at the moment when transaction occurred
   * @param oldValue old country balance in wei
   * @param newValue new country balance in wei
   */
  event CountryBalanceUpdated(uint8 indexed countryId, address indexed owner, uint256 oldValue, uint256 newValue);

  /**
   * @dev Creates a World Land Plot Sale instance, binding it to
   *      referral points tracker, world and monthly chests, beneficiary,
   *      CountryERC721 and PlotERC721 token instances specified
   * @param _ref address of the deployed RefPointsTracker instance with
   *      the `TRACKER_VERSION` equal to `REF_TRACKER_UID_REQUIRED`
   * @param _country address of the deployed CountryERC721 instance with
   *      the `TOKEN_VERSION` equal to `COUNTRY_UID_REQUIRED`
   * @param _plot address of the deployed PlotERC721 instance with
   *      the `TOKEN_UID` equal to `PLOT_UID_REQUIRED`
   * @param _worldChest an address to send 20% of incoming funds
   * @param _monthlyChest an address to send 5% of incoming funds
   * @param _beneficiary an address to send rest of incoming funds
   * @param _saleStartUTC sale start date as a unix timestamp
   */
  constructor(
    address _ref,
    address _country,
    address _plot,
    address _worldChest,
    address _monthlyChest,
    address _beneficiary,
    uint32 _saleStartUTC
  ) public {
    // check inputs
    require(_ref != address(0));
    require(_country != address(0));
    require(_plot != address(0));
    require(_worldChest != address(0));
    require(_monthlyChest != address(0));
    require(_beneficiary != address(0));

    // bind smart contract instances
    refPointsTracker = RefPointsTracker(_ref);
    countryInstance = CountryERC721(_country);
    plotInstance = PlotERC721(_plot);

    // verify smart contract versions
    require(refPointsTracker.TRACKER_VERSION() == REF_TRACKER_UID_REQUIRED);
    require(countryInstance.TOKEN_VERSION() == COUNTRY_UID_REQUIRED);
    require(plotInstance.TOKEN_UID() == PLOT_UID_REQUIRED);

    // setup rest of the values
    worldChest = _worldChest;
    monthlyChest = _monthlyChest;
    beneficiary = _beneficiary;
    saleStartUTC = _saleStartUTC;
  }

  /**
   * @notice Buys several land plots in/from a country specified,
   *      allowing to specify a referrer address of the existing buyer
   * @dev Buys `n` land plots in a country defined by its ID `countryId`
   * @dev Requires transaction to have enough value to buy `n` land plots
   * @dev Requires country specified to have at least `n` unsold plots
   * @param countryId ID of the country to issue plots in;
   *      owner of the country receives 10% country tax
   * @param n amount of land plots to buy
   * @param referrer [optional] referrer address of the player
   *      who already bought some land plots or any other items
   *      in the previous sales, set to zero to specify no referral
   */
  function buy(uint8 countryId, uint8 n, address referrer) public payable {
    // verify that sale is enabled
    require(isFeatureEnabled(FEATURE_SALE_ENABLED));

    // verify that sale has already started
    require(now >= saleStartUTC);

    // verify country ID is valid
    require(countryId != 0 && countryId <= countryInstance.getNumberOfCountries());

    // save current sold by country value, we'll use it heavily
    uint16 minted = plotInstance.minted(countryId);

    // arithmetic overflow and non-zero `n` check
    require(minted + n > minted);

    // verify that specified country has enough plots available on sale
    require(minted + n <= countryInstance.countryData(countryId - 1));

    // calculate the price of the buying transaction
    // maximum value for `SALE_PRICE * n` is 5.1 ETH for `n = 255`,
    // which is in safe bounds for uint64
    uint64 price = SALE_PRICE * n;

    // verify transaction has enough value supplied
    require(msg.value >= price);

    // transfer 20% to the world chest
    worldChest.transfer(price / 5);

    // transfer 5% to the monthly chest
    monthlyChest.transfer(price / 20);

    // variable to store value to be transferred to the country owner
    uint256 tax = 0;

    // temporary variable to store current country balance
    uint256 balance = balancesByCountry[countryId];

    // if specified country exists (has an owner)
    if(countryInstance.exists(countryId)) {
      // 10% of the price goes to the country owner
      tax = countryInstance.calculateTaxValueFor(countryId, price);

      // update country balance
      balancesByCountry[countryId] += tax;
    }

    // rest of the funds (up to 75%) goes to the beneficiary
    beneficiary.transfer(price - price / 4 - tax);

    // mint tokens required - delegate to `__mint`
    __mint(msg.sender, countryId, n);

    // issue referral points – if applicable - delegate call to `__issueRefPoints`
    __issueRefPoints(n / 5, referrer);

    // if transaction has more value than price
    if(msg.value > price) {
      // transfer change back to sender
      msg.sender.transfer(msg.value - price);
    }

    // in case when country balance increased
    if(tax != 0) {
      // we fire corresponding event to let country owner know
      emit CountryBalanceUpdated(countryId, countryInstance.ownerOf(countryId), balance, balance + tax);
    }
  }

  /**
   * @notice Calculates country owner's balance available for withdrawal
   * @dev Sums all the country balances for the given owner
   * @param owner an address of a country(ies) owner to query balance for
   */
  function balanceOf(address owner) public constant returns(uint256) {
    // obtain full list of the countries this owner has
    uint8[] memory countries = countryInstance.getCollection(owner);

    // define variable to accumulate total balance into
    uint256 balance = 0;

    // iterate all the owner's countries
    for(uint8 i = 0; i < countries.length; i++) {
      // accumulate balance for each country
      balance += balancesByCountry[countries[i]];
    }

    // return the result
    return balance;
  }

  /**
   * @notice Withdraws country owner's income from selling their country land plots
   * @dev Allows to withdraw funds from only one country defined by `countryId`
   * @dev If transaction sender is not a withdraw manager
   *      (doesn't have  `ROLE_WITHDRAW_MANAGER`) permission,
   *      requires them to be a specified country owner
   * @dev Throws if specified Country available balance is zero
   * @param countryId ID of the country to withdraw balance from
   */
  function withdrawFrom(uint8 countryId) public {
    // extract country owner and under the hood
    // make sure country exists and has an owner
    address owner = countryInstance.ownerOf(countryId);

    // make sure withdraw request is made by an owner
    // or withdraw manager (`ROLE_WITHDRAW_MANAGER`)
    require(msg.sender == owner || isSenderInRole(ROLE_WITHDRAW_MANAGER));

    // save the value to withdraw in a temporary variable
    uint256 balance = balancesByCountry[countryId];

    // verify amount to withdraw is not zero
    require(balance != 0);

    // update the balance of the country
    balancesByCountry[countryId] = 0;

    // emit an event to let country owner know
    emit CountryBalanceUpdated(countryId, owner, balance, 0);

    // perform the withdrawal
    owner.transfer(balance);
  }

  /**
   * @notice Withdraws country owner's income from selling their country land plots
   * @dev Allows to withdraw funds from all the countries which belong to the sender
   * @dev Requires a specified `owner` to be an owner of
   *      at least one country with non-zero balance
   * @dev If transaction sender is not a withdraw manager
   *      (doesn't have  `ROLE_WITHDRAW_MANAGER`) permission,
   *      requires them to be a specified country owner - `owner`
   * @param owner an address owning at least one country with non-zero balance
   */
  function withdraw(address owner) public {
    // make sure withdraw request is made by an owner
    // or withdraw manager (`ROLE_WITHDRAW_MANAGER`)
    require(msg.sender == owner || isSenderInRole(ROLE_WITHDRAW_MANAGER));

    // obtain full list of the countries this owner has
    uint8[] memory countries = countryInstance.getCollection(owner);

    // define temporary variable to store total withdraw value
    uint256 amount = 0;

    // iterate all the owner's countries
    for(uint8 i = 0; i < countries.length; i++) {
      // save country balance in a temporary variable
      uint256 balance = balancesByCountry[countries[i]];

      // if balance is not zero
      if(balance != 0) {
        // accumulate the amount to withdraw
        amount += balancesByCountry[countries[i]];

        // update country balance
        balancesByCountry[countries[i]] = 0;

        // emit an event to let country owner know
        emit CountryBalanceUpdated(countries[i], owner, balance, 0);
      }
    }

    // verify cumulative amount is not zero
    require(amount != 0);

    // perform the withdrawal
    owner.transfer(amount);
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
      // delegate call to `random5Tiers`
      uint64 tiers = random5Tiers(7 * i);

      // delegate call to `PlotERC721.mint` and get generated token ID
      uint24 tokenId = plotInstance.mint(to, countryId, tiers);

      // emit an event
      emit PlotBought(to, tokenId);
    }
  }

  /**
   * @dev Auxiliary function to issue referral points both to
   *      referral and player (transaction sender)
   * @dev Unsafe, doesn't perform caller validations, must be kept private
   * @param refPoints how many referral points to issue (to each of the parties)
   * @param referrer referral address specified by the player
   */
  function __issueRefPoints(uint32 refPoints, address referrer) private {
    // call sender gracefully – referred
    address referred = msg.sender;

    // verify that referrer address specified is known to ref points tracker
    // and that the sender address (player) is not known to ref points tracker
    // it also ensures that referrer is not referred and that referrer address is provided
    if(refPoints != 0 && refPointsTracker.isValid(referrer, referred)) {
      // referral conditions are met, both addresses earn referral points
      // issue referral points to referrer
      refPointsTracker.issueTo(referrer, 2 * refPoints);

      // issue referral points to referred player
      refPointsTracker.issueTo(referred, refPoints);
    }

    // player (sender) becomes known to the ref points tracker
    refPointsTracker.addKnownAddress(referred);
  }

  /**
   * @dev Auxiliary function to generate randomized tier structure
   *      of five tiers (non-Antarctica - rest of the World)
   * @dev Function generates random 256-bit number 7 times, which
   *      should be taken into account when using it in cycle
   *      and supplying seed offset which should increase at least by 7
   *      in each cycle call
   * @param seedOffset initial seed to use for random generation
   * @return randomized tiers structure consisting of five tiers
   */
  function random5Tiers(uint256 seedOffset) public constant returns(uint64 tiers) {
    // variable to store some randomness to work with
    uint256 rnd;

    // variables to store tiers lengths
    uint8 offset1; // Tier 1 length, equal to its depth
    uint8 offset2; // Tier 2 length
    uint8 offset3; // Tier 3 length
    uint8 offset4; // Tier 4 length
    uint8 offset5; // Tier 5 length

    // we are generating 100 blocks of land
    for(uint8 i = 0; i < 100; i++) {
      // each 16 iterations starting from iteration 0
      if(i % 16 == 0) {
        // generate new randomness to work with
        rnd = Random.__rawRandom(seedOffset + i / 16);
      }

      // generate random value in the [0, 100) range
      uint8 rnd100 = uint8(Random.__rndVal(rnd >> 16 * i, 0xFFFF, 0, 100));

      // depending on the value generated add to corresponding tier length
      // tier 1: first 35 blocks
      if(rnd100 < 35) {
        offset1++;
        offset2++;
        offset3++;
        offset4++;
        offset5++;
      }
      // tier 2: next 30 blocks
      else if(rnd100 < 65) {
        offset2++;
        offset3++;
        offset4++;
        offset5++;
      }
      // tier 3: next 20 blocks
      else if(rnd100 < 85) {
        offset3++;
        offset4++;
        offset5++;
      }
      // tier 4: next 10 blocks
      else if(rnd100 < 95) {
        offset4++;
        offset5++;
      }
      // tier 5: next 5 blocks
      else {
        offset5++;
      }
    }

    // pack all the data and return
    return TierMath.pack(5, 0, offset1, offset2, offset3, offset4, offset5, 0);
  }

  /**
   * @dev Auxiliary function to generate `n` randomized tier structures
   *      of five tiers (non-Antarctica - rest of the World)
   * @param seedOffset initial seed to use for random generation
   * @param n number of tiers structures to generate
   * @return an array of randomized tiers structures consisting of five tiers each
   */
  function random5TiersArray(uint256 seedOffset, uint32 n) public constant returns(uint64[]) {
    // allocate memory for the result
    uint64[] memory tiers = new uint64[](n);

    // generate requested amount of tiers
    for(uint32 i = 0; i < n; i++) {
      // generate structure - delegate call to `random5Tiers`
      tiers[i] = random5Tiers(seedOffset + 7 * i);
    }

    // return the result
    return tiers;
  }
}
