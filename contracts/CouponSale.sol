pragma solidity 0.4.23;

import "./Presale.sol";
import "./AccessControl.sol";

/**
 * An Extension of the presale which allows adding and using of a coupons
 * for a free gem promotions
 */
contract CouponSale is Presale, AccessControl {
  // smart contract version
  uint32 public constant COUPON_SALE_VERSION = 0x1;

  // a role required to create/add coupons
  uint32 public constant ROLE_COUPON_MANAGER = 0x00000100;

  // coupon definition structure
  struct Coupon {
    // creation time (block number)
    uint32 created;
    // expiration time (block number)
    uint32 expires;
    // number of free gems issued when used
    uint8 freeGems;
  }

  // available coupon storage
  mapping(uint256 => Coupon) public coupons;

  // pointer to a next gem do be minted
  uint32 public nextFreeGem = 0x1101;

  // how many free gems allocated by means of coupons
  uint32 public freeGemsAllocated;

  // how many free gems were consumed by players (codes used)
  uint32 public freeGemsUsed;

  // how many coupons were totally added into the system
  uint32 public couponsCreated;

  // how many coupons were removed
  uint32 public couponsRemoved;

  // how many coupons were used (consumed) by the players
  uint32 public couponsConsumed;

  // event to be fired once coupon successfully added
  event CouponAdded(address indexed _by, uint256 indexed key, uint32 expires, uint8 freeGems);

  // event to be fired once coupon was removed
  event CouponRemoved(address indexed _by, uint256 indexed key);

  // event to be fired once coupon was consumed
  event CouponConsumed(address indexed _from, address indexed _to, uint256 indexed key,  uint8 gems);

  // creates a coupon sale, arguments are the same as in presale
  constructor(address gemAddress, address _chestVault, address _beneficiary) Presale(gemAddress, _chestVault, _beneficiary) public {
    
  }

  // checks if coupon is valid
  function isCouponValid(string code) public constant returns (bool) {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // fetch the coupon
    Coupon memory coupon = coupons[key];

    // coupon is valid if it didn't expire
    return coupon.expires > block.number;
  }

  // uses a coupon
  function useCoupon(string code) public {
    // calculate the key to fetch the coupon
    uint256 key = uint256(keccak256(code));

    // fetch the coupon
    Coupon memory coupon = coupons[key];

    // coupon is valid if it didn't expire
    require(coupon.expires > block.number);

    // how many gems to mint
    uint8 gems = coupon.freeGems;

    // there should be free gems to mint
    assert(gems > 0);

    // update counters
    couponsConsumed++;
    freeGemsUsed += gems;

    // remove coupon from storage
    delete coupons[key];

    // call sender nicely - player
    address player = msg.sender;

    // mint free gems and send them to player
    __createGems(player, gems);

    // emit an event
    emit CouponConsumed(player, player, key, gems);
  }

  // adds a coupon with a default expiration date – 1 million blocks (about half a year)
  function addCoupon(uint256 key, uint8 freeGems) public {
    // delegate call to `addCouponWithExpiration`
    addCouponWithExpiration(key, uint32(block.number + 0x100000), freeGems);
  }

  // adds a coupon with expiration date
  function addCouponWithExpiration(uint256 key, uint32 expires, uint8 freeGems) public {
    // check appropriate sender permissions
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // validate inputs:
    // expiration date
    require(expires > block.number);
    // number of free gems in coupon: 1 or 3 (GEMS_IN_GEODE)
    require(freeGems == 1 || freeGems == GEMS_IN_GEODE);

    // update counters
    couponsCreated++;
    freeGemsAllocated += freeGems;

    // create a coupon structure
    Coupon memory coupon = Coupon(uint32(block.number), expires, freeGems);

    // put newly created coupon into the mapping
    coupons[key] = coupon;

    // emit an event
    emit CouponAdded(msg.sender, key, expires, freeGems);
  }

  // removes a coupon
  function removeCoupon(uint256 key) public {
    // check appropriate sender permissions
    require(__isSenderInRole(ROLE_COUPON_MANAGER));

    // coupon must exist
    require(coupons[key].created > 0);

    // update counter
    couponsRemoved++;

    // delete coupon from storage
    delete coupons[key];

    // emit an event
    emit CouponRemoved(msg.sender, key);
  }

  // private function to create geode and send all
  // the gems inside it to a player
  function __createGems(address player, uint8 n) private {
    // generate the gems (geode content)
    Gem[] memory gems = __randomGems(0, n, n == 4);

    // iterate and mint gems required
    for(uint32 i = 0; i < gems.length; i++) {
      gemContract.mint(
        player,
        nextFreeGem++,
        gems[i].plotId,
        gems[i].depth,
        gems[i].gemNum,
        gems[i].color,
        gems[i].level,
        gems[i].gradeType,
        gems[i].gradeValue
      );
    }
  }
}
