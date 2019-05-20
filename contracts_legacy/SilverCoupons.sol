pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./RefPointsTracker.sol";
import "./SilverSale.sol";

/**
 * @title Silver Sale Coupons
 *
 * @notice An auxiliary smart contract allowing to get silver boxes using coupons
 *
 * @dev Allows adding coupons by coupon manager(s) (`ROLE_COUPON_MANAGER`)
 *      and getting silver boxes by player in exchange to the coupons added
 *      as long as 'using coupons' (`FEATURE_USING_COUPONS_ENABLED`) feature is enabled
 *
 * @author Basil Gorin
 */
contract SilverCoupons is AccessControlLight {
  /**
   * @dev Smart contract version
   * @dev Should be incremented manually in this source code
   *      each time smart contact source code is changed and deployed
   */
  uint32 public constant SILVER_COUPONS_VERSION = 0x1;

  /**
   * @dev Expected version of the deployed RefPointsTracker instance
   *      this smart contract is designed to work with
   */
  uint32 public constant REF_POINTS_TRACKER_VERSION_REQUIRED = 0x3;

  /**
   * @dev Expected version of the deployed SilverERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant SILVER_TOKEN_VERSION_REQUIRED = 0x30;

  /**
   * @dev Expected version of the deployed GoldERC20 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant GOLD_TOKEN_VERSION_REQUIRED = 0x300;

  /**
   * @dev Expected version of the deployed SilverSale instance
   *      this smart contract is designed to work with
   */
  uint32 public constant SILVER_SALE_VERSION_REQUIRED = 0x30;

  /**
   * @notice Enables using coupons i.e. exchanging them for boxes
   * @dev Feature FEATURE_USING_COUPONS_ENABLED must be enabled to
   *      call the `useCoupon()` function
   */
  uint32 public constant FEATURE_USING_COUPONS_ENABLED = 0x00000001;

  /**
   * @notice Coupon creator is responsible for adding and removing coupons
   * @dev Role ROLE_COUPON_CREATOR allows adding and removing coupons
   *      (calling `addCoupon()` and removeCoupon() functions)
   */
  uint32 public constant ROLE_COUPON_MANAGER = 0x00000001;

  /**
   * @dev Coupon storage, maps keccak256 hash of the coupon code to
   *      the box type the coupons can be exchanged to
   * @dev Since zero box type is valid and is the default value for mapping
   *      values, box type is stored incremented by one to distinguish from
   *      unset mapping mapping values (unset or invalid coupons)
   * @dev sha3(code) => boxType + 1
   */
  mapping(uint256 => uint8) coupons;

  /**
   * @dev RefPointsTracker deployed instance to issue referral points to
   *      and to consume referral points from
   */
  RefPointsTracker public refPointsTracker;

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
   * @dev SilverSale deployed instance to sync with
   */
  SilverSale public silverSale;

  /**
   * @dev Fired in addCoupon()
   * @param _by coupon manager who added the coupon
   * @param key keccak256 hash of the coupon code added
   * @param boxType type of the box coupon allows to get
   */
  event CouponAdded(address indexed _by, uint256 indexed key, uint8 boxType);

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
   * @param boxType type of the box coupon was exchanged to
   * @param silver amount of silver obtained by the player
   * @param gold amount of gold obtained by the player
   */
  event CouponConsumed(address indexed _by, uint256 indexed key, uint8 boxType, uint8 silver, uint8 gold);

  /**
   * @dev Creates a Silver/Gold Coupons instance, binding it to
   *      silver (ERC20 token) and gold (ERC20 token), referral points
   *      tracker and silver sale instances specified
   * @param _silver address of the deployed SilverERC20 instance with
   *      the `TOKEN_VERSION` equal to `SILVER_TOKEN_VERSION_REQUIRED`
   * @param _gold address of the deployed GoldERC20 instance with
   *      the `TOKEN_VERSION` equal to `GOLD_TOKEN_VERSION_REQUIRED`
   * @param _ref address of the deployed RefPointsTracker instance with
   *      the `TRACKER_VERSION` equal to `REF_POINTS_TRACKER_VERSION_REQUIRED`
   * @param _sale address of the deployed SilverSale instance with
   *      the `SALE_VERSION` equal to `SILVER_SALE_VERSION_REQUIRED`
   */
  constructor(address _silver, address _gold, address _ref, address _sale) public {
    // verify the inputs: mistakes in addresses
    require(_silver != address(0));
    require(_gold != address(0));
    require(_ref != address(0));
    require(_sale != address(0));

    // bind smart contract instances
    silverInstance = SilverERC20(_silver);
    goldInstance = GoldERC20(_gold);
    refPointsTracker = RefPointsTracker(_ref);
    silverSale = SilverSale(_sale);

    // verify smart contract versions
    require(silverInstance.TOKEN_VERSION() == SILVER_TOKEN_VERSION_REQUIRED);
    require(goldInstance.TOKEN_VERSION() == GOLD_TOKEN_VERSION_REQUIRED);
    require(refPointsTracker.TRACKER_VERSION() == REF_POINTS_TRACKER_VERSION_REQUIRED);
    require(silverSale.SALE_VERSION() == SILVER_SALE_VERSION_REQUIRED);

    // verify we do not bind to an already ended sale
    require(silverSale.saleEndsIn() > 0);
  }

  /**
   * @notice Allows validating a coupon, returns valid box type if coupon is valid
   * @param code coupon code to validate
   * @return box type corresponding to this coupon or 255 if coupon is not valid
   */
  function isCouponValid(string code) public constant returns(uint8) {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // get box type corresponding to this coupon and return
    // invalid coupon produces 255 as a result
    return coupons[key] - 1;
  }

  /**
   * @notice Allows using a coupon, unboxes corresponding silver box if coupon is valid
   * @dev Throws if coupon is invalid, `FEATURE_USING_COUPONS_ENABLED` is not enabled
    *     or if the silver sale this smart contract is bound to already finished
   * @param code coupon code to use
   */
  function useCoupon(string code) public {
    // check using coupons feature is enabled
    require(isFeatureEnabled(FEATURE_USING_COUPONS_ENABLED));

    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // get box type corresponding to this coupon
    uint8 boxType = coupons[key] - 1;

    // remove the coupon from storage
    delete coupons[key];

    // box type validation is not required, wrong box type won't be unboxed
    // perform unboxing by delegating call to `SilverSale.unbox()`

    // to assign tuple return value from `silverInstance.unbox`
    // we need to define auxiliary the variables first, compatible with
    // `silverInstance.unbox` return type - (uint24, uint16)
    uint24 _silver;
    uint16 _gold;

    // evaluate silver and gold values for a single box
    (_silver, _gold) = silverSale.unbox(boxType, 1);

    // taking into account that we unbox single box, both
    // silver and gold amounts fit into uint8
    uint8 silver = uint8(_silver);
    uint8 gold = uint8(_gold);

    // perform simplified minting as in `SilverSale.__mint()`

    // any box contains silver, no need to check if silver
    // is not zero – just mint silver required
    silverInstance.mint(msg.sender, silver);

    // box may not contain gold, check if it does
    if(gold != 0) {
      // mint gold required
      goldInstance.mint(msg.sender, gold);
    }

    // player (sender) becomes known to the ref points tracker
    refPointsTracker.addKnownAddress(msg.sender);

    // emit an event
    emit CouponConsumed(msg.sender, key, boxType, silver, gold);
  }

  /**
   * @notice Allows adding coupons for free silver box retrieval
   * @notice Requires a sender to have a permission to add a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @param key coupon code hash
   * @param boxType valid box type to be given freely for this coupon
   */
  function addCoupon(uint256 key, uint8 boxType) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // ensure coupon doesn't exist yet
    require(coupons[key] == 0);

    // add a coupon
    coupons[key] = boxType + 1;

    // emit an event
    emit CouponAdded(msg.sender, key, boxType);
  }

  /**
   * @notice Allows removing previously added coupons
   * @notice Requires a sender to have a permission to remove a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @param key coupon code hash
   */
  function removeCoupon(uint256 key) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // ensure coupon exists
    require(coupons[key] != 0);

    // remove the coupon
    delete coupons[key];

    // emit an event
    emit CouponRemoved(msg.sender, key);
  }

  /**
   * @notice Allows adding coupons for free silver box retrieval
   * @notice Requires a sender to have a permission to add a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @dev Overwrites the coupons if they already exist
   * @param keys array of coupon codes hashes (keccak256)
   * @param boxType valid box type to be given freely for coupons
   */
  function bulkAddCoupons(uint256[] keys, uint8 boxType) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // iterate over the keys array
    for(uint256 i = 0; i < keys.length; i++) {
      // add a coupon
      coupons[keys[i]] = boxType + 1;

      // emit an event
      emit CouponAdded(msg.sender, keys[i], boxType);
    }
  }

  /**
   * @notice Allows removing previously added coupons
   * @notice Requires a sender to have a permission to remove a coupon
   * @dev Requires sender to have `ROLE_COUPON_MANAGER` permission
   * @param keys array of coupon codes hashes (keccak256)
   */
  function bulkRemoveCoupons(uint256[] keys) public {
    // check sender has permissions to create a coupon
    require(isSenderInRole(ROLE_COUPON_MANAGER));

    // iterate over the keys array
    for(uint256 i = 0; i < keys.length; i++) {
      // remove the coupon
      delete coupons[keys[i]];

      // emit an event
      emit CouponRemoved(msg.sender, keys[i]);
    }
  }



}
