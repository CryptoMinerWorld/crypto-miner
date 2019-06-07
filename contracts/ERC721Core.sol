pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./AddressUtils.sol";
import "./ERC165.sol";
import "./ERC721Receiver.sol";
import "./ERC721Interfaces.sol";

contract ERC721Core is AccessMultiSig, ERC165, ERC721Interfaces {

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
   * @notice Token destroyer is responsible for destroying tokens
   * @dev Allows burning tokens
   */
  uint32 public constant ROLE_TOKEN_DESTROYER = 0x00000002;

  /**
   * @dev Extension writer is responsible for writing into ext256,
   *      permission allows to call `write`
   */
  uint32 public constant ROLE_EXT_WRITER = 0x00000004;

  /**
   * @dev Magic value to be returned upon successful reception of ERC721 token (NFT)
   * @dev Equal to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`,
   *      which can be also obtained as `ERC721Receiver(0).onERC721Received.selector`
   */
  bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;

  /**
   * @dev An extension data structure, maps 256 bits of data to a token ID
   */
  mapping(uint256 => mapping(uint256 => uint256)) private ext256;

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
  event Minted(address indexed _by, address indexed _to, uint256 indexed _tokenId);


  /**
   * @dev Verifies if token is transferable (can change ownership)
   * @param _tokenId ID of the token to check transferable state for
   * @return true if token is transferable, false otherwise
   */
  function isTransferable(uint256 _tokenId) public view returns(bool) {
    // validate token existence
    require(exists(_tokenId));

    // generic implementation returns true if token exists
    return true;
  }

  /**
   * @notice Checks if specified token exists
   * @dev Returns whether the specified token ID exists
   * @param _tokenId ID of the token to query the existence for
   * @return whether the token exists (true - exists)
   */
  function exists(uint256 _tokenId) public view returns (bool);

  /**
   * @notice Finds an owner address for a token specified
   * @dev Gets the owner of the specified token from the `countries` mapping
   * @dev Throws if a token with the ID specified doesn't exist
   * @param _tokenId ID of the token to query the owner for
   * @return owner address currently marked as the owner of the given token
   */
  function ownerOf(uint256 _tokenId) public view returns (address);

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
  function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes memory _data) public {
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
  function getApproved(uint256 _tokenId) public view returns (address) {
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
  function isApprovedForAll(address _owner, address _operator) public view returns (bool) {
    // is there a positive amount of approvals left
    return approvedOperators[_owner][_operator];
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
  function __move(address _from, address _to, uint256 _tokenId) internal;


  /**
   * @dev Writes token data
   * @param _tokenId token ID to write data into
   * @param value a value to write;
   *      to write value as is, set offset and length to zero
   * @param offset position in memory to write to (bits)
   * @param length how many bits to write
   */
  function write(uint256 _tokenId, uint256 value, uint8 offset, uint8 length) public {
    // perform write operation on page zero
    // delegate call to `writePage`
    writePage(_tokenId, 0, value, offset, length);
  }

  /**
   * @dev Reads token data
   * @dev To read whole 256 bits, set offset and length to zero
   * @param _tokenId token ID to read data from
   * @param offset position in memory to read from (bits)
   * @param length how many bits to read
   */
  function read(uint256 _tokenId, uint8 offset, uint8 length) public view returns(uint256 value) {
    // perform read operation on page zero
    // delegate call to `readPage`
    return readPage(_tokenId, 0, offset, length);
  }

  /**
   * @dev Writes token data, allows to access up to 2^256 pages of 256-bit memory slots
   * @param _tokenId token ID to write data into
   * @param page index of the page to write to
   * @param value a value to write;
   *      to write value as is, set offset and length to zero
   * @param offset position in memory to write to (bits)
   * @param length how many bits to write
   */
  function writePage(uint256 _tokenId, uint256 page, uint256 value, uint8 offset, uint8 length) public {
    // ensure sender has permission to write to `ext256`
    require(isSenderInRole(ROLE_EXT_WRITER));

    // create value mask
    // if length is zero its same as 256, which is full mask
    uint256 valueMask = length == 0? uint256(-1): ((uint256(1) << length) - 1) << offset; // uint256(-1) overflows to 0xFFFF...

    // create erase mask
    uint256 eraseMask = uint256(-1) ^ valueMask; // uint256(-1) overflows to 0xFFFF...

    // shift and mask value as needed
    value = value << offset & valueMask;

    // erase portion of the storage required
    ext256[_tokenId][page] &= eraseMask;

    // write data into erased portion
    ext256[_tokenId][page] |= value;
  }

  /**
   * @dev Reads token data, allows to access up to 2^256 pages of 256-bit memory slots
   * @dev To read whole 256 bits, set offset and length to zero
   * @param _tokenId token ID to read data from
   * @param page index of the page to read from
   * @param offset position in memory to read from (bits)
   * @param length how many bits to read
   */
  function readPage(uint256 _tokenId, uint256 page, uint8 offset, uint8 length) public view returns(uint256 value) {
    // read from required position required length of bits and return
    return length == 0? ext256[_tokenId][page] >> offset: ext256[_tokenId][page] >> offset & ((uint256(1) << length) - 1);
  }

}
