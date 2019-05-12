pragma solidity 0.4.23;

import "./AccessControlLight.sol";

/**
 * @title Gem ERC721 Token Extension
 *
 * @dev Extends ERC721 Token by providing additional storage,
 *      token ID sequence counter and other features
 *
 * @author Basil Gorin
 */
contract GemExtension is AccessControlLight {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant EXTENSION_UID = 0x079e4e892a230815b1574cc742f7aaaee5444f909654b7e5acad916431393971;

  /**
   * @dev Next ID Inc is responsible for incrementing `nextId`,
   *      permission allows to call `incrementId`
   */
  uint32 public constant ROLE_NEXT_ID_INC = 0x00000001;

  /**
   * @dev Extension writer is responsible for writing into ext256,
   *      permission allows to call `write`
   */
  uint32 public constant ROLE_EXT_WRITER = 0x00000002;

  /**
   * @dev Next token (gem) ID
   */
  uint32 public nextId = 0x12500;

  /**
   * @dev An extension data structure, maps 256 bits of data to a token ID
   */
  mapping(uint256 => uint256) ext256;

  /**
   * @dev Returns current value of `nextId` and increments it by one
   * @return next token ID
   */
  function incrementId() public returns(uint32) {
    // ensure sender has permission to increment `nextId`
    require(isSenderInRole(ROLE_NEXT_ID_INC));

    // return `nextId` and increment it after
    return nextId++;
  }

  /**
   * @dev Writes token data
   * @param _tokenId token ID to write data into
   * @param value a value to write;
   *      to write value as is, set offset and length to zero
   * @param offset position in memory to write to (bits)
   * @param length how many bits to write
   */
  function write(uint256 _tokenId, uint256 value, uint8 offset, uint8 length) public {
    // ensure sender has permission to write to `ext256`
    require(isSenderInRole(ROLE_NEXT_ID_INC));

    // create value mask
    uint256 valueMask = length == 0? // if length is zero its same as 256, which is full mask
                        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:
                        ((uint256(1) << length) - 1) << offset;

    // create erase mask
    uint256 eraseMask = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF ^ valueMask;

    // shift and mask value as needed
    value = value << offset & valueMask;

    // erase portion of the storage required
    ext256[_tokenId] &= eraseMask;

    // write data into erased portion
    ext256[_tokenId] |= value;
  }

  /**
   * @dev Reads token data
   * @dev To read whole 256 bits, set offset and length to zero
   * @param _tokenId token ID to read data from
   * @param offset position in memory to read from (bits)
   * @param length how many bits to read
   */
  function read(uint256 _tokenId, uint8 offset, uint8 length) public constant returns(uint256 value) {
    return length == 0? ext256[_tokenId] >> offset: ext256[_tokenId] >> offset & ((uint256(1) << length) - 1);
  }
}
