pragma solidity 0.4.23;

import "./AccessControl.sol";
import "./GemERC721.sol";
import "./MetadataStorage.sol";

// A helper contract to create Gems in a safe ID range
// used to create gems to be sold on auctions
contract MintHelper is AccessControl {
  // role MINT_OPERATOR allows minting gems in order controlled by `nextGem`
  uint32 public constant MINT_OPERATOR = 0x00000001;

  // pointer to a next gem do be minted
  // presale range is 0x10001+
  uint32 public nextGem = 0xF001;

  // the helper operates on a GemERC721 instance
  GemERC721 public tokenInstance;

  // fired in mint()
  event Minted(address indexed _to, uint32 _tokenId, uint8 color, uint8 level, uint8 gradeType, uint24 gradeValue);

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

  // call this function to create next auction gem
  function mint(uint8 color, uint8 level, uint8 gradeType, uint24 gradeValue) public {
    // check sender's permission
    require(__isSenderInRole(MINT_OPERATOR));

    // ensure function parameters satisfy the constraints
    require(color >= 1 && color <= 12);
    require(level >= 1 && level <= 5);
    require(gradeType >= 1 && gradeType <= 6);
    require(gradeValue < 1000000);

    // plot ID, depth and gem num are zeroes
    tokenInstance.mint(msg.sender, nextGem++, 0, 0, 0, color, level, gradeType, gradeValue);

    // emit an event
    emit Minted(msg.sender, nextGem - 1, color, level, gradeType, gradeValue);
  }
}
