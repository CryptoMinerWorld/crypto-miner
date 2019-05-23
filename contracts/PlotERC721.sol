pragma solidity 0.5.8;

import "./AddressUtils.sol";
import "./StringUtils.sol";
import "./TierMath.sol";
import "./ERC721Receiver.sol";
import "./ERC721Core.sol";

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
 *      a 24 bit number - to a set of plot properties -
 *      attributes (mostly immutable by their nature) and state variables (mutable)
 *
 * @dev Token ID consists of 24 bits, high 8 bits represent a country id
 *      (see CountryERC721) this token belongs to, low 16 bits represent
 *      an index number of the token within a country
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
contract PlotERC721 is ERC721Core {

  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0x216c71f30bc2bf96dd0dfeae5cf098bfe9e0da295785ebe16a6696b0d997afec;

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
     *          - Tier 1 offset (start of Tier 1), usually zero, 8 bits
     *          - Tier 2 offset (start of Tier 2 / end of Tier 1), 8 bits
     *          - Tier 3 offset (start of Tier 3 / end of Tier 2), 8 bits
     *          - Tier 4 offset (start of Tier 4 / end of Tier 3), 8 bits
     *          - Tier 5 offset (start of Tier 5 / end of Tier 4), 8 bits
     *          - End of Tier 5 (block depth), 8 bits
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
     * @dev Only low 24 bits are used
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
   * @dev Auxiliary data structure to keep track of how many tokens
   *      was minted for each country ID (high 8 bits of the token ID)
   */
  mapping(uint8 => uint16) public minted;


  /**
   * @notice All the emitted tokens
   * @dev Core of the Land Plot as ERC721 token
   * @dev Maps Token ID => Land Plot Data Structure
   */
  mapping(uint256 => LandPlot) public tokens;

  /**
   * @notice Storage for a collections of tokens
   * @notice A collection of tokens is an ordered list of token IDs,
   *      owned by a particular address (owner)
   * @dev A mapping from owner to a collection of his tokens (IDs)
   * @dev ERC20 compliant structure for balances can be derived
   *      as a length of each collection in the mapping
   * @dev ERC20 balances[owner] is equal to collections[owner].length
   */
  mapping(address => uint24[]) public collections;

  /**
   * @dev Array with all token ids, used for enumeration
   * @dev ERC20 compliant structure for totalSupply can be derived
   *      as a length of this collection
   * @dev ERC20 totalSupply() is equal to allTokens.length
   */
  uint24[] public allTokens;

  /**
   * @dev The data in token's state may contain lock(s)
   *      (ex.: if token currently busy with some function which prevents transfer)
   * @dev A locked token cannot be transferred
   * @dev The token is locked if it contains any bits
   *      from the `transferLock` in its `state` set
   */
  uint128 public transferLock = DEFAULT_MINING_BIT;

  /**
   * @dev Default bitmask indicating that the plot is being `mined`
   * @dev Consists of a single bit at position 1 – binary 1
   * @dev The bit meaning in token's `state` is as follows:
   *      0: not mining
   *      1: mining
   */
  uint128 public constant DEFAULT_MINING_BIT = 0x1; // bit number 1

  /**
   * @notice State provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying token's state
   */
  uint32 public constant ROLE_STATE_PROVIDER = 0x00000010;

  /**
   * @notice Transfer lock provider is responsible for various features of the game,
   *      including token locking (required to enabling mining protocol)
   * @dev Allows modifying transfer lock bitmask `transferLock`
   */
  uint32 public constant ROLE_TRANSFER_LOCK_PROVIDER = 0x00000020;

  /**
   * @notice Offset provider is responsible for enabling mining protocol
   * @dev Allows increasing token's offset - current mining block index
   */
  uint32 public constant ROLE_OFFSET_PROVIDER = 0x00000040;


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
  event TransferLockChanged(address indexed _by, uint128 _from, uint128 _to);

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
   *          index, 32 bits (only low 24 bits are used)
   *          ownershipModified, 32 bits
   *          owner, 160 bits
   * @dev Throws if token doesn't exist
   * @param _tokenId ID of the token to fetch packed structure for
   */
  function getPacked(uint256 _tokenId) public view returns(uint256, uint256) {
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
   * @dev Allows to fetch all existing (minted) token IDs
   * @return an ordered unsorted list of all existing token IDs
   */
  function getAllTokens() public view returns(uint24[] memory) {
    // read an array of all the minted tokens and return
    return allTokens;
  }

  /**
   * @dev Allows to fetch collection of tokens, including internal token data
   *       in a single function, useful when connecting to external node like INFURA
   * @dev Each element in the collection contains
   *      token ID (24 bits)
   *      tiers (64 bits)
   *      state (8 low bits)
   * @param owner an address to query a collection for
   * @return an ordered unsorted list of packed token data
   */
  function getPackedCollection(address owner) public view returns (uint96[] memory) {
    // get an array of token IDs owned by an `owner` address
    uint24[] memory tokenIds = getCollection(owner);

    // how many tokens are there in a collection
    uint24 balance = uint24(tokenIds.length);

    // data container to store the result
    uint96[] memory result = new uint96[](balance);

    // fetch token info one by one and pack into structure
    for(uint32 i = 0; i < balance; i++) {
      // token ID to work with
      uint24 tokenId = tokenIds[i];

      // read token data structure from the storage
      LandPlot memory plot = tokens[tokenId];

      // pack the data
      result[i] = uint96(tokenId) << 72 | uint72(plot.tiers) << 8 | uint8(plot.state);
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
  function getCollection(address owner) public view returns(uint24[] memory) {
    // read a collection from mapping and return
    return collections[owner];
  }


  /**
   * @dev Gets token `tiers`, a packed data structure containing
   *      1. Number of tiers this plot contains (8 bits)
   *      2. Tier structure of the plot (48 bits)
   *          - Tier 1 offset (start of Tier 1), usually zero, 8 bits
   *          - Tier 2 offset (start of Tier 2 / end of Tier 1), 8 bits
   *          - Tier 3 offset (start of Tier 3 / end of Tier 2), 8 bits
   *          - Tier 4 offset (start of Tier 4 / end of Tier 3), 8 bits
   *          - Tier 5 offset (start of Tier 5 / end of Tier 4), 8 bits
   *          - End of Tier 5 (block depth), 8 bits
   *      3. Current mining block index (8 bits)
   * @param _tokenId ID of the token to get tiers for
   * @return token tiers packed data structure
   */
  function getTiers(uint256 _tokenId) public view returns(uint64) {
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
  function getNumberOfTiers(uint256 _tokenId) public view returns (uint8) {
    // get token's tiers data structure
    // verifies token existence under the hood
    uint64 tiers = getTiers(_tokenId);

    // use TierMath library to perform the operation
    return TierMath.getNumberOfTiers(tiers);
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
  function getTierDepth(uint256 _tokenId, uint8 k) public view returns (uint8) {
    // get token's tiers data structure
    // verifies token existence under the hood
    uint64 tiers = getTiers(_tokenId);

    // use TierMath library to perform the operation
    return TierMath.getTierDepth(tiers, k);
  }

  /**
   * @dev Gets token depth (a.k.a. maximum depth)
   *      - the maximum depth it can be mined to (immutable)
   * @dev Throws if token doesn't exist
   * @param _tokenId ID of the token to get depth for
   * @return token depth – the maximum depth value
   */
  function getDepth(uint256 _tokenId) public view returns (uint8) {
    // get token's tiers data structure
    // verifies token existence under the hood
    uint64 tiers = getTiers(_tokenId);

    // use TierMath library to perform the operation
    return TierMath.getDepth(tiers);
  }

  /**
   * @dev Gets the offset modified date of a token
   * @param _tokenId ID of the token to get offset modified date for
   * @return token offset modification date as a unix timestamp
   */
  function getOffsetModified(uint256 _tokenId) public view returns (uint32) {
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
  function getOffset(uint256 _tokenId) public view returns(uint8) {
    // get token's tiers data structure
    // verifies token existence under the hood
    uint64 tiers = getTiers(_tokenId);

    // use TierMath library to perform the operation
    return TierMath.getOffset(tiers);
  }

  /**
   * @dev Verifies if token is fully mined that is
   *      its offset is equal to the depth
   * @param _tokenId ID of the token to check
   * @return true if token is fully mined, false otherwise
   */
  function isFullyMined(uint256 _tokenId) public view returns(bool) {
    // get token's tiers data structure
    // verifies token existence under the hood
    uint64 tiers = getTiers(_tokenId);

    // use TierMath library to perform the operation
    return TierMath.isFullyMined(tiers);
  }

  /**
   * @dev Mines the token to the depth specified
   * @dev Requires depth to be bigger than current offset
   * @dev Requires sender to have `ROLE_OFFSET_PROVIDER` permission
   * @param _tokenId ID of the token to mine
   * @param _offset absolute depth value to mine to, greater than current depth
   */
  function mineTo(uint256 _tokenId, uint8 _offset) public {
    // check that the call is made by a offset provider
    require(isSenderInRole(ROLE_OFFSET_PROVIDER));

    // validate token existence
    require(exists(_tokenId));

    // extract tiers structure
    uint64 tiers = tokens[_tokenId].tiers;

    // extract current offset value
    uint8 offset = TierMath.getOffset(tiers);

    // ensure we're getting deeper
    require(_offset > offset);

    // perform mining, update the offset
    tokens[_tokenId].tiers = TierMath.updateOffset(tiers, _offset);

    // update the offset modification date
    tokens[_tokenId].offsetModified = uint32(now);

    // emit an event
    emit OffsetModified(msg.sender, ownerOf(_tokenId), _tokenId, offset, _offset);
  }

  /**
   * @dev Mines the token by the depth delta specified
   * @dev Requires depth delta to be positive value
   * @dev Requires sender to have `ROLE_OFFSET_PROVIDER` permission
   * @param _tokenId ID of the token to mine
   * @param _by depth delta value to mine by, greater than zero
   */
  function mineBy(uint256 _tokenId, uint8 _by) public {
    // check that the call is made by a offset provider
    require(isSenderInRole(ROLE_OFFSET_PROVIDER));

    // validate token existence
    require(exists(_tokenId));

    // extract tiers structure
    uint64 tiers = tokens[_tokenId].tiers;

    // extract current offset value
    uint8 offset = TierMath.getOffset(tiers);

    // ensure we're getting deeper, arithmetic overflow check
    require(_by + offset > offset);

    // perform mining, increase the offset
    tokens[_tokenId].tiers = TierMath.increaseOffset(tiers, _by);

    // update the offset modification date
    tokens[_tokenId].offsetModified = uint32(now);

    // emit an event
    emit OffsetModified(msg.sender, ownerOf(_tokenId), _tokenId, offset, offset + _by);
  }


  /**
   * @dev Gets the state modified date of a token
   * @param _tokenId ID of the token to get state modified date for
   * @return token state modification date as a unix timestamp
   */
  function getStateModified(uint256 _tokenId) public view returns(uint32) {
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
  function getState(uint256 _tokenId) public view returns(uint128) {
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
  function isTransferable(uint256 _tokenId) public view returns(bool) {
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
   * @param _state new state to set for the token
   */
  function setState(uint256 _tokenId, uint128 _state) public {
    // check that the call is made by a state provider
    require(isSenderInRole(ROLE_STATE_PROVIDER));

    // read current state value
    // verifies token existence under the hood
    uint128 state = getState(_tokenId);

    // check that new state is not the same as an old one
    // do not require this for state, allow state modification data update
    // require(_state != state);

    // set the state required
    tokens[_tokenId].state = _state;

    // update the state modification date
    tokens[_tokenId].stateModified = uint32(now);

    // emit an event
    emit StateModified(msg.sender, ownerOf(_tokenId), _tokenId, state, _state);
  }

  /**
   * @dev Gets the creation time of a token
   * @param _tokenId ID of the token to get creation time for
   * @return a token creation time as a unix timestamp
   */
  function getCreationTime(uint256 _tokenId) public view returns(uint32) {
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
  function getOwnershipModified(uint256 _tokenId) public view returns(uint32) {
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
   * @param _transferLock a value to set `transferLock` to
   */
  function setTransferLock(uint128 _transferLock) public {
    // check that the call is made by a transfer lock provider
    require(isSenderInRole(ROLE_TRANSFER_LOCK_PROVIDER));

    // in case if new bitmask is different from what is already set
    if(_transferLock != transferLock) {
      // emit an event first - `transferLock` will be overwritten
      emit TransferLockChanged(msg.sender, transferLock, _transferLock);

      // update the transfer lock
      transferLock = _transferLock;
    }
  }


  /**
   * @dev Creates new token with token ID derived from the country ID
   *      and assigns an ownership `_to` for this token
   * @dev Allows setting initial token's properties
   * @param _to an address to assign created token ownership to
   * @param _countryId ID of the country to mint token in,
   *     high 8 bits of the token ID will be set to that number
   * @param _tiers tiers structure of the token to create, containing
   *      1. Number of tiers this plot contains (8 bits)
   *        - 2 for Antarctica or 5 for the rest of the World
   *      2. Tier structure of the plot (48 bits)
   *         6 elements, 8 bits each:
   *          - Tier 1 offset (start of Tier 1), usually zero
   *          - Tier 2 offset (start of Tier 2 / end of Tier 1)
   *          - Tier 3 offset (start of Tier 3 / end of Tier 2)
   *          - Tier 4 offset (start of Tier 4 / end of Tier 3)
   *          - Tier 5 offset (start of Tier 5 / end of Tier 4)
   *          - End of Tier 5 (block depth)
   *      3. Current mining block index (8 bits)
   *        - must be zero
   * @return generated token ID
   */
  function mint(address _to, uint8 _countryId, uint64 _tiers) public returns(uint24 _tokenId) {
    // check if caller has sufficient permissions to mint a token
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // delegate call to `__mint`
    _tokenId = __mint(_to, _countryId, _tiers);

    // fire Minted event
    emit Minted(msg.sender, _to, _tokenId);

    // fire ERC721 transfer event
    emit Transfer(address(0), _to, _tokenId);
  }


  /**
   * @notice Total number of existing tokens (tracked by this contract)
   * @return A count of valid tokens tracked by this contract,
   *    where each one of them has an assigned and
   *    queryable owner not equal to the zero address
   */
  function totalSupply() public view returns (uint256) {
    // read the length of the `allTokens` collection
    return allTokens.length;
  }

  /**
   * @notice Enumerate valid tokens
   * @dev Throws if `_index` >= `totalSupply()`.
   * @param _index a counter less than `totalSupply()`
   * @return The token ID for the `_index`th token, unsorted
   */
  function tokenByIndex(uint256 _index) public view returns (uint256) {
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
  function tokenOfOwnerByIndex(address _owner, uint256 _index) public view returns (uint256) {
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
  function balanceOf(address _owner) public view returns (uint256) {
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
  function exists(uint256 _tokenId) public view returns (bool) {
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
  function ownerOf(uint256 _tokenId) public view returns (address) {
    // check if this token exists
    require(exists(_tokenId));

    // return owner's address
    return tokens[_tokenId].owner;
  }

  /**
   * @notice A distinct Uniform Resource Identifier (URI) for a given asset.
   * @dev Throws if `_tokenId` is not a valid token ID.
   *      URIs are defined in RFC 3986.
   * @param _tokenId token ID of the token to query
   * @return token URI as UTF-8 string
   */
  function tokenURI(uint256 _tokenId) public view returns (string memory) {
    // validate token existence
    require(exists(_tokenId));

    // token URL consists of base URL part (domain) and token ID
    return StringUtils.concat("http://cryptominerworld.com/plot/", StringUtils.itoa(_tokenId, 10));
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
  function __move(address _from, address _to, uint256 _tokenId) internal {
    // cast token ID to uint24 space
    uint24 tokenId = uint24(_tokenId);

    // overflow check, failure impossible by design of mint()
    assert(tokenId == _tokenId);

    // get the token structure pointer to the storage
    LandPlot storage token = tokens[tokenId];

    // get a reference to the collection where token is now
    uint24[] storage source = collections[_from];

    // get a reference to the collection where token goes to
    uint24[] storage destination = collections[_to];

    // collection `source` cannot be empty, by design of transfer functions
    assert(source.length != 0);

    // index of the token within collection `source`
    uint24 i = uint24(token.index); // we use only low 24 bits of the index

    // we put the last token in the collection `source` to the position released
    // get an ID of the last token in `source`
    uint24 sourceId = source[source.length - 1];

    // update last token index to point to proper place in the collection `source`
    tokens[sourceId].index = i;

    // put it into the position `i` within `source`
    source[i] = sourceId;

    // trim the collection `source` by removing last element
    source.length--;

    // update token index according to position in new collection `destination`
    token.index = uint24(destination.length);

    // update token owner
    token.owner = _to;

    // update token ownership transfer date
    token.ownershipModified = uint32(now);

    // push token into destination collection
    destination.push(tokenId);
  }

  /**
   * @dev Creates new token with token ID derived from the country ID
   *      and assigns an ownership `_to` for this token
   * @dev Unsafe: doesn't check if caller has enough permissions to execute the call,
   *      checks only that the token doesn't exist yet
   * @dev Must be kept private at all times
   * @param _to an address to mint token to (first owner of the token)
   * @param _countryId ID of the country to mint token in,
   *     high 8 bits of the token ID will be set to that number
   * @param _tiers tiers structure of the token
   * @return generated token ID
   */
  function __mint(address _to, uint8 _countryId, uint64 _tiers) private returns(uint24 _tokenId) {
    // validate destination address
    require(_to != address(0));
    require(_to != address(this));

    // increment minted mapping counter
    minted[_countryId]++;

    // verify we didn't overflow
    require(minted[_countryId] != 0);

    // derive token ID from `minted` mapping
    _tokenId = uint24(_countryId) << 16 | minted[_countryId];

    // ensure that token with such ID doesn't exist
    require(!exists(_tokenId));

    // extract number of tiers this plot contains
    uint8 n = TierMath.getNumberOfTiers(_tiers);

    // ensure tiers array contains exactly
    // 2 (Antarctica) or 5 (Rest of the World) elements
    require(n == 2 || n == 5);

    // ensure tier1 offset is zero
    // not required - ensured by the 0xFF00FFFFFFFFFF00 mask (see below)
    // require(TierMath.getTierDepth(_tiers, 0) == 0);

    // validate tiers structure – first n layers
    for(uint8 i = 0; i < n; i++) {
      // (n)th tier offset must be greater than or equal to (n-1)th tier offset
      require(uint8(_tiers >> (6 - i) * 8) <= uint8(_tiers >> (5 - i) * 8));
    }

    // validate tiers structure – sparse 5 - n layers
    for(uint8 j = n; j < 5; j++) {
      // (n)th tier offset must be equal to 2nd tier offset
      require(uint8(_tiers >> (6 - n) * 8) == uint8(_tiers >> (5 - j) * 8));
    }

    // verify initial offset is zero
    // not required - ensured by the 0xFF00FFFFFFFFFF00 mask (see below)
    // require(TierMath.getOffset(_tiers) == 0);

    // create new token in memory
    LandPlot memory token = LandPlot({
      // TODO: consider removing this mask - it's not a plot business what is its initial state
      tiers: 0xFF00FFFFFFFFFF00 & _tiers, // erase tier1 offset and initial offsets
      offsetModified: 0,
      state: 0,
      stateModified: 0,
      creationTime: uint32(now),
      index: uint24(collections[_to].length),
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
