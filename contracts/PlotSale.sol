pragma solidity 0.5.8;

import "./AccessControl.sol";
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
contract PlotSale is AccessControl {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant SALE_UID = 0x5bc0fad8726e6ef02935c92239c7373221c162dcff55c3de5aeefe94d81d3556;

  /**
   * @dev Expected version (UID) of the deployed PlotERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant REF_TRACKER_UID_REQUIRED = 0x2f81c11d03f0b3ccc5eb91e741f689bb57c05a4065d46002de6a73a9df00f6ff;

  /**
   * @dev Expected version (UID) of the deployed CountryERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant COUNTRY_UID_REQUIRED = 0x487e7af2a810b59da545d840b09a1fa474d482fc2a7c22ed553d6f5a2030b53c;

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
   * @notice Enables getting tokens for referral points
   * @dev Feature FEATURE_GET_ENABLED must be enabled to
   *      call the `get()` function
   */
  uint32 public constant FEATURE_GET_ENABLED = 0x00000002;

  /**
   * @notice Enables using coupons i.e. exchanging them for tokens
   * @dev Feature FEATURE_USING_COUPONS_ENABLED must be enabled to
   *      call the `useCoupon()` function
   */
  uint32 public constant FEATURE_USING_COUPONS_ENABLED = 0x00000004;

  /**
   * @notice Withdraw manager is allowed to withdraw a balance for country owner
   *      and may be used, for example, to allow free withdrawals (no gas fee)
   * @notice Withdraw manager can transfer the funds to no one except the funds owner
   * @dev Role `ROLE_WITHDRAW_MANAGER` is required to call `withdrawTo` function
   */
  uint32 public constant ROLE_WITHDRAW_MANAGER = 0x00000001;

  /**
   * @notice Coupon creator is responsible for adding and removing coupons
   * @dev Role ROLE_COUPON_CREATOR allows adding and removing coupons
   *      (calling `addCoupon()` and removeCoupon() functions)
   */
  uint32 public constant ROLE_COUPON_MANAGER = 0x00000002;

  /**
   * @notice Price of a single token. When buying several tokens
   *      the price is multiplied by the amount to be bought
   * @dev Note: maximum uint64 value is
   *      0xFFFFFFFFFFFFFFFF = 18,446,744,073,709,551,615 ≈ 18.44 ETH
   */
  uint64 public constant SALE_PRICE = 20 finney;

  /**
   * @notice Price of a single token if buying for referral points.
   *      When buying several tokens the price is multiplied by the amount to be bought
   * @dev Note: maximum uint16 value is
   *      0xFFFF = 65,535
   */
  uint16 public constant REF_POINTS_PRICE = 4;

  /**
   * @dev Bermuda Triangle Country ID, virtual country, doesn't exist in CountryERC721
   * @dev Used to issue land plots for free (for coupons and referral points)
   */
  uint8 public constant BERMUDA_COUNTRY_ID = 255;

  /**
   * @dev Coupon storage, maps keccak256 hash of the coupon code to
   *      the number of tokens coupon allows to obtain
   * @dev sha3(code) => n (number of tokens)
   */
  mapping(uint256 => uint8) coupons;

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
  address payable public worldChest;

  /**
   * @notice Monthly Chest address - an address to send 5% of the incoming funds
   */
  address payable public monthlyChest;

  /**
   * @notice Beneficiary address – an address to send rest of the incoming funds
   * @notice Note that 10% country sale tax is extracted from funds to be sent to
   *      beneficiary address
   */
  address payable public beneficiary;

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
   * @dev Fired in `buy()` and `get()`
   * @param _by an address which has bought a land plot
   * @param _tokenId ID of the plot bought
   */
  event PlotIssued(address indexed _by, uint24 _tokenId);

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
   * @dev Fired in updateCoupon()
   * @param _by coupon manager who added the coupon
   * @param key keccak256 hash of the coupon code added
   * @param n amount of land plots coupon allows to retrieve
   */
  event CouponUpdated(address indexed _by, uint256 indexed key, uint8 n);

  /**
   * @dev Fired in removeCoupon()
   * @param _by coupon manager who removed the coupon
   * @param key keccak256 hash of the coupon code removed
   */
  event CouponRemoved(address indexed _by, uint256 indexed key);

  /**
   * @dev Fired in useCoupon()
   * @param _by an address (player) who used the coupon
   * @param key keccak256 hash of the coupon code used
   * @param n amount of land plots retrieved
   */
  event CouponConsumed(address indexed _by, uint256 indexed key, uint8 n);

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
    address payable _worldChest,
    address payable _monthlyChest,
    address payable _beneficiary,
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
    require(refPointsTracker.TRACKER_UID() == REF_TRACKER_UID_REQUIRED);
    require(countryInstance.TOKEN_UID() == COUNTRY_UID_REQUIRED);
    require(plotInstance.TOKEN_UID() == PLOT_UID_REQUIRED);

    // setup rest of the values
    worldChest = _worldChest;
    monthlyChest = _monthlyChest;
    beneficiary = _beneficiary;
    saleStartUTC = _saleStartUTC;
  }

  /**
   * @notice Buys several land plots in/from a country specified
   * @dev Buys `n` land plots in a country defined by its ID `countryId`
   * @dev Requires transaction to have enough value to buy `n` land plots
   * @dev Requires country specified to have at least `n` unsold plots
   * @param countryId ID of the country to issue plots in;
   *      owner of the country receives 10% country tax
   * @param n amount of land plots to buy
   */
  function buy(uint8 countryId, uint8 n) public payable {
    // delegate call to `buyRef` setting `referrer` address to zero
    buyRef(countryId, n, address(0));
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
  function buyRef(uint8 countryId, uint8 n, address referrer) public payable {
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
   * @notice Issues several land plots in/from a Bermuda Triangle
   *      in exchange for referral points
   * @dev Issues `n` land plots in a Bermuda Triangle (Country ID 255)
   * @dev Requires sender to have enough referral points to get `n` land plots
   * @dev Maximum number of plots to be issued in Bermuda Triangle is 65,535
   * @param n amount of land plots to issue
   */
  function get(uint8 n) public {
    // verify that using referral points is enabled
    require(isFeatureEnabled(FEATURE_GET_ENABLED));

    // verify that sale has already started
    require(now >= saleStartUTC);

    // save current sold by country value, we'll use it heavily
    uint16 minted = plotInstance.minted(BERMUDA_COUNTRY_ID);

    // arithmetic overflow and non-zero `n` check
    require(minted + n > minted);

    // calculate number of referral points required
    // maximum value for `REF_POINTS_PRICE * n` is 1020 for `n = 255`,
    // which is in safe bounds for uint16
    uint16 price = REF_POINTS_PRICE * n;

    // consume referral points required
    // verifies sender has enough referral points under the hood
    refPointsTracker.consumeFrom(msg.sender, price);

    // mint tokens required - delegate to `__mint`
    __mint(msg.sender, BERMUDA_COUNTRY_ID, n);

    // no need to add known address since address having
    // referral points is known already
  }

  /**
   * @notice Calculates country owner's balance available for withdrawal
   * @dev Sums all the country balances for the given owner
   * @param owner an address of a country(ies) owner to query balance for
   */
  function balanceOf(address owner) public view returns(uint256) {
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
    address payable owner = address(uint160(countryInstance.ownerOf(countryId)));

    // make sure withdraw request is made by an owner
    // or withdraw manager (`ROLE_WITHDRAW_MANAGER`)
    require(msg.sender == owner || isSenderInRole(ROLE_WITHDRAW_MANAGER));

    // save the value to withdraw in a temporary variable
    uint256 balance = balancesByCountry[countryId];

    // verify amount to withdraw is not zero
    require(balance != 0);

    // update the balance of the country
    balancesByCountry[countryId] = 0;

    // perform the withdrawal
    owner.transfer(balance);

    // emit an event to let country owner know
    emit CountryBalanceUpdated(countryId, owner, balance, 0);
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
  function withdraw(address payable owner) public {
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
   * @notice Allows validating a coupon, returns an amount
   *      of tokens this coupon allows to obtain
   * @param code coupon code to validate
   * @return amount of tokens this coupon allows to obtain
   *      or zero if coupon is not valid
   */
  function isCouponValid(string memory code) public view returns(uint8) {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(abi.encodePacked(code)));

    // get amount of land plots this coupon allows to obtain and return
    // invalid coupon produces zero result
    return coupons[key];
  }

  /**
   * @notice Allows using a coupon, mints land plots if coupon is valid
   * @dev The plots are minted in Bermuda Triangle (Country ID 255)
   * @dev Maximum number of plots to be issued in Bermuda Triangle is 65,535
   * @dev Throws if coupon is invalid, `FEATURE_USING_COUPONS_ENABLED` is not enabled
    *     or if the silver sale this smart contract is bound to already finished
   * @param code coupon code to use
   */
  function useCoupon(string memory code) public {
    // check using coupons feature is enabled
    require(isFeatureEnabled(FEATURE_USING_COUPONS_ENABLED));

    // verify that sale has already started
    require(now >= saleStartUTC);

    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(abi.encodePacked(code)));

    // get amount of plots corresponding to this coupon
    uint8 n = coupons[key];

    // require a valid coupon
    require(n != 0);

    // remove the coupon from storage
    delete coupons[key];

    // mint tokens required - delegate to `__mint`
    __mint(msg.sender, BERMUDA_COUNTRY_ID, n);

    // player (sender) becomes known to the ref points tracker
    refPointsTracker.addKnownAddress(msg.sender);

    // emit an event
    emit CouponConsumed(msg.sender, key, n);
  }

  /**
   * @notice Allows adding, removing and updating coupons to obtain free tokens
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @dev Throws if removing non-existing coupon
   * @dev When updating an existing coupon requires new value for
   *      free tokens to be different from the old one
   * @param key coupon code hash
   * @param n amount of tokens this coupon allows to retrieve;
   *      use zero value to remove the coupon, non-zero value to add/update a coupon
   */
  function updateCoupon(uint256 key, uint8 n) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // ensure operation makes a change to a storage
    require(coupons[key] != n);

    // delegate call to `__updateCoupon`
    __updateCoupon(key, n);
  }

  /**
   * @notice Allows adding coupons for free tokens retrieval
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @dev Overwrites the coupons if they already exist
   * @param keys array of coupon codes hashes (keccak256)
   * @param n amount of tokens these coupons allows to retrieve;
   *      use zero value to remove the coupons, non-zero value to add/update them
   */
  function bulkUpdateCoupons(uint256[] memory keys, uint8 n) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // iterate over the keys array
    for(uint256 i = 0; i < keys.length; i++) {
      // delegate call to `__updateCoupon`
      __updateCoupon(keys[i], n);
    }
  }

  /**
   * @dev Updates the `coupons` mapping without any validations
   *      on inputs and permissions of the sender and
   *      emits an event based on the `n` value passed
   * @dev Unsafe, must be kept private at all times
   * @param key coupon code hash (`coupons` mapping key)
   * @param n amount of tokens (`coupons` mapping value)
   */
  function __updateCoupon(uint256 key, uint8 n) private {
    // modify a coupon (add/update/delete)
    coupons[key] = n;

    // depending on the `n` value, two types of the event can be emitted
    if(n != 0) {
      // emit an add/update event if `n` is not zero
      emit CouponUpdated(msg.sender, key, n);
    }
    else {
      // emit a delete event otherwise
      emit CouponRemoved(msg.sender, key);
    }
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
      emit PlotIssued(to, tokenId);
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
  function random5Tiers(uint256 seedOffset) public view returns(uint64 tiers) {
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
      uint8 rnd100 = uint8(Random.__rndVal(rnd >> 16 * (i % 16), 0xFFFF, 0, 100));

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
  function random5TiersArray(uint256 seedOffset, uint32 n) public view returns(uint64[] memory) {
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
