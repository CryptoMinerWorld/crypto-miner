pragma solidity 0.4.23;

import "./AccessControlLight.sol";
import "./Random.sol";

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
  uint256 public constant EXTENSION_UID = 0x5907e0ef0cc11bd9c3b6f14fe92523435d27e8da304e24c1918ab0d37f9fb096;

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
   * @dev Color provider may change the `availableColors` array
   */
  uint32 public constant ROLE_COLOR_PROVIDER = 0x00000004;

  /**
   * @dev Gem colors available in the system
   */
  uint8[] public availableColors = [1, 2, 5, 6, 7, 9, 10];

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
    // read from required position required length of bits and return
    return length == 0? ext256[_tokenId] >> offset: ext256[_tokenId] >> offset & ((uint256(1) << length) - 1);
  }

  /**
   * @dev Updates `availableColors` array
   * @dev Requires sender to have `ROLE_COLOR_PROVIDER` permission
   * @param colors array of available colors to set
   */
  function setAvailableColors(uint8[] colors) public {
    // ensure sender has permission to set colors
    require(isSenderInRole(ROLE_COLOR_PROVIDER));

    // set `availableColors` array
    availableColors = colors;
  }

  /**
   * @dev Picks random color from `availableColors` array
   * @param seed seed to be used in random number generator
   * @return gem color, an integer [1, 12]
   */
  function randomColor(uint256 seed) public constant returns(uint8) {
    // generate random index and return random number from the array
    return availableColors[Random.__randomValue(seed, 0, uint8(availableColors.length))];
  }

  /**
   * @dev Getter for an entire `availableColors` array
   * @return array of available colors - `availableColors`
   */
  function getAvailableColors() public constant returns(uint8[]) {
    // just return an array as is
    return availableColors;
  }
}
