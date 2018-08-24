pragma solidity 0.4.23;

import "./AccessControl.sol";
import "./GemERC721.sol";

// storage for an arbitrary gem properties not directly involved in game mechanics
contract MetadataStorage is AccessControl {
  // role METADATA_OPERATOR allows writing to metadata storage of this smart contract
  uint32 public constant METADATA_OPERATOR = 0x00000001;

  // properties storage
  // maps gem ID to an non-indexed key-value structure
  // where key and value are strings (see read/write functions)
  // keep it private not to pollute the read page on etherscan
  mapping(uint256 => mapping(bytes32 => string)) private metadata;

  // the storage is bound to a GemERC721 instance
  GemERC721 public tokenInstance;

  // fired in write()
  event Write(address indexed _by, uint256 indexed _tokenId, bytes32 indexed keyHash, string key, string value);

  // fired in del()
  event Delete(address indexed _by, uint256 indexed _tokenId, bytes32 indexed keyHash, string key, string oldValue);

  // must supply a valid token (GemERC721) address
  constructor(address tokenAddress) public {
    // check that we didn't forget to pass the token address
    require(tokenAddress != address(0));

    // bind token instance to the address specified
    tokenInstance = GemERC721(tokenAddress);

    // validate GemERC721 instance by requiring all supported interfaces
    require(tokenInstance.supportsInterface(0x01ffc9a7)); // ERC165
    require(tokenInstance.supportsInterface(0x80ac58cd)); // ERC721
    require(tokenInstance.supportsInterface(0x4f558e79)); // ERC721 exists
    require(tokenInstance.supportsInterface(0x780e9d63)); // ERC721 enumerable
    require(tokenInstance.supportsInterface(0x5b5e139f)); // ERC721 metadata
  }

  // writes the metadata value
  function write(uint256 tokenId, string key, string value) public {
    // check sender's permissions
    require(__isSenderInRole(METADATA_OPERATOR));

    // zero token ID is reserved and not supported to write to
    require(tokenId > 0);

    // token to write metadata for must exist
    require(tokenInstance.exists(tokenId));

    // write the data
    metadata[tokenId][keccak256(key)] = value;

    // emit an event
    emit Write(msg.sender, tokenId, keccak256(key), key, value);
  }

  // removes (deletes) the metadata entry
  function del(uint256 tokenId, string key) public {
    // check sender's permissions
    require(__isSenderInRole(METADATA_OPERATOR));

    // zero token ID is reserved and is not supported to work with
    require(tokenId > 0);

    // token to delete metadata for must exist
    require(tokenInstance.exists(tokenId));

    // read the value
    string memory value = metadata[tokenId][keccak256(key)];

    // remove an entry
    delete metadata[tokenId][keccak256(key)];

    // emit an event
    emit Delete(msg.sender, tokenId, keccak256(key), key, value);
  }

  // a way to read from the metadata
  function read(uint256 tokenId, string key) public constant returns(string) {
    // some predefined value used to check the deployed contract
    if(tokenId == 0 && keccak256(key) == keccak256("foo")) {
      return "bar";
    }

    // zero token ID is reserved and not supported to read from
    require(tokenId > 0);

    // token to read metadata for must exist
    require(tokenInstance.exists(tokenId));

    // delegate read to data structure itself
    return metadata[tokenId][keccak256(key)];
  }
}
