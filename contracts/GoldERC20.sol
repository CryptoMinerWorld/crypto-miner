pragma solidity 0.5.8;

import "./AccessControl.sol";
import "./AddressUtils.sol";
import "./ERC20Receiver.sol";

/**
 * @title Gold ERC20 Token
 *
 * @notice Gold is a transferable fungible entity (ERC20 token)
 *      used to "pay" for in game services like gem upgrades, etc.
 * @notice Gold is a part of Gold/Silver system, which allows to
 *      upgrade gems (level, grade, etc.)
 *
 * @dev Gold is mintable and burnable entity,
 *      meaning it can be created or destroyed by the authorized addresses
 * @dev An address authorized can mint/burn its own tokens (own balance) as well
 *      as tokens owned by another address (additional permission level required)
 *
 * @author Basil Gorin
 */
contract GoldERC20 is AccessControl {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   *      and changes smart contract itself is to be redeployed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant TOKEN_UID = 0xac39d91c110e8dd1c604e5b1e58cec50e813064f49f0df63b1abb865a2aa9c81;

  /**
   * @notice ERC20 symbol of that token (short name)
   */
  string public constant symbol = "GLD";

  /**
   * @notice ERC20 name of the token (long name)
   */
  string public constant name = "GOLD - CryptoMiner World";

  /**
   * @notice ERC20 decimals (number of digits to draw after the dot
   *    in the UI applications (like MetaMask, other wallets and so on)
   */
  uint8 public constant decimals = 3;

  /**
   * @notice Based on the value of decimals above, one token unit
   *      represents native number of tokens which is displayed
   *      in the UI applications as one (1 or 1.0, 1.00, etc.)
   */
  uint256 public constant ONE_UNIT = uint256(10) ** decimals;

  /**
   * @notice A record of all the players token balances
   * @dev This mapping keeps record of all token owners
   */
  mapping(address => uint256) private tokenBalances;

  /**
   * @notice Total amount of tokens tracked by this smart contract
   * @dev Equal to sum of all token balances `tokenBalances`
   */
  uint256 private tokensTotal;

  /**
   * @notice A record of all the allowances to spend tokens on behalf
   * @dev Maps token owner address to an address approved to spend
   *      some tokens on behalf, maps approved address to that amount
   */
  mapping(address => mapping(address => uint256)) private transferAllowances;

  /**
   * @notice Enables ERC20 transfers of the tokens
   *      (transfer by the token owner himself)
   * @dev Feature FEATURE_TRANSFERS must be enabled to
   *      call `transfer()` function
   */
  uint32 public constant FEATURE_TRANSFERS = 0x00000001;

  /**
   * @notice Enables ERC20 transfers on behalf
   *      (transfer by someone else on behalf of token owner)
   * @dev Feature FEATURE_TRANSFERS_ON_BEHALF must be enabled to
   *      call `transferFrom()` function
   * @dev Token owner must call `approve()` first to authorize
   *      the transfer on behalf
   */
  uint32 public constant FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

  /**
   * @notice Token creator is responsible for creating (minting)
   *      tokens to some player address
   * @dev Role ROLE_TOKEN_CREATOR allows minting tokens
   *      (calling `mint` and `mintTo` functions)
   */
  uint32 public constant ROLE_TOKEN_CREATOR = 0x00000001;

  /**
   * @notice Token destroyer is responsible for destroying (burning)
   *      tokens owned by some player address
   * @dev Role ROLE_TOKEN_DESTROYER allows burning tokens
   *      (calling `burn` and `burnFrom` functions)
   */
  uint32 public constant ROLE_TOKEN_DESTROYER = 0x00000002;

  /**
   * @dev Magic value to be returned by ERC20Receiver upon successful reception of token(s)
   * @dev Equal to `bytes4(keccak256("onERC20Received(address,address,uint256,bytes)"))`,
   *      which can be also obtained as `ERC20Receiver(0).onERC20Received.selector`
   */
  bytes4 private constant ERC20_RECEIVED = 0x4fc35859;

  /**
   * @dev Fired in transfer() and transferFrom() functions
   * @param _from an address which performed the transfer
   * @param _to an address tokens were sent to
   * @param _value number of tokens transferred
   */
  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  /**
   * @dev Fired in approve() function
   * @param _owner an address which granted a permission to transfer
   *      tokens on its behalf
   * @param _spender an address which received a permission to transfer
   *      tokens on behalf of the owner `_owner`
   */
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  /**
   * @dev Fired in mint() function
   * @param _by an address which minted some tokens (transaction sender)
   * @param _to an address the tokens were minted to
   * @param _value an amount of tokens minted
   */
  event Minted(address indexed _by, address indexed _to, uint256 _value);

  /**
   * @dev Fired in burn() function
   * @param _by an address which burned some tokens (transaction sender)
   * @param _from an address the tokens were burnt from
   * @param _value an amount of tokens burnt
   */
  event Burnt(address indexed _by, address indexed _from, uint256 _value);

  /**
   * @notice Total number of tokens tracked by this smart contract
   * @dev Equal to sum of all token balances
   * @return total number of tokens
   */
  function totalSupply() public view returns (uint256) {
    // read total tokens value and return
    return tokensTotal;
  }

  /**
   * @notice Gets the balance of particular address
   * @dev Gets the balance of the specified address
   * @param _owner the address to query the the balance for
   * @return an amount of tokens owned by the address specified
   */
  function balanceOf(address _owner) public view returns (uint256) {
    // read the balance from storage and return
    return tokenBalances[_owner];
  }

  /**
   * @dev A function to check an amount of tokens owner approved
   *      to transfer on its behalf by some other address called "spender"
   * @param _owner an address which approves transferring some tokens on its behalf
   * @param _spender an address approved to transfer some tokens on behalf
   * @return an amount of tokens approved address `_spender` can transfer on behalf
   *      of token owner `_owner`
   */
  function allowance(address _owner, address _spender) public view returns (uint256) {
    // read the value from storage and return
    return transferAllowances[_owner][_spender];
  }

  /**
   * @notice Transfers some tokens to an address `_to`
   * @dev Called by token owner (an address which has a
   *      positive token balance tracked by this smart contract)
   * @dev Throws on any error like
   *      * incorrect `_value` (zero) or
   *      * insufficient token balance or
   *      * incorrect `_to` address:
   *          * zero address or
   *          * self address or
   *          * smart contract which doesn't support ERC20
   * @param _to an address to transfer tokens to,
   *      must be either an external address or a smart contract,
   *      compliant with the ERC20 standard
   * @param _value amount of tokens to be transferred, must
   *      be greater than zero
   * @return true on success, throws otherwise
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    // just delegate call to `transferFrom`,
    // `FEATURE_TRANSFERS` is verified inside it
    return transferFrom(msg.sender, _to, _value);
  }

  /**
   * @notice Transfers some tokens on behalf of address `_from' (token owner)
   *      to some other address `_to`
   * @dev Called by token owner on his own or approved address,
   *      an address approved earlier by token owner to
   *      transfer some amount of tokens on its behalf
   * @dev Throws on any error like
   *      * incorrect `_value` (zero) or
   *      * insufficient token balance or
   *      * incorrect `_to` address:
   *          * zero address or
   *          * same as `_from` address (self transfer)
   *          * smart contract which doesn't support ERC20
   * @param _from token owner which approved caller (transaction sender)
   *      to transfer `_value` of tokens on its behalf
   * @param _to an address to transfer tokens to,
   *      must be either an external address or a smart contract,
   *      compliant with the ERC20 standard
   * @param _value amount of tokens to be transferred, must
   *      be greater than zero
   * @return true on success, throws otherwise
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    // just delegate call to `safeTransferFrom`, passing empty `_data`,
    // `FEATURE_TRANSFERS` is verified inside it
    safeTransferFrom(_from, _to, _value, "");

    // `safeTransferFrom` throws of any error, so
    // if we're here - it means operation successful,
    // just return true
    return true;
  }

  /**
   * @notice Transfers some tokens on behalf of address `_from' (token owner)
   *      to some other address `_to`
   * @dev Inspired by ERC721 safeTransferFrom, this function allows to
   *      send arbitrary data to the receiver on successful token transfer
   * @dev Called by token owner on his own or approved address,
   *      an address approved earlier by token owner to
   *      transfer some amount of tokens on its behalf
   * @dev Throws on any error like
   *      * incorrect `_value` (zero) or
   *      * insufficient token balance or
   *      * incorrect `_to` address:
   *          * zero address or
   *          * same as `_from` address (self transfer)
   *          * smart contract which doesn't support ERC20Receiver interface
   * @param _from token owner which approved caller (transaction sender)
   *      to transfer `_value` of tokens on its behalf
   * @param _to an address to transfer tokens to,
   *      must be either an external address or a smart contract,
   *      compliant with the ERC20 standard
   * @param _value amount of tokens to be transferred, must
   *      be greater than zero
   * @param _data [optional] additional data with no specified format,
   *      sent in onERC20Received call to `_to` in case if its a smart contract
   * @return true on success, throws otherwise
   */
  function safeTransferFrom(address _from, address _to, uint256 _value, bytes memory _data) public {
    // first delegate call to `unsafeTransferFrom`
    // to perform the unsafe token(s) transfer
    unsafeTransferFrom(_from, _to, _value);

    // after the successful transfer – check if receiver supports
    // ERC20Receiver and execute a callback handler `onERC20Received`,
    // reverting whole transaction on any error:
    // check if receiver `_to` supports ERC20Receiver interface
    if (AddressUtils.isContract(_to)) {
      // if `_to` is a contract – execute onERC20Received
      bytes4 response = ERC20Receiver(_to).onERC20Received(msg.sender, _from, _value, _data);

      // expected response is ERC20_RECEIVED
      require(response == ERC20_RECEIVED);
    }
  }

  /**
   * @notice Transfers some tokens on behalf of address `_from' (token owner)
   *      to some other address `_to`
   * @dev In contrast to `safeTransferFrom` doesn't check recipient
   *      smart contract to support ERC20 tokens (ERC20Receiver)
   * @dev Designed to be used by developers when the receiver is known
   *      to support ERC20 tokens but doesn't implement ERC20Receiver interface
   * @dev Called by token owner on his own or approved address,
   *      an address approved earlier by token owner to
   *      transfer some amount of tokens on its behalf
   * @dev Throws on any error like
   *      * incorrect `_value` (zero) or
   *      * insufficient token balance or
   *      * incorrect `_to` address:
   *          * zero address or
   *          * same as `_from` address (self transfer)
   * @param _from token owner which approved caller (transaction sender)
   *      to transfer `_value` of tokens on its behalf
   * @param _to an address to transfer tokens to,
   *      must be either an external address or a smart contract,
   *      compliant with the ERC20 standard
   * @param _value amount of tokens to be transferred, must
   *      be greater than zero
   * @return true on success, throws otherwise
   */
  function unsafeTransferFrom(address _from, address _to, uint256 _value) public {
    // if `_from` is equal to sender, require transfers feature to be enabled
    // otherwise require transfers on behalf feature to be enabled
    require(_from == msg.sender && isFeatureEnabled(FEATURE_TRANSFERS)
         || _from != msg.sender && isFeatureEnabled(FEATURE_TRANSFERS_ON_BEHALF));

    // non-zero to address check
    require(_to != address(0));

    // sender and recipient cannot be the same
    require(_from != _to);

    // zero value transfer check
    require(_value != 0);

    // by design of mint() -
    // - no need to make arithmetic overflow check on the _value

    // in case of transfer on behalf
    if(_from != msg.sender) {
      // verify sender has an allowance to transfer amount of tokens requested
      require(transferAllowances[_from][msg.sender] >= _value);

      // decrease the amount of tokens allowed to transfer
      transferAllowances[_from][msg.sender] -= _value;
    }

    // verify sender has enough tokens to transfer on behalf
    require(tokenBalances[_from] >= _value);

    // perform the transfer:
    // decrease token owner (sender) balance
    tokenBalances[_from] -= _value;

    // increase `_to` address (receiver) balance
    tokenBalances[_to] += _value;

    // emit an ERC20 transfer event
    emit Transfer(_from, _to, _value);
  }

  /**
   * @notice Approves address called "spender" to transfer some amount
   *      of tokens on behalf of the owner
   * @dev Caller must not necessarily own any tokens to grant the permission
   * @param _spender an address approved by the caller (token owner)
   *      to spend some tokens on its behalf
   * @param _value an amount of tokens spender `_spender` is allowed to
   *      transfer on behalf of the token owner
   * @return true on success, throws otherwise
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    // perform an operation: write value requested into the storage
    transferAllowances[msg.sender][_spender] = _value;

    // emit an event
    emit Approval(msg.sender, _spender, _value);

    // operation successful, return true
    return true;
  }

  /**
   * @dev Mints (creates) some tokens to address specified
   * @dev The value passed is treated as number of units (see `ONE_UNIT`)
   *      to achieve natural impression on token quantity
   * @dev Requires sender to have `ROLE_TOKEN_CREATOR` permission
   * @param _to an address to mint tokens to
   * @param _value an amount of tokens to mint (create)
   */
  function mint(address _to, uint256 _value) public {
    // calculate native value, taking into account `decimals`
    uint256 value = _value * ONE_UNIT;

    // arithmetic overflow and non-zero value check
    require(value > _value);

    // delegate call to native `mintNative`
    mintNative(_to, value);
  }

  /**
   * @dev Mints (creates) some tokens to address specified
   * @dev The value specified is treated as is without taking
   *      into account what `decimals` value is
   * @dev Requires sender to have `ROLE_TOKEN_CREATOR` permission
   * @param _to an address to mint tokens to
   * @param _value an amount of tokens to mint (create)
   */
  function mintNative(address _to, uint256 _value) public {
    // check if caller has sufficient permissions to mint tokens
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

    // non-zero recipient address check
    require(_to != address(0));

    // non-zero _value and arithmetic overflow check on the total supply
    // this check automatically secures arithmetic overflow on the individual balance
    require(tokensTotal + _value > tokensTotal);

    // increase `_to` address balance
    tokenBalances[_to] += _value;

    // increase total amount of tokens value
    tokensTotal += _value;

    // fire ERC20 compliant transfer event
    emit Transfer(address(0), _to, _value);

    // fire a mint event
    emit Minted(msg.sender, _to, _value);
  }

  /**
   * @dev Burns (destroys) some tokens from the address specified
   * @dev The value passed is treated as number of units (see `ONE_UNIT`)
   *      to achieve natural impression on token quantity
   * @dev Requires sender to have `ROLE_TOKEN_DESTROYER` permission
   * @param _from an address to burn some tokens from
   * @param _value an amount of tokens to burn (destroy)
   */
  function burn(address _from, uint256 _value) public {
    // calculate native value, taking into account `decimals`
    uint256 value = _value * ONE_UNIT;

    // arithmetic overflow and non-zero value check
    require(value > _value);

    // delegate call to native `burnNative`
    burnNative(_from, value);
  }

  /**
   * @dev Burns (destroys) some tokens from the address specified
   * @dev The value specified is treated as is without taking
   *      into account what `decimals` value is
   * @dev Requires sender to have `ROLE_TOKEN_DESTROYER` permission
   * @param _from an address to burn some tokens from
   * @param _value an amount of tokens to burn (destroy)
   */
  function burnNative(address _from, uint256 _value) public {
    // check if caller has sufficient permissions to burn tokens
    require(isSenderInRole(ROLE_TOKEN_DESTROYER));

    // non-zero burn value check
    require(_value != 0);

    // verify `_from` address has enough tokens to destroy
    // (basically this is a arithmetic overflow check)
    require(tokenBalances[_from] >= _value);

    // decrease `_from` address balance
    tokenBalances[_from] -= _value;

    // decrease total amount of tokens value
    tokensTotal -= _value;

    // fire ERC20 compliant transfer event
    emit Transfer(_from, address(0), _value);

    // fire a burn event
    emit Burnt(msg.sender, _from, _value);
  }

}

