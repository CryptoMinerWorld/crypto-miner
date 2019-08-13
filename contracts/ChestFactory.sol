pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./FoundersKeyERC20.sol";
import "./ChestKeyERC20.sol";
import "./Random.sol";

/**
 * @dev Subset of ERC-20 interface used by ChestFactory
 */
interface ERC20 {
  /**
   * @dev ERC20 safeTransferFrom – "safe transfer on behalf"
   * @param _from The current owner of the token.
   * @param _to The new owner.
   * @param _value Number of tokens to transfer.
   * @param _data [optional] additional data with no specified format.
   */
  function safeTransferFrom(address _from, address _to, uint256 _value, bytes calldata _data) external;
}


/**
 * @title Treasure Chest Factory
 *
 * @notice Treasure Chest Factory is responsible for creating and opening treasure chests;
 *      it allows anyone to create a treasure chest by supplying something valuable into it
 *      (for example Ether) to be opened later by someone who has a right key
 *
 * @notice Current implementation is limited to support only Ether as a chest contents.
 *
 * @dev Treasure chest has 5 states
 *      - created, state of the newly created treasure chest; "created" chest
 *          goes to the "ready" state automatically after t0 timer expires
 *      - ready (active), state when treasure chest accepts the chest keys and records
 *          their owners to use that information later to determine the winner
 *      - toss, state when treasure chest doesn't accept the chest keys anymore and waits
 *          for the toss to happen and the winner picked from the list of addresses
 *          who submitted their chest keys in previous "active" round (state)
 *      - unlocked
 *      - expired
 *
 * @dev A treasure chest is defined by the set of immutable fields:
 *      - chest ID, unique ID of the chest, is set automatically when chest is created
 *      - founders flag, a boolean indicating if chest can be opened
 *            with the founder's key only
 *      - value, an amount of Ether it contains (wei)
 *      - key type, an address of ERC20 token
 *      - toss time, toss start date, a unix timestamp defining the
 *            time when a chest stops accepting the keys
 *            and starts accepting a toss request to determine the winner
 *
 * @dev A treasure chest state is defined with a set of mutable fields:
 *      - empty flag,
 *
 * @author Basil Gorin
 */
contract ChestFactory is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant FACTORY_UID = 0xbde25f6e305dc7db3abcb8fb22d8c3c2495f858a49b61d26fda4e3c8a065c476;

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
   * @dev A structure representing a treasure chest
   * @dev Occupies 4 storage slots (256 bits of data, array and mapping)
   */
  struct TreasureChest {
    /**
     * @dev Chest value, an amount of wei the chest holds
     * @dev Immutable; part of the chest definition
     */
    uint96 value;

    /**
     * @dev Flag indicating if a treasure chest is a founder's chest,
     *      meaning can be opened by the founder's key only
     * @dev Immutable; part of the chest definition
     */
    bool foundersFlag;

    /**
     * @dev A flag indicating that the winner already withdrew
     *      the value this treasure chest had hold
     * @dev Mutable, originally false, can change to true after tossing starts,
     *      cannot change back to false then;
     *      part of the chest state
     */
    bool emptyFlag;

    /**
     * @dev Toss start time, a unix timestamp
     * @dev Doesn't exceed the t0 more than by 8 days
     * @dev Immutable; part of the chest definition
     */
    uint32 tossTime;

    /**
     * @dev Toss winner – address which registered the key
     *      which opened eventually the treasure chest
     * @dev Mutable, originally zero, can change to winner address after tossing starts,
     *      cannot change after that;
     *      part of the chest state
     */
    address winner;

    /**
     * @dev Auxiliary array stores all the participants, is used to determine
     *      a winner - an address which opened a chest with its key
     * @dev Mutable, originally empty, can be appended only, cannot be shrink or change;
     *      part of the chest state
     */
    address[] participants;

    /**
     * @dev Auxiliary mappings used to keep track of participants' balances
     *      of the keys, is used to send the keys back to participants
     * @dev Mutable (both foundersKeys and chestKeys), originally any balance is zero,
     *      can only grow before tossing starts, can be zeroed again after tossing starts
     */
    mapping(address => uint256) foundersKeys;
    mapping(address => uint256) chestKeys;
  }

  /**
   * @dev An ERC20 token address used as a Founder's Key
   * @dev Founders' keys can open any chests (founders flag ignored)
   */
  address public foundersKey;

  /**
   * @dev An ERC20 token address used as a Chest Key
   * @dev Chest keys can open only regular chests (founders flag unset)
   */
  address public chestKey;


  /**
   * @dev Append only array of the chests registered via the factory
   */
  TreasureChest[] public chests;


  /**
   * @notice Chest manager is responsible for creating treasure chests
   * @dev Allows to create treasure chests with createChest() and createWith() functions
   */
  uint32 public constant ROLE_CHEST_CREATOR = 0x00000001;

  /**
   * @notice Key manager can withdraw the keys from the chest on player's behalf
   * @dev Allows calling withdrawKeys() on behalf of other players
   */
  uint32 public constant ROLE_KEY_MANAGER = 0x00000002;

  /**
   * @dev Fired in createChest() and createWith()
   */
  event ChestCreated(
    address indexed _by,
    uint256 indexed chestId,
    bool foundersFlag,
    uint96 value,
    uint32 tossTime
  );

  /**
   * @dev Fired in onERC20Received() - when the key is received by the chest
   */
  event KeyRegistered(
    address _by,
    address indexed _from,
    uint256 indexed chestId,
    address keyAddress,
    uint256 amount
  );

  /**
   * @dev Fired in withdrawKeys()
   */
  event KeyReleased(
    address _by,
    address indexed _to,
    uint256 indexed chestId,
    address keyAddress,
    uint256 amount
  );

  /**
   * @dev Fired in toss()
   */
  event TossComplete(
    address _by,
    uint256 indexed chestId,
    address indexed winner,
    uint96 value
  );

  /**
   * @dev Fired in withdrawTreasure
   */
  event TreasureWithdrawn(
    address _by,
    address indexed _to,
    uint256 indexed chestId,
    uint96 value
  );

  /**
   * @dev Creates a treasure chest factory binding it to Founders Chest Key
   *      and Chest Key ERC20 instances specified
   * @param _foundersKey address of the deployed Founders Chest Key ERC20 instance
   * @param _chestKey address of the deployed Chest Key ERC20 instance
   */
  constructor(address _foundersKey, address _chestKey) public {
    // verify inputs are not zeros
    require(_foundersKey != address(0));
    require(_chestKey != address(0));

    // assign the keys
    foundersKey = _foundersKey;
    chestKey = _chestKey;

    // verify correct versions of the keys
    require(FoundersKeyERC20(foundersKey).TOKEN_UID() == FOUNDERS_KEY_UID_REQUIRED);
    require(ChestKeyERC20(chestKey).TOKEN_UID() == CHEST_KEY_UID_REQUIRED);
  }

  /**
   * @notice Creates a treasure chest with default parameters
   * @dev Created chest accepts the keys during 7 days and starts immediately
   * @dev Throws on zero _key address but doesn't verify if it represents
   *      valid ERC20 instance – this must be ensured by the caller!
   * @param _foundersFlag founder's chest flag indicating if the chest can
   *      be opened by the founder's chest type if the key only
   * @return id of the created treasure chest
   */
  function createChest(bool _foundersFlag) public payable returns(uint256 chestId) {
    // delegate call to `createWith` using default parameters
    return createWith(_foundersFlag, now32() + 7 days);
  }

  /**
   * @notice Creates a treasure chest with custom parameters, activates immediately
   * @dev Created chest stops accepting the keys on the date specified
   * @dev Throws on zero _key address but doesn't verify if it represents
   *      valid ERC20 instance – this must be ensured by the caller!
   * @param _foundersFlag founder's chest flag indicating if the chest can
   *      be opened by the founder's chest type if the key only
   * @param _tossTime toss start time
   * @return id of the created treasure chest
   */
  function createWith(bool _foundersFlag, uint32 _tossTime) public payable returns(uint256 chestId) {
    // check if caller has a permission to crete a chest
    require(isSenderInRole(ROLE_CHEST_CREATOR));

    // verify input parameters
    // this check (1) is required to protect from int overflow in the next 2 checks
    require(_tossTime > now32());
    // if `_tossTime + 1 hours` overflows and gte condition passes
    require(_tossTime >= now32() + 1 hours);
    // then `_tossTime + 8 days` overflows as well but lt condition fails because of (1)
    require(_tossTime < now32() + 8 days);

    // create the chest structure in memory
    TreasureChest memory chest = TreasureChest({
      foundersFlag: _foundersFlag,
      value: uint96(msg.value),
      tossTime: _tossTime,
      winner: address(0),
      emptyFlag: false,
      participants: new address[](0)
    });

    // ensure created chest is not empty
    require(chest.value > 0);

    // verify we didn't overflow the value
    require(chest.value == msg.value);

    // push newly created chest into the chest array
    chests.push(chest);

    // emit an event
    emit ChestCreated(msg.sender, chests.length, chest.foundersFlag, chest.value, _tossTime);

    // return chest index in 1-based form
    return chests.length;
  }

  /**
   * @notice Check if specified chest is founders chest (can be opened only with founder's key)
   * @param chestId ID of the chest to query
   */
  function isFounders(uint256 chestId) public view returns(bool) {
    // verify the input
    require(chestId != 0);

    // read the flag and return
    return chests[chestId - 1].foundersFlag;
  }

  /**
   * @notice Check if specified chest is empty (already withdrawn from)
   * @param chestId ID of the chest to query
   */
  function isEmpty(uint256 chestId) public view returns(bool) {
    // ensure toss period has already started
    require(getTossIn(chestId) == 0);

    // read the flag and return
    return chests[chestId - 1].emptyFlag;
  }

  /**
   * @notice Gets the ETH value of the chest specified in wei
   * @param chestId ID of the chest to query
   */
  function getValue(uint256 chestId) public view returns(uint96) {
    // verify the input
    require(chestId != 0);

    // read chest value and return
    return chests[chestId - 1].value;
  }

  /**
   * @notice Gets the tossing time, the time when the chest stops accepting the keys
   * @param chestId ID of the chest to query
   */
  function getTossTime(uint256 chestId) public view returns(uint32) {
    // verify the input
    require(chestId != 0);

    // read toss time value and return
    return chests[chestId - 1].tossTime;
  }

  /**
   * @notice Gets number of seconds left till the tossing begins (chest stops accepting keys)
   * @param chestId ID of the chest to query
   */
  function getTossIn(uint256 chestId) public view returns(uint32) {
    // get toss time
    uint32 tossTime = getTossTime(chestId);

    // return time left to toss or zero if toss is already started/finished
    return now32() < tossTime? tossTime - now32(): 0;
  }

  /**
   * @notice Gets the address of the key owner who opened the given chest
   * @param chestId ID of the chest to query
   */
  function getWinner(uint256 chestId) public view returns(address) {
    // ensure toss period has already started
    require(getTossIn(chestId) == 0);

    // read winner and return
    return chests[chestId - 1].winner;
  }

  /**
   * @notice Gets the participants who submitted their keys to open the chest
   * @param chestId ID of the chest to query
   */
  function getParticipants(uint256 chestId) public view returns(address[] memory) {
    // verify the input
    require(chestId != 0);

    // read corresponding chest participants array and return
    return chests[chestId - 1].participants;
  }

  /**
   * @notice Gets number of keys submitted by the participant to open the chest
   * @param chestId ID of the chest to query
   * @param participant address to query
   */
  function getKeyBalances(uint256 chestId, address participant) public view returns(uint256 foundersKeys, uint256 chestKeys) {
    // verify the inputs
    require(chestId != 0 && participant != address(0));

    // read number of keys balance for corresponding participant and return
    return (chests[chestId - 1].foundersKeys[participant], chests[chestId - 1].chestKeys[participant]);
  }

  /**
   * @notice Gets amount of wei a participant can withdraw from the chest
   * @dev This will be non-zero only for winning participant
   * @param chestId ID of the chest to query
   * @param participant address to query
   */
  function getEthBalance(uint256 chestId, address participant) public view returns(uint96) {
    // verify the inputs
    require(chestId != 0 && participant != address(0));

    // load chest into memory
    TreasureChest memory chest = chests[chestId - 1];

    // based on the empty flag and winner set state, return either chest value or zero
    return chest.winner == participant && !chest.emptyFlag? chest.value: 0;
  }


  /**
   * @dev Auxiliary function to register keys to open a treasure chest
   * @dev Unsafe. Internal use only!
   */
  function __registerKeys(address _by, address _from, address _key, uint256 _value, uint256 chestId) private {
    // verify the input
    require(_by != address(0) && _from != address(0) && _key != address(0) && _value != 0 && chestId != 0);

    // get the link to the chest in storage
    TreasureChest storage chest = chests[chestId - 1];

    // verify chest is valid and is in valid state
    require(chest.value > 0 && getTossIn(chestId) != 0);

    // verify the key is valid to open the chest
    require(_key == foundersKey || _key == chestKey && !chest.foundersFlag);

    // update chest keys counters based on key type
    if(_key == foundersKey) {
      // founders' keys
      chest.foundersKeys[_from] += _value;
    }
    else {
      // regular chest keys
      chest.chestKeys[_from] += _value;
    }

    // arithmetic overflow check for updating keys counter is not required:
    // 2^256 160-bit addresses needs to be added to the participants array
    // to overflow which is 5 * 2^258 bytes (about 5 * 10^77 bytes)
    // add a participant several times in order to get fair toss
    for(uint256 i = 0; i < _value; i++) {
      // add a participant
      chest.participants.push(_from);
    }

    // emit an event
    emit KeyRegistered(_by, _from, chestId, _key, _value);
  }

  /**
   * @notice Determines the key which opened the chest
   * @notice This function is public and opened to be called by anyone -
   *      this ensures fairness of the tossing process and its inevitability
   * @dev Tosses the chest and determines the winner (key owner)
   * @dev Throws if chest with the specified ID doesn't exist
   * @dev Throws if chest is already tossed (can be called only once per chest)
   * @dev Throws if no participants registered their keys
   * @dev This implementation is very basic and is not cryptographically secure,
   *      the tossing process can be influenced by miners
   * @param chestId chest ID to toss
   */
  function toss(uint256 chestId) public {
    // ensure toss period is in action
    require(getTossIn(chestId) == 0);

    // get the link to the chest in storage
    TreasureChest storage chest = chests[chestId - 1];

    // ensure the box exists and the winner is not determined
    require(chest.value != 0 && chest.winner == address(0));

    // ensure there is at least one participant
    require(chest.participants.length != 0);

    // determine the winner
    chest.winner = chest.participants[Random.uniform(Random.generate256(chestId), 64, chest.participants.length)];

    // emit an event
    emit TossComplete(msg.sender, chestId, chest.winner, chest.value);
  }

  /**
   * @notice A function used by winner to withdraw funds from the chest
   * @param chestId ID of the chest to withdraw from
   */
  function withdrawTreasure(uint256 chestId) public {
    // ensure toss period is in action
    require(getTossIn(chestId) == 0);

    // get the link to the chest in storage
    TreasureChest storage chest = chests[chestId - 1];

    // ensure request is made by treasure owner or by chest creator
    require(msg.sender == chest.winner || isSenderInRole(ROLE_CHEST_CREATOR));

    // verify chest existence, chest empty flag
    // in case if no participants have registered we allow ROLE_CHEST_CREATOR to withdraw
    require(chest.value != 0 && !chest.emptyFlag && (chest.winner != address(0)
        || isSenderInRole(ROLE_CHEST_CREATOR) && chest.participants.length == 0));

    // update empty flag
    chest.emptyFlag = true;

    // determine an address to send ETH to
    address payable sendTo = chest.winner != address(0)? address(uint160(chest.winner)): msg.sender;

    // send ETH to the address determined
    sendTo.transfer(chest.value);

    // emit an event
    emit TreasureWithdrawn(msg.sender, sendTo, chestId, chest.value);
  }

  /**
   * @notice A function used by participants to get their keys back from the chest
   * @param chestId ID of the chest to withdraw keys from
   */
  function withdrawKeys(uint256 chestId, address participant) public {
    // ensure toss period is in action
    require(getTossIn(chestId) == 0);

    // ensure function is called either by key owner or key manager
    require(msg.sender == participant || isSenderInRole(ROLE_KEY_MANAGER));

    // get the link to the chest in storage
    TreasureChest storage chest = chests[chestId - 1];

    // read chest keys (founders' and regular) balances for the address,
    // if chest doesn't exist both balances are zero
    uint256 foundersKeys = chest.foundersKeys[participant];
    uint256 chestKeys = chest.chestKeys[participant];

    // verify chest existence and key balances for the sender
    require(foundersKeys != 0 || chestKeys != 0);

    // update the chest keys balances
    chest.foundersKeys[participant] = 0;
    chest.chestKeys[participant] = 0;

    // if participant has any founders' keys on the balance
    if(foundersKeys != 0) {
      // send those back to participant
      ERC20(foundersKey).safeTransferFrom(address(this), participant, foundersKeys, "");

      // emit an event
      emit KeyReleased(msg.sender, participant, chestId, foundersKey, foundersKeys);
    }

    // if participant has any regular keys on the balance
    if(chestKeys != 0) {
      // send those back to participant
      ERC20(chestKey).safeTransferFrom(address(this), participant, chestKeys, "");

      // emit an event
      emit KeyReleased(msg.sender, participant, chestId, chestKey, chestKeys);
    }
  }

  /**
   * @notice Handle the receipt of a ERC20 token(s)
   * @dev The ERC20 smart contract calls this function on the recipient
   *      after a successful transfer (`safeTransferFrom`).
   *      This function MAY throw to revert and reject the transfer.
   *      Return of other than the magic value MUST result in the transaction being reverted.
   * @notice The contract address is always the message sender.
   *      A wallet/broker/auction application MUST implement the wallet interface
   *      if it will accept safe transfers.
   * @param _operator The address which called `safeTransferFrom` function
   * @param _from The address which previously owned the token
   * @param _value amount of tokens which is being transferred
   * @param _data additional data with no specified format
   * @return `bytes4(keccak256("onERC20Received(address,address,uint256,bytes)"))` unless throwing
   */
  function onERC20Received(address _operator, address _from, uint256 _value, bytes calldata _data) external returns(bytes4) {
    // check the data array is exactly 32 bytes (256 bits long)
    require(_data.length == 0x20);

    // define an integer variable to store the last bytes parameter `_data` value
    uint256 __data;

    // loading _data contents is possible to do only using inline assembly
    assembly {
      // calldata in our case consists of 196 bytes:
      // first 4 bytes represent Method ID - function selector,
      // followed by three elementary typed inputs which occupy exactly 1 slot (32 bytes) each:
      //    _operator address (only 20 bytes are really used, first 12 bytes are zeroes)
      //    _from address (only 20 bytes are really used, first 12 bytes are zeroes)
      //    _tokenId (only 4 bytes are really used, first 28 bytes are zeroes)
      // next slots (starting at offset 0x64) contains _data (dynamic bytes array):
      //     offset, 32 bytes
      //     length, 32 bytes
      //     data, 32 bytes
      // therefore we are interested in the last 32 bytes of the calldata (offset 0x4 + 0x80 + 0x20 = 0xA4),
      // containing t0 (4 bytes) + t1 (4 bytes) + p0 (12 bytes) + p1 (12 bytes)

      // read the _data offset, increment it by method ID (0x4) and first data slot size (0x20) containing data length
      let offset := add(0x24, calldataload(0x64)) // 0x64 = 0x4 + 3 * 0x20 (3 function primitive inputs)

      // the real data in `_data` starts at offset now (0xA4)
      __data := calldataload(offset)
    }

    // unpack all the required variables from data
    uint256 __chestId = __data;

    // delegate call to `__registerKeys`
    __registerKeys(_operator, _from, msg.sender, _value, __chestId);

    // return 0x4fc35859 = bytes4(keccak256("onERC20Received(address,address,uint256,bytes)")
    return 0x4fc35859;
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
