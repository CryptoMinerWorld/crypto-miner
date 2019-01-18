pragma solidity 0.4.23;

import "./AccessControlLight.sol";

/**
 * @title Gold Smart Contract
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
contract GoldERC20 is AccessControlLight {
  /**
   * @dev Smart contract version
   * @dev Should be incremented manually in this source code
   *      each time smart contact source code is changed
   */
  uint32 public constant TOKEN_VERSION = 0x1;

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
  uint8 public constant decimals = 0;

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

  event Minted(address indexed _by, address indexed _to, uint256 _value);

  event Burnt(address indexed _by, address indexed _from, uint256 _value);

  /**
   * @notice Total number of tokens tracked by this smart contract
   * @dev Equal to sum of all token balances
   * @return total number of tokens
   */
  function totalSupply() public constant returns (uint256) {
    // read total tokens value and return
    return tokensTotal;
  }

  /**
   * @notice Gets the balance of particular address
   * @dev Gets the balance of the specified address
   * @param _owner the address to query the the balance for
   * @return an amount of tokens owned by the address specified
   */
  function balanceOf(address _owner) public constant returns (uint256) {
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
  function allowance(address _owner, address _spender) public constant returns (uint256) {
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
    // TODO: implement safe transfer logic

    // operation successful, return true
    return true;
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
    // TODO: implement safe transfer on behalf logic

    // operation successful, return true
    return true;
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
    // TODO: implement transfer approve logic

    // operation successful, return true
    return true;
  }

  /**
   * @dev Mints (creates) some tokens to address specified
   * @dev Requires sender to have `ROLE_TOKEN_CREATOR` permission
   * @param _to an address to mint tokens to
   * @param _value an amount of tokens to mint (create)
   */
  function mint(address _to, uint256 _value) public {
    // check if caller has sufficient permissions to mint tokens
    require(isSenderInRole(ROLE_TOKEN_CREATOR));

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
   * @dev Requires sender to have `ROLE_TOKEN_DESTROYER` permission
   * @param _from an address to burn some tokens from
   * @param _value an amount of tokens to burn (destroy)
   */
  function burn(address _from, uint256 _value) public {
    // check if caller has sufficient permissions to burn tokens
    require(isSenderInRole(ROLE_TOKEN_DESTROYER));

    // verify `_from` address has enough tokens to destroy
    // (basically this is a arithmetic overflow check)
    require(tokenBalances[_from] >= _value);

    // arithmetic overflow check for tokens total
    // this situation is impossible by design (previous check)
    assert(tokensTotal >= _value);

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

