pragma solidity 0.5.8;

import "./AccessMultiSig.sol";
import "./GemERC721.sol";
import "./Random.sol";

/**
 * @title Mint Helper for GemERC721
 *
 * @dev Auxiliary smart contract to help mint GemERC721 tokens in predictable
 *      ID range, with correct color, level and grade
 *
 * @author Basil Gorin
 */
contract MintHelper is AccessMultiSig {
  /**
   * @dev Smart contract unique identifier, a random number
   * @dev Should be regenerated each time smart contact source code is changed
   * @dev Generated using https://www.random.org/bytes/
   */
  uint256 public constant HELPER_UID = 0x2c383a57d365660ccf5018001bb2ab23b98790f07403deb8a3df5c1abea813f7;

  /**
   * @dev Expected version (UID) of the deployed GemERC721 instance
   *      this smart contract is designed to work with
   */
  uint256 public constant GEM_UID_REQUIRED = 0x8012342b1b915598e6a8249110cd9932d7ee7ae8a8a3bbb3a79a5a545cefee72;

  /**
   * @dev Role MINT_OPERATOR allows minting gems in order controlled by `nextGem`
   */
  uint32 public constant ROLE_MINT_OPERATOR = 0x00000001;

  /**
   * @dev Pointer to the next gem ID do be mined
   */
  uint24 public nextGemId = 0xF201;

  /**
   * @dev Maximum value (exclusive) of the gem ID the helper can mint
   */
  uint24 public constant MAX_GEM_ID = 0xFA00;

  /**
   * @dev A GemERC721 instance the helper operates on
   */
  GemERC721 public tokenInstance;

  /**
   * @dev Fired in mint()
   * @param _by an operator who created a gem
   * @param _to an address which received a gem
   * @param _tokenId ID of the gem created
   * @param color gem color
   * @param level gem level
   * @param gradeType gem grade type
   * @param gradeValue gem grade value
   */
  event Minted(address indexed _by, address indexed _to, uint24 _tokenId, uint8 color, uint8 level, uint8 gradeType, uint24 gradeValue);

  /**
   * @dev Creates mint helper for GemERC721 bound to the deployed GemERC721 instance specified
   * @param tokenAddress deployed GemERC721 instance to bind to
   */
  constructor(address tokenAddress) public {
    // check that we didn't forget to pass the token address
    require(tokenAddress != address(0));

    // bind token instance to the address specified
    tokenInstance = GemERC721(tokenAddress);

    // verify smart contract versions
    require(tokenInstance.TOKEN_UID() == GEM_UID_REQUIRED);
  }

  /**
   * @notice A function to create next auction gem with a random grade value
   *      and assign its ownership to the transaction sender
   * @param color an integer, defining the gem color:
   *      [1] Garnet (January)
   *      [2] Amethyst (February)
   *      [3] Aquamarine (March)
   *      [4] Diamond (April)
   *      [5] Emerald (May)
   *      [6] Pearl (June)
   *      [7] Ruby (July)
   *      [8] Peridot (August)
   *      [9] Sapphire (September)
   *      [10] Opal (October)
   *      [11] Topaz (November)
   *      [12] Turquoise (December)
   * @param level an integer, defining gem level in range [1, 5]
   * @param gradeType an integer, defining gem grade type:
   *      [1] D
   *      [2] C
   *      [3] B
   *      [4] A
   *      [5] AA
   *      [6] AAA
   */
  function mint(uint8 color, uint8 level, uint8 gradeType) public {
    // delegate call to `mintTo`
    mintTo(msg.sender, color, level, gradeType);
  }

  /**
   * @notice A function to create next auction gem with a random grade value
   * @param _to an address to receive minted token
   * @param color an integer, defining the gem color:
   *      [1] Garnet (January)
   *      [2] Amethyst (February)
   *      [3] Aquamarine (March)
   *      [4] Diamond (April)
   *      [5] Emerald (May)
   *      [6] Pearl (June)
   *      [7] Ruby (July)
   *      [8] Peridot (August)
   *      [9] Sapphire (September)
   *      [10] Opal (October)
   *      [11] Topaz (November)
   *      [12] Turquoise (December)
   * @param level an integer, defining gem level in range [1, 5]
   * @param gradeType an integer, defining gem grade type:
   *      [1] D
   *      [2] C
   *      [3] B
   *      [4] A
   *      [5] AA
   *      [6] AAA
   */
  function mintTo(address _to, uint8 color, uint8 level, uint8 gradeType) public {
    // generate some randomness
    uint256 rnd256 = Random.generate256(0);

    // generate generate random grade value
    uint24 gradeValue = uint24(Random.uniform(rnd256, 32, 1000000));

    // delegate call to `mintWith`
    mintWith(_to, color, level, gradeType, gradeValue);
  }

  /**
   * @notice A function to create next auction gem
   * @param _to an address to receive minted token
   * @param color an integer, defining the gem color:
   *      [1] Garnet (January)
   *      [2] Amethyst (February)
   *      [3] Aquamarine (March)
   *      [4] Diamond (April)
   *      [5] Emerald (May)
   *      [6] Pearl (June)
   *      [7] Ruby (July)
   *      [8] Peridot (August)
   *      [9] Sapphire (September)
   *      [10] Opal (October)
   *      [11] Topaz (November)
   *      [12] Turquoise (December)
   * @param level an integer, defining gem level in range [1, 5]
   * @param gradeType an integer, defining gem grade type:
   *      [1] D
   *      [2] C
   *      [3] B
   *      [4] A
   *      [5] AA
   *      [6] AAA
   * @param gradeValue an integer, defining grade value in range [0, 1000000)
   */
  function mintWith(address _to, uint8 color, uint8 level, uint8 gradeType, uint24 gradeValue) public {
    // check sender's permission
    require(isSenderInRole(ROLE_MINT_OPERATOR));

    // ensure function parameters satisfy the constraints
    require(color >= 1 && color <= 12);
    require(level >= 1 && level <= 5);
    require(gradeType >= 1 && gradeType <= 6);
    require(gradeValue < 1000000);

    // verify gem ID is in proper bounds
    require(nextGemId < MAX_GEM_ID);

    // come up with the grade
    uint32 grade = uint32(gradeType) << 24 | gradeValue;

    // plot ID, depth and gem num are zeroes
    tokenInstance.mint(_to, nextGemId++, color, level, grade);

    // emit an event
    emit Minted(msg.sender, _to, nextGemId - 1, color, level, gradeType, gradeValue);
  }
}
