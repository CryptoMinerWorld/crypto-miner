pragma solidity 0.4.23;

import "./AddressUtils.sol";
import "./StringUtils.sol";
import "./AccessControlLight.sol";
import "./ERC165.sol";
import "./ERC721Interfaces.sol";
import "./ERC721Receiver.sol";

/**
 * @title Land Plot ERC721 Token
 *
 * @notice Land Plot is unique tradable entity. Non-fungible.
 *
 * @notice A plot consists of five tiers containing 100 blocks.
 *
 * @notice For Antarctica:
 *      Tier 1: Snow, contains 35 blocks on average
 *      Tier 2: Ice, contains 65 blocks on average
 *
 * @notice All other countries:
 *      Tier 1: Dirt, contains 35 blocks on average
 *      Tier 2: Clay, contains 30 blocks on average
 *      Tier 3: Limestone, contains 20 blocks on average
 *      Tier 4: Marble, contains 10 blocks on average
 *      Tier 5: Obsidian, contains 5 blocks on average
 *
 * @notice Examples:
 *
 *      |              snow               |                              ice                               |
 *      1111111111111111111111111111111111122222222222222222222222222222222222222222222222222222222222222222
 *      |           35 blocks             |                           65 blocks                            |
 *
 *      |              dirt               |            clay             |     limestone     |  marble |obs.|
 *      1111111111111111111111111111111111122222222222222222222222222222233333333333333333333444444444455555
 *      |           35 blocks             |          30 blocks          |     20 blocks     |10 blocks| 5  |
 *
 *
 * @notice The plot can be mined with a gem. When mined, a block
 *      can spawn an item (silver, gold, artifacts, gems, keys, chests, etc.)
 *
 * @dev A plot is an ERC721 non-fungible token, which maps Token ID -
 *      a 32 bit number - to a set of plot properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 *
 * @dev Token ID consists of 32 bits, high 8 bits represent a country id
 *      (see CountryERC721) this token belongs to
 *
 * @dev Contains information about tier structure (how many blocks of each tier exists),
 *      current mining state (how many blocks is already mined, is block in mining state
 *      or not, etc.)
 *
 * @dev Doesn't contain information about the items to be mined
 *      (silver, gold, artifacts, gems, keys, chests, etc.), this information
 *      is stored in mining smart contract
 *
 * @dev A plot token supports only minting, it can be created but not destroyed
 *
 * @author Basil Gorin
 */
contract PlotERC721 is AccessControlLight, ERC165, ERC721Interfaces {

  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0xb02d092715657ae6b84a2b0eeefce965cd27491cc0108cb42196c04e0039ceac;

  /**
   * @dev ERC20 compliant token symbol
   */
  string public constant symbol = "LND";

  /**
   * @dev ERC20 compliant token name
   */
  string public constant name = "Land Plot – CryptoMiner World";

  /**
   * @dev ERC20 compliant token decimals
   * @dev Equal to zero – since ERC721 token is non-fungible
   *      and therefore non-divisible
   */
  uint8 public constant decimals = 0;


  /**
   * @dev Token data structure (Land Plot Data Structure)
   * @dev Occupies 2 storage slots (512 bits)
   */
  struct LandPlot {
    /*** High 256 bits ***/

    /**
     * @dev Packed data structure, containing
     *      1. Number of tiers this plot contains (8 bits)
     *      2. Tier structure of the plot (48 bits)
     *      3. Current mining block index (8 bits)
     * @dev Number of tiers is:
     *        two for Antarctica,
     *        five for the rest of the world
     * @dev Tier structure of the plot consists of six indexes, pointing
     *      to the end of (n)th tier and beginning of the (n+1)th tier
     * @dev For Antarctica tier 2 points to the end of ice tier, which is also
     *      the end of the entire plot, tier 2, tier 3, tier 4 and tier 5
     *      are equal to 100 in that case
     * @dev For the rest of the world, `tier5` points to the end of the obsidian tier,
     *      which is also the end of the entire plot, `tier5` is equal to 100
     * @dev Current mining block index (also known as offset or depth)
     *      initial value is zero meaning the plot was not mined yet,
     *      value equal to tier 5 end means the block is fully mined
     */
    uint64 tiers;

    /**
     * @dev Initially zero, changes when offset changes
     *      (meaning the plot is mined)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 offsetModified;

    /**
     * @dev State value, mutable
     */
    uint128 state;

    /**
     * @dev Initially zero, changes when state is modified
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 stateModified;

    /*** Low 256 bits ***/

    /**
     * @dev Token creation time, immutable, cannot be zero
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 creationTime;

    /**
     * @dev Token index within an owner's collection of tokens
     * @dev Changes when token is being transferred (token ownership changes)
     * @dev May change if some other token of the same owner is transferred
     */
    uint32 index;

    /**
     * @dev Initially zero, changes when token ownership changes
     *      (that is token is transferred)
     * @dev Stored as unix timestamp - number of seconds passed since 1/1/1970
     */
    uint32 ownershipModified;

    /**
     * @dev Token owner, initialized upon token creation, cannot be zero
     * @dev Changes when token is being transferred to a new owner
     */
    address owner;
  }


  /**
   * @notice All the emitted tokens
   * @dev Core of the Land Plot as ERC721 token
   * @dev Maps Token ID => Land Plot Data Structure
   */
  mapping(uint256 => LandPlot) public tokens;

  /**
   * @dev Mapping from a token ID to an address approved to
   *      transfer ownership rights for this token
   */
  mapping(uint256 => address) public approvals;

  /**
   * @dev Mapping from owner to an approved operator address –
   *      an address approved to transfer any tokens of the owner
   *      token owner => approved token operator => is approved
   */
  mapping(address => mapping(address => bool)) public approvedOperators;

  /**
   * @notice Storage for a collections of tokens
   * @notice A collection of tokens is an ordered list of token IDs,
   *      owned by a particular address (owner)
   * @dev A mapping from owner to a collection of his tokens (IDs)
   * @dev ERC20 compliant structure for balances can be derived
   *      as a length of each collection in the mapping
   * @dev ERC20 balances[owner] is equal to collections[owner].length
   */
  mapping(address => uint32[]) public collections;

  /**
   * @dev Array with all token ids, used for enumeration
   * @dev ERC20 compliant structure for totalSupply can be derived
   *      as a length of this collection
   * @dev ERC20 totalSupply() is equal to allTokens.length
   */
  uint32[] public allTokens;

  /**
   * @dev The data in token's state may contain lock(s)
   *      (ex.: if token currently busy with some function which prevents transfer)
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   */
  uint128 public transferLock;


  /**
   * @notice The 'transfers' feature supports regular token transfers
   * @dev Enables ERC721 transfers of the tokens (token owner performs a transfer)
   * @dev Token owner is defined in `tokens` data structure
   */
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;

  /**
   * @notice The 'transfers on behalf' feature supports token transfers by
   *      trusted operators defined for particular tokens or token owners
   * @dev Enables ERC721 transfers on behalf (approved operator performs a transfer)
   * @dev Approved operators are defined in `approvals` and `approvedOperators`
   *      data structures
   */
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  /**
   * @notice Token creator is responsible for creating tokens
   * @dev Allows minting tokens
   */
  uint32 public constant ROLE_TOKEN_CREATOR = 0x00000001;

  /**
   * @notice State provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying token's state
   */
  uint32 public constant ROLE_STATE_PROVIDER = 0x00000004;

  /**
   * @notice Transfer lock provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying transfer lock bitmask `transferLock`
   */
  uint32 public constant ROLE_TRANSFER_LOCK_PROVIDER = 0x00000008;

  /**
   * @notice Offset provider is responsible for enabling mining protocol
   * @dev Allows increasing token's offset - current mining block index
   */
  uint32 public constant ROLE_OFFSET_PROVIDER = 0x00000010;

  /**
   * @dev Magic value to be returned upon successful reception of ERC721 token (NFT)
   * @dev Equal to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`,
   *      which can be also obtained as `ERC721Receiver(0).onERC721Received.selector`
   */
  bytes4 private constant ERC721_RECEIVED = 0x150b7a02;


  /**
   * @dev Fired in transfer(), transferFrom(), safeTransferFrom(), mint()
   * @param _from source address or zero if fired in mint()
   * @param _to non-zero destination address
   * @param _tokenId id of the token which was transferred from
   *      source address to destination address
   */
  event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);

  /**
   * @dev Fired in approve()
   * @param _owner owner of the token `_tokenId`
   * @param _approved approved (trusted) address which is allowed now
   *      to perform token `_tokenId` transfer on owner's behalf
   * @param _tokenId token which is allowed to be transferred by
   *      `_approved` on `_owner` behalf
   */
  event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);

  /**
   * @dev Fired in setApprovalForAll()
   * @param _owner an address which may have some tokens
   * @param _operator another address which is approved by owner
   *      to transfer any tokens on their behalf
   * @param _value true if `_operator` is granted approval,
   *      false if `_operator` is revoked an approval
   */
  event ApprovalForAll(address indexed _owner, address indexed _operator, bool _value);

  /**
   * @dev Fired in mint()
   * @param _by token creator (an address having `ROLE_TOKEN_CREATOR` permission)
   *      which created (minted) the token `_tokenId`
   * @param _to an address which received created token (first owner)
   * @param _tokenId ID of the newly created token
   */
  event Minted(address indexed _by, address indexed _to, uint32 indexed _tokenId);

  /**
   * @dev Fired in setState()
   * @param _by state provider
   *      (an address having `ROLE_STATE_PROVIDER` permission)
   *      which modified token `_tokenId` state
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose state was modified
   * @param _from old state
   * @param _to new state
   */
  event StateModified(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint128 _from,
    uint128 _to
  );

  /**
   * @dev Fired in setTransferLock()
   * @param _by transfer lock provider
   *      (an address having `ROLE_TRANSFER_LOCK_PROVIDER` permission)
   *      which modified `transferLock` global variable
   * @param _from old value of `transferLock`
   * @param _to new value of `transferLock`
   */
  event TransferLockChanged(
    address indexed _by,
    uint128 _from,
    uint128 _to
  );

  /**
   * @dev Fired in mineTo() and mineBy()
   * @param _by offset provider who performed the mining
   *      (an address having the `ROLE_OFFSET_PROVIDER` permission)
   * @param _owner owner of the token `_tokenId`
   * @param _tokenId id of the token whose offset was modified
   * @param _from old offset
   * @param _to new offset
   */
  event OffsetModified(
    address indexed _by,
    address indexed _owner,
    uint256 indexed _tokenId,
    uint8 _from,
    uint8 _to
  );

  /**
   * @dev Creates a ERC721 instance,
   *      registers required ERC721 interfaces via ERC165
   */
  constructor() public {
    // register the supported interfaces to conform to ERC721 via ERC165
    _registerInterface(InterfaceId_ERC721);
    _registerInterface(InterfaceId_ERC721Exists);
    _registerInterface(InterfaceId_ERC721Enumerable);
    _registerInterface(InterfaceId_ERC721Metadata);
  }

  /**
   * @dev Gets a token by ID, representing it as two integers.
   *      The two integers are tightly packed with a token data:
   *      First integer (high bits) contains (from higher to lower bits order):
   *          tiers, 64 bits
   *          offsetModified, 32 bits
   *          state, 128 bits
   *          stateModified, 32 bits
   *
   *      Second integer (low bits) contains (from higher to lower bits order):
   *          creationTime, 32 bits
   *          index, 32 bits
   *          ownershipModified, 32 bits
   *          owner, 160 bits
   * @dev Throws if token doesn't exist
   * @param _tokenId ID of the token to fetch packed structure for
   */
  function getPacked(uint256 _tokenId) public constant returns(uint256, uint256) {
    // validate token existence
    require(exists(_tokenId));

    // load the token from storage
    LandPlot memory token = tokens[_tokenId];

    // pack high 256 bits of the result
    uint256 high = uint256(token.tiers) << 192
                 | uint192(token.offsetModified) << 160
                 | uint160(token.state) << 32
                 | uint32(token.stateModified);

    // pack low 256 bits of the result
    uint256 low  = uint256(token.creationTime) << 224
                 | uint224(token.index) << 192
                 | uint192(token.ownershipModified) << 160
                 | uint160(token.owner);

    // return the whole 512 bits of result
    return (high, low);
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *       in a single function, useful when connecting to external node like INFURA
   * @dev Each element in the collection contains
   *      token ID (32 bits)m
   *      tiers (64 bits)
   *      state (32 low bits)
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of packed token data
   */
  function getPackedCollection(address owner) public constant returns (uint128[]) {
    // get an array of token IDs owned by an `owner` address
    uint32[] memory tokenIds = getCollection(owner);

    // how many tokens are there in a collection
    uint32 balance = uint32(tokenIds.length);

    // data container to store the result
    uint128[] memory result = new uint128[](balance);

    // fetch token info one by one and pack into structure
    for(uint32 i = 0; i < balance; i++) {
      // token ID to work with
      uint32 tokenId = tokenIds[i];

      // read token data structure from the storage
      LandPlot memory plot = tokens[tokenId];

      // pack the data
      result[i] = uint128(tokenId) << 96 | uint96(plot.tiers) << 32 | uint32(plot.state);
    }

    // return the packed data structure
    return result;
  }

  /**
   * @notice Retrieves a collection of token IDs owned by a particular address
   * @notice An order of token IDs is not guaranteed and may change
   *      when a token from the list is transferred
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of token IDs
   */
  function getCollection(address owner) public constant returns(uint32[]) {
    // read a collection from mapping and return
    return collections[owner];
  }

  /**
   * @dev Gets token `tiers`, a packed data structure containing
   *      1. Number of tiers this plot contains (8 bits)
   *      2. Tier structure of the plot (48 bits)
   *      3. Current mining block index (8 bits)
   * @param _tokenId ID of the token to get tiers for
   * @return token tiers packed data structure
   */
  function getTiers(uint256 _tokenId) public constant returns(uint64) {
    // validate token existence
    require(exists(_tokenId));

    // read the tiers and return
    return tokens[_tokenId].tiers;
  }

  /**
   * @dev Gets number of tiers this plot has
   *      - 2 for Antarctica, 5 for the rest of the World
   * @param _tokenId ID of the token to query number of tiers for
   * @return number of tiers this plot has,
   *      either 2 (Antarctica) or 5 (rest of the World)
   */
  function getNumberOfTiers(uint256 _tokenId) public constant returns (uint8) {
    // validate token existence
    require(exists(_tokenId));

    // extract number of tiers value from the tiers data structure and return
    return uint8(tokens[_tokenId].tiers >> 56);
  }

  /**
   * @dev Gets the depth of the tier defined by its one-based index:
   *      Tier 1: Dirt / Snow
   *      Tier 2: Clay / Ice
   *      Tier 3: Limestone - non-Antarctica only
   *      Tier 4: Marble - non-Antarctica only
   *      Tier 5: Obsidian - non-Antarctica only
   * @dev Passing index equal to zero returns Tier 1 offset,
   *      which is equal to zero by design
   * @param _tokenId ID of the token to query depth for
   * @param k one-based tier index to query depth for
   * @return depth of the (k)th tier in blocks
   */
  function getTierDepth(uint256 _tokenId, uint8 k) public constant returns (uint8) {
    // get number of tiers for the given token
    // also validates token existence
    uint8 n = getNumberOfTiers(_tokenId);

    // ensure requested tier exists
    require(k <= n);

    // extract requested tier depth data from tier structure and return
    return uint8(tokens[_tokenId].tiers >> (6 - k) * 8);
  }

  /**
   * @dev Gets token depth (a.k.a. maximum depth)
   *      - the maximum depth it can be mined to (immutable)
   * @dev Throws if token doesn't exist
   * @param _tokenId ID of the token to get depth for
   * @return token depth – the maximum depth value
   */
  function getDepth(uint256 _tokenId) public constant returns (uint8) {
    // get number of tiers for the given token
    // also validates token existence
    uint8 n = getNumberOfTiers(_tokenId);

    // extract last tier value from the tiers and return
    return uint8(tokens[_tokenId].tiers >> (6 - n) * 8);
  }

  /**
   * @dev Gets the offset modified date of a token
   * @param _tokenId ID of the token to get offset modified date for
   * @return token offset modification date as a unix timestamp
   */
  function getOffsetModified(uint256 _tokenId) public constant returns (uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's offset modified date from storage and return
    return tokens[_tokenId].offsetModified;
  }

  /**
   * @dev Gets token offset (a.k.a. depth)
   *      - current mined depth (initially zero)
   * @dev Throws if token doesn't exist
   * @param _tokenId ID of the token to get offset for
   * @return token offset – current mined depth value
   */
  function getOffset(uint256 _tokenId) public constant returns(uint8) {
    // validate token existence
    require(exists(_tokenId));

    // extract the offset value from the tiers and return
    return uint8(tokens[_tokenId].tiers);
  }

  /**
   * @dev Verifies if token is fully mined that is
   *      its offset is equal to the depth
   * @param _tokenId ID of the token to check
   * @return true if token is fully mined, false otherwise
   */
  function isFullyMined(uint256 _tokenId) public constant returns(bool) {
    // get the offset value, depth value and compare them
    // checks token existence under the hood when delegating
    // calls to `getOffset` and `getDepth`
    return getOffset(_tokenId) >= getDepth(_tokenId);
  }

  /**
   * @dev Mines the token to the depth specified
   * @dev Requires depth to be bigger than current offset
   * @dev Requires sender to have `ROLE_OFFSET_PROVIDER` permission
   * @dev _tokenId ID of the token to mine
   * @dev depth absolute depth value to mine to, greater than current depth
   */
  function mineTo(uint256 _tokenId, uint8 depth) public {
    // check that the call is made by a offset provider
    require(isSenderInRole(ROLE_OFFSET_PROVIDER));

    // validate token existence
    require(exists(_tokenId));

    // get current offset value
    uint8 offset = uint8(tokens[_tokenId].tiers);

    // get token length value
    uint8 length = uint8(tokens[_tokenId].tiers >> 8);

    // ensure we're getting deeper, but not deeper than maximum depth
    require(depth > offset && depth <= length);

    // perform mining, update the offset
    tokens[_tokenId].tiers &= 0xFFFFFFFFFFFFFF00;
    tokens[_tokenId].tiers |= depth;

    // update the offset modification date
    tokens[_tokenId].offsetModified = uint32(now);

    // emit an event
    emit OffsetModified(msg.sender, ownerOf(_tokenId), _tokenId, offset, depth);
  }

  /**
   * @dev Mines the token by the depth delta specified
   * @dev Requires depth delta to be positive value
   * @dev Requires sender to have `ROLE_OFFSET_PROVIDER` permission
   * @dev _tokenId ID of the token to mine
   * @dev depth depth delta value to mine by, greater than zero
   */
  function mineBy(uint256 _tokenId, uint8 depth) public {
    // check that the call is made by a offset provider
    require(isSenderInRole(ROLE_OFFSET_PROVIDER));

    // validate token existence
    require(exists(_tokenId));

    // get current offset value
    uint8 offset = uint8(tokens[_tokenId].tiers);

    // get token length value
    uint8 length = uint8(tokens[_tokenId].tiers >> 8);

    // ensure we're getting deeper, but not deeper than maximum depth,
    // also performing arithmetic overflow check
    require(depth > 0 && depth + offset > offset && depth + offset <= length);

    // perform mining, increase the offset
    tokens[_tokenId].tiers += depth;

    // update the offset modification date
    tokens[_tokenId].offsetModified = uint32(now);

    // emit an event
    emit OffsetModified(msg.sender, ownerOf(_tokenId), _tokenId, offset, offset + depth);
  }

  /**
   * @dev Gets the state modified date of a token
   * @param _tokenId ID of the token to get state modified date for
   * @return token state modification date as a unix timestamp
   */
  function getStateModified(uint256 _tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's state modified date from storage and return
    return tokens[_tokenId].stateModified;
  }

  /**
   * @dev Gets the state of a token
   * @param _tokenId ID of the token to get state for
   * @return a token state
   */
  function getState(uint256 _tokenId) public constant returns(uint128) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's state from storage and return
    return tokens[_tokenId].state;
  }

  /**
   * @dev Verifies if token is transferable (can change ownership)
   * @param _tokenId ID of the token to check transferable state for
   * @return true if token is transferable, false otherwise
   */
  function isTransferable(uint256 _tokenId) public constant returns(bool) {
    // validate token existence
    require(exists(_tokenId));

    // calculate token state and transfer mask intersection
    // and compare this intersection with zero
    return tokens[_tokenId].state & transferLock == 0;
  }

  /**
   * @dev Modifies the state of a token
   * @dev Requires sender to have `ROLE_STATE_PROVIDER` permission
   * @param _tokenId ID of the token to set state for
   * @param newState new state to set for the token
   */
  function setState(uint256 _tokenId, uint128 newState) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_STATE_PROVIDER));

    // check that token to set state for exists
    require(exists(_tokenId));

    // read old state value
    uint128 state = tokens[_tokenId].state;

    // check that new state is not the same as an old one
    require(newState != state);

    // set the state required
    tokens[_tokenId].state = newState;

    // update the state modified date
    tokens[_tokenId].stateModified = uint32(now);

    // emit an event
    emit StateModified(msg.sender, ownerOf(_tokenId), _tokenId, state, newState);
  }

  /**
   * @dev Gets the creation time of a token
   * @param _tokenId ID of the token to get creation time for
   * @return a token creation time as a unix timestamp
   */
  function getCreationTime(uint256 _tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's creation time from storage and return
    return tokens[_tokenId].creationTime;
  }

  /**
   * @dev Gets the ownership modified time of a token
   * @param _tokenId ID of the token to get ownership modified time for
   * @return a token ownership modified time as a unix timestamp
   */
  function getOwnershipModified(uint256 _tokenId) public constant returns(uint32) {
    // validate token existence
    require(exists(_tokenId));

    // obtain token's ownership modified time from storage and return
    return tokens[_tokenId].ownershipModified;
  }

  /**
   * @dev Allows setting the `transferLock` parameter of the contract,
   *      which is used to determine if a particular token is locked or not
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   * @dev Requires sender to have `ROLE_TRANSFER_LOCK_PROVIDER` permission.
   * @param bitmask a value to set `transferLock` to
   */
  function setTransferLock(uint128 bitmask) public {
    // check that the call is made by a transfer lock provider
    require(isSenderInRole(ROLE_TRANSFER_LOCK_PROVIDER));

    // old transfer lock value
    uint128 lock = transferLock;

    // check that new lock is not the same as an old one
    require(lock != bitmask);

    // update the transfer lock
    transferLock = bitmask;

    // emit an event
    emit TransferLockChanged(msg.sender, lock, bitmask);
  }


  /**
   * @dev Creates new token with token ID specified and
   *      assigns an ownership `_to` for this token
   * @param _to an address to assign created token ownership to
   * @param _tokenId ID of the token to create
   * @param _tiers tiers structure of the token to create, containing
   *      1. Number of tiers this plot contains (8 bits)
   *        - 2 for Antarctica or 5 for the rest of the World
   *      2. Tier structure of the plot (48 bits)
   *        - 6 elements, 8 bits each
   *      3. Current mining block index (8 bits)
   *        - must be zero
   */
  function mint(address _to, uint32 _tokenId, uint64 _tiers) public {
    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    __mint(_to, _tokenId, _tiers);

    // fire Minted event
    emit Minted(msg.sender, _to, _tokenId);

    // fire ERC20/ERC721 transfer event
    emit Transfer(address(0), _to, _tokenId);
  }

  /**
   * @notice Total number of existing tokens (tracked by this contract)
   * @return A count of valid tokens tracked by this contract,
   *    where each one of them has an assigned and
   *    queryable owner not equal to the zero address
   */
  function totalSupply() public constant returns (uint256) {
    // read the length of the `allTokens` collection
    return allTokens.length;
  }

  /**
   * @notice Enumerate valid tokens
   * @dev Throws if `_index` >= `totalSupply()`.
   * @param _index a counter less than `totalSupply()`
   * @return The token ID for the `_index`th token, unsorted
   */
  function tokenByIndex(uint256 _index) public constant returns (uint256) {
    // out of bounds check
    require(_index < allTokens.length);

    // get the token ID and return
    return allTokens[_index];
  }

  /**
   * @notice Enumerate tokens assigned to an owner
   * @dev Throws if `_index` >= `balanceOf(_owner)`.
   * @param _owner an address of the owner to query token from
   * @param _index a counter less than `balanceOf(_owner)`
   * @return the token ID for the `_index`th token assigned to `_owner`, unsorted
   */
  function tokenOfOwnerByIndex(address _owner, uint256 _index) public constant returns (uint256) {
    // out of bounds check
    require(_index < collections[_owner].length);

    // get the token ID from owner collection and return
    return collections[_owner][_index];
  }

  /**
   * @notice Gets number of tokens owned by the given address
   * @dev Gets the balance of the specified address
   * @param _owner address to query the balance for
   * @return number of tokens owned by the address specified
   */
  function balanceOf(address _owner) public constant returns (uint256) {
    // validate an owner address
    require(_owner != address(0));

    // read the length of the `who`s collection of tokens
    return collections[_owner].length;
  }

  /**
   * @notice Checks if specified token exists,
   *      meaning it was minted and has an owner
   * @dev Returns whether the specified token ID exists (has owner)
   * @param _tokenId ID of the token to query the existence for
   * @return true if specified token exists, false otherwise
   */
  function exists(uint256 _tokenId) public constant returns (bool) {
    // check if this token exists (owner is not zero)
    return tokens[_tokenId].owner != address(0);
  }

  /**
   * @notice Finds an owner address for the token specified
   * @dev Gets the owner of the specified token from the `tokens` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param _tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint256 _tokenId) public constant returns (address) {
    // check if this token exists
    require(exists(_tokenId));

    // return owner's address
    return tokens[_tokenId].owner;
  }

  /**
   * @notice A.k.a "unsafe transfer"
   * @notice Transfers ownership rights of the token defined
   *      by the token ID to a new owner specified by its address
   * @notice Doesn't validate if destination address supports ERC721 tokens!
   *      The token may be LOST if destination address doesn't support ERC721 tokens.
   * @dev Transfers the ownership of a given token ID to another address
   * @dev This function is maintained to be used by developers to reduce gas costs
   * @dev Requires the transaction sender to be an owner of the token specified
   * @param _to new owner address
   * @param _tokenId ID of the token to transfer ownership rights for
   */
  function transfer(address _to, uint256 _tokenId) public {
    // check if token transfers feature is enabled
    require(isFeatureEnabled(FEATURE_TRANSFERS));

    // delegate call to unsafe `__transfer`, passing msg.sender as `_from`
    __transfer(msg.sender, _to, _tokenId);
  }

  /**
   * @notice A.k.a "unsafe transfer on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the token ID to a new owner specified by its address
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @notice Doesn't validate if destination address supports ERC721 tokens!
   *      The token may be LOST if destination address doesn't support ERC721 tokens.
   * @dev Transfers the ownership of a given token ID to another address
   * @dev This function is maintained to be used by developers to reduce gas costs
   * @dev Requires the transaction sender to be one of:
   *      owner of a token - then its just a usual `transfer()` (aka unsafe transfer)
   *      approved – an address explicitly approved earlier by
   *        the owner of a token to transfer this particular token ID
   *      operator - an address explicitly approved earlier by
   *        the owner to transfer all his tokens on behalf
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _tokenId) public {
    // if `_from` is equal to sender, require transfers feature to be enabled
    // otherwise require transfers on behalf feature to be enabled
    require(_from == msg.sender && isFeatureEnabled(FEATURE_TRANSFERS)
         || _from != msg.sender && isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

    // call sender gracefully - `operator`
    address operator = msg.sender;

    // find if an approved address exists for this token
    address approved = approvals[_tokenId];

    // we assume `_from` is an owner of the token,
    // this will be explicitly checked in `__transfer()`

    // operator must have an approval to transfer this particular token
    // or operator must be approved to transfer all the tokens
    // or, if nothing satisfies, this is equal to regular transfer,
    // where `_from` is basically a transaction sender and owner of the token
    if(operator != approved && !approvedOperators[_from][operator]) {
      // transaction sender doesn't have any special permissions
      // we will treat him as a token owner and sender and try to perform
      // a regular transfer:
      // ensure `_from` is an `operator` (transaction sender):
      require(_from == operator);
    }

    // delegate call to unsafe `__transfer()`
    __transfer(_from, _to, _tokenId);
  }

  /**
   * @notice A.k.a "safe transfer on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the token ID to a new owner specified by its address
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @notice Validates if destination address supports ERC721
   * @dev Safely transfers the ownership of a given token ID to another address
   *      by verifying if the receiver is an external address or
   *      by calling onERC721Received() function on the receiver if its a smart contract
   * @dev Requires the transaction sender to be one of:
   *      owner of a token - then its similar to `transfer()` but with
   *        ERC721 support check on the receiver
   *      approved – an address explicitly approved earlier by
   *        the owner of a token to transfer this particular token ID
   *      operator - an address explicitly approved earlier by
   *        the owner to transfer all his tokens on behalf
   * @dev When transfer is complete, this function
   *      checks if `_to` is a smart contract (code size > 0).
   *      If so - it calls `onERC721Received()` and throws if the return value is not
   *      `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
   *      The whole transaction is reverted in case of this error.
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   * @param _data Additional data with no specified format, sent
   *      in the onERC721Received() call to `_to`;
   *      ignored if the receiver is an external address
   */
  function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes _data) public {
    // delegate call to unsafe transfer on behalf `transferFrom()`
    transferFrom(_from, _to, _tokenId);

    // check if receiver `_to` supports ERC721 interface
    if (AddressUtils.isContract(_to)) {
      // if `_to` is a contract – execute onERC721Received()
      bytes4 response = ERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data);

      // expected response is ERC721_RECEIVED
      require(response == ERC721_RECEIVED);
    }
  }

  /**
   * @notice A.k.a "safe transfer on behalf"
   * @notice Transfers ownership rights of a token defined
   *      by the token ID to a new owner specified by its address
   * @notice Allows transferring ownership rights by a trading operator
   *      on behalf of token owner. Allows building an exchange of tokens.
   * @notice Validates if destination address supports ERC721
   * @dev Safely transfers the ownership of a given token ID to another address
   *      by verifying if the receiver is an external address or
   *      by calling onERC721Received() function on the receiver if its a smart contract
   * @dev Requires the transaction sender to be one of:
   *      owner of a token - then its similar to `transfer()` but with
   *        ERC721 support check on the receiver
   *      approved – an address explicitly approved earlier by
   *        the owner of a token to transfer this particular token ID
   *      operator - an address explicitly approved earlier by
   *        the owner to transfer all his tokens on behalf
   * @dev When transfer is complete, this function
   *      checks if `_to` is a smart contract (code size > 0).
   *      If so - it calls `onERC721Received()` and throws if the return value is not
   *      `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
   *      The whole transaction is reverted in case of this error.
   * @dev This works identically to the other function with an extra data parameter,
   *      except this function just sets data to "".
   * @param _from current owner of the token
   * @param _to address to receive the ownership of the token
   * @param _tokenId ID of the token to be transferred
   *      in the onERC721Received() call to `_to`;
   *      ignored if the receiver is an external address
   */
  function safeTransferFrom(address _from, address _to, uint256 _tokenId) public {
    // delegate call to overloaded `safeTransferFrom()`, set data to ""
    safeTransferFrom(_from, _to, _tokenId, "");
  }

  /**
   * @notice Approves an address to transfer the given token on behalf of its owner
   * @notice Can also be used to revoke an approval by setting approved address to zero
   * @dev The zero approved address revokes an approval for a given token
   * @dev There can only be one approved address per token at a given time
   * @dev This function can only be called by the token owner
   * @param _approved address to be approved to transfer the token on behalf of its owner
   * @param _tokenId ID of the token to be approved for transfer on behalf
   */
  function approve(address _approved, uint256 _tokenId) public {
    // get token owner address (throws if token doesn't exist)
    address owner = ownerOf(_tokenId);

    // caller must own this token
    require(msg.sender == owner);

    // approval for owner himself is pointless, do not allow
    require(_approved != owner);

    // either we're removing approval, or setting it
    require(approvals[_tokenId] != address(0) || _approved != address(0));

    // set an approval (deletes an approval if approved address is zero)
    approvals[_tokenId] = _approved;

    // emit an ERC721 event
    emit Approval(msg.sender, _approved, _tokenId);
  }

  /**
   * @notice Removes an approved address, which was previously added by `approve()`
   *      for the given token. Equivalent to calling `approve(0, _tokenId)`.
   * @dev Equal to calling `approve(0, _tokenId)`
   * @param _tokenId ID of the token to remove approved address for
   */
  function revokeApproval(uint256 _tokenId) public {
    // delegate call to `approve()`
    approve(address(0), _tokenId);
  }

  /**
   * @dev Sets or unsets the approval state of a given operator
   * @dev An operator is allowed to transfer ALL tokens of the sender on their behalf
   * @param _operator operator address to set the approval for
   * @param _approved representing the status of the approval to be set:
   *      true – grants an approval
   *      false - revokes an approval
   */
  function setApprovalForAll(address _operator, bool _approved) public {
    // call sender nicely - `_owner`
    address _owner = msg.sender;

    // we do not check if owner actually owns any tokens;
    // an owner may not own anything at the moment when
    // this function is called, but still an operator
    // will already have a permission to transfer owner's tokens

    // validate destination address
    require(_operator != address(0));

    // approval for owner himself is pointless, do not allow
    require(_operator != _owner);

    // set an approval
    approvedOperators[_owner][_operator] = _approved;

    // emit an ERC721 event
    emit ApprovalForAll(_owner, _operator, _approved);
  }

  /**
   * @notice Gets the approved address for a single token
   * @dev Throws if `_tokenId` is not a valid token ID.
   * @param _tokenId ID of the token to find the approved address for
   * @return the approved address for this token,
   *      or the zero address if there is no approved address
   */
  function getApproved(uint256 _tokenId) public constant returns (address) {
    // validate token existence
    require(exists(_tokenId));

    // find approved address and return
    return approvals[_tokenId];
  }

  /**
   * @notice Query if an address is an authorized operator for another address
   * @param _owner the address which may have another address acting
   *      on their behalf (operator address)
   * @param _operator the address that acts on behalf of the owner
   * @return true if `_operator` is allowed to transfer `_owner`s tokens, false otherwise
   */
  function isApprovedForAll(address _owner, address _operator) public constant returns (bool) {
    // is there a positive amount of approvals left
    return approvedOperators[_owner][_operator];
  }

  /**
   * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
   * @dev Throws if `_tokenId` is not a valid token ID.
   *      URIs are defined in RFC 3986.
   * @param _tokenId token ID of the token to query
   * @return token URI as UTF-8 string
   */
  function tokenURI(uint256 _tokenId) public constant returns (string) {
    // validate token existence
    require(exists(_tokenId));

    // token URL consists of base URL part (domain) and token ID
    return StringUtils.concat("http://cryptominerworld.com/plot/0x", StringUtils.itoa(_tokenId, 16));
  }

  /**
   * @dev Performs a transfer of a token `_tokenId` from address `_from` to address `_to`
   * @dev Unsafe: doesn't check if caller has enough permissions to execute the call;
   *      checks only for token existence and that ownership belongs to `_from`
   * @dev Is save to call from `transfer(_to, _tokenId)` since it doesn't need any additional checks
   * @dev Must be kept private at all times
   * @param _from an address which performs a transfer, must be a token owner
   * @param _to an address which receives a token
   * @param _tokenId ID of a token to transfer
   */
  function __transfer(address _from, address _to, uint256 _tokenId) private {
    // validate source and destination addresses
    require(_to != address(0));
    require(_to != _from);

    // impossible by design of transfer(), transferFrom(),
    // approveToken() and approve()
    assert(_from != address(0));

    // validate token existence
    require(exists(_tokenId));

    // validate token ownership
    require(ownerOf(_tokenId) == _from);

    // transfer is not allowed for a locked token
    require(isTransferable(_tokenId));

    // clear approved address for this particular token + emit an event
    __clearApprovalFor(_tokenId);

    // move token ownership,
    // update old and new owner's token collections accordingly
    __move(_from, _to, _tokenId);

    // fire ERC721 transfer event
    emit Transfer(_from, _to, _tokenId);
  }

  /**
   * @dev Clears approved address for a particular token
   * @param _tokenId ID of a token to clear approvals for
   */
  function __clearApprovalFor(uint256 _tokenId) private {
    // check if approval exists - we don't want to fire an event in vain
    if(approvals[_tokenId] != address(0)) {
      // clear approval
      delete approvals[_tokenId];

      // emit an ERC721 event
      emit Approval(msg.sender, address(0), _tokenId);
    }
  }

  /**
   * @dev Moves token from owner `_from` to a new owner `_to`:
   *      modifies token owner, moves token ID from `_from` collection
   *      to `_to` collection
   * @dev Unsafe, doesn't check for data structures consistency
   *      (token existence, token ID presence in `collections`, etc.)
   * @dev Must be kept private at all times
   * @param _from an address to take token from
   * @param _to an address to put token into
   * @param _tokenId ID of the token to move
   */
  function __move(address _from, address _to, uint256 _tokenId) private {
    // cast token ID to uint32 space
    uint32 tokenId = uint32(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the token structure pointer to the storage
    LandPlot storage token = tokens[tokenId];

    // get a reference to the collection where token is now
    uint32[] storage source = collections[_from];

    // get a reference to the collection where token goes to
    uint32[] storage destination = collections[_to];

    // collection `source` cannot be empty, by design of transfer functions
    assert(source.length != 0);

    // index of the token within collection `source`
    uint32 i = token.index;

    // we put the last token in the collection `source` to the position released
    // get an ID of the last token in `source`
    uint32 sourceId = source[source.length - 1];

    // update last token index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position `i` within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update token index according to position in new collection `destination`
    token.index = uint32(destination.length);

    // update token owner
    token.owner = _to;

    // update token ownership transfer date
    token.ownershipModified = uint32(now);

    // push token into destination collection
    destination.push(tokenId);
  }

  /**
   * @dev Creates new token with token ID specified and
   *      assigns an ownership `_to` for this token
   * @dev Unsafe: doesn't check if caller has enough permissions to execute the call,
   *      checks only that the token doesn't exist yet
   * @dev Must be kept private at all times
   * @param _to an address to mint token to (first owner of the token)
   * @param _tokenId ID of the token to mint, by convention
   *     high 8 bits of the ID represent a country
   * @param _tiers tiers structure of the token
   */
  function __mint(address _to, uint32 _tokenId, uint64 _tiers) private {
    // validate destination address
    require(_to != address(0));
    require(_to != address(this));

    // verify token ID is not zero
    require(_tokenId != 0);

    // extract number of tiers this plot contains
    uint8 n = uint8(_tiers >> 56);

    // ensure tiers array contains exactly
    // 2 (Antarctica) or 5 (Rest of the World) elements
    require(n == 2 || n == 5);

    // ensure tier1 offset is zero
    require(uint8(_tiers >> 48) == 0);

    // validate tiers structure – first n layers
    for(uint8 i = 0; i < n; i++) {
      // (n)th tier offset must be greater than (n-1)th tier offset
      require(uint8(_tiers >> (6 - i) * 8) < uint8(_tiers >> (5 - i) * 8));
    }

    // validate tiers structure – sparse 5 - n layers
    for(uint8 j = n; j < 5; j++) {
      // (n)th tier offset must be equal to 2nd tier offset
      require(uint8(_tiers >> (6 - n) * 8) == uint8(_tiers >> (5 - j) * 8));
    }

    // verify initial offset is zero
    require(uint8(_tiers) == 0);

    // ensure that token with such ID doesn't exist
    require(!exists(_tokenId));

    // create new token in memory
    LandPlot memory token = LandPlot({
      tiers: 0xFFFFFFFFFFFFFF00 & _tiers, // erase initial offset
      offsetModified: 0,
      state: 1,
      stateModified: 0,
      creationTime: uint32(now),
      index: uint32(collections[_to].length),
      ownershipModified: 0,
      owner: _to
    });

    // push newly created `tokenId` to the owner's collection of tokens
    collections[_to].push(_tokenId);

    // persist token to the storage
    tokens[_tokenId] = token;

    // add token ID to the `allTokens` collection,
    // automatically updates total supply
    allTokens.push(_tokenId);
  }


}
