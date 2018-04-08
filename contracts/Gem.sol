pragma solidity 0.4.18;

contract Gem {
	/**
	 * @dev operators perform actions on the token
	 *  with the restricted access, like enabling/disabling
	 *  transfers, minting, burning, etc
	 */
	mapping(address => uint32) public operators;

	/**
	 * @dev Core of the Gem as ERC721 token is mapping
	 *  gem id => state + owner
	 *  which maps a Gem ID (ERC721 tokenId) to a
	 *  uint256 packed struct containing current gem state
	 *  and owner address
	 */
	mapping(uint256 => uint256) public tokens;

	/// @notice total number of tokens owned by each each account
	mapping(address => uint256) public balanceOf;

	/// @notice total number of tokens which exist in the system
	uint256 public totalSupply;

	/// @dev a bitmask of globally enabled features, see below
	uint32 public f;

	/**
	 * @dev globally enabled features, permissions:
	 * 
	 */
	uint32 public constant PERM_OP_CREATE = 0x00000001;
	uint32 public constant PERM_OP_UPDATE = 0x00000002;
	uint32 public constant PERM_OP_DELETE = 0x00000004;
	uint32 public constant PERM_MINT = 0x00000008;
	uint32 public constant PERM_BURN = 0x00000010;
	uint32 public constant PERM_UPDATE_F = 0x00000020;
	uint32 public constant PERM_FULL = 0xFFFFFFFF;

	event Minted(uint256 id, address to);
	event Burnt(uint256 id, address from);

	function Gem() public {
		address creator = msg.sender;

		// grant the contract creator full permissions
		operators[creator] = PERM_FULL;
	}

	function updateFeatures(uint32 mask) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// caller should have a permission to update features
		require(p & PERM_UPDATE_F == PERM_UPDATE_F);

		// taking into account caller's permissions,
		// 1) enable features requested
		f |= p & mask;
		// 2) disable features requested
		f &= PERM_FULL ^ (p & (PERM_FULL ^ mask));
	}

}
