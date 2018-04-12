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
	mapping(address => uint256) public balances;

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
	uint32 public constant PERM_UPDATE_FEATURES = 0x00000020;
	uint32 public constant FEATURE_TRANSFER = 0x00000040;
	uint32 public constant PERM_FULL = 0xFFFFFFFF;

	/**
	 * @dev event names are self-explanatory
	 */
	/// @dev fired in mint()
	event Minted(uint256 indexed id, address indexed to);
	/// @dev fired in burn()
	event Burnt(uint256 indexed id, address indexed from);
	/// @dev fired in transfer()
	event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

	function Gem() public {
		address creator = msg.sender;

		// grant the contract creator full permissions
		operators[creator] = PERM_FULL;
	}

	/**
	 * @notice finds an owner address for a token specified
	 * @dev Gets the owner of the specified token ID
	 * @param tokenId uint256 ID of the token to query the owner of
	 * @return owner address currently marked as the owner of the given token ID
	 */
	function ownerOf(uint256 tokenId) public constant returns (address) {
		// get the token from storage
		uint256 token = tokens[tokenId];

		// check if this token exists
		require(token > 0);

		// extract token's address and return
		return address(token);
	}


	/**
	 * @notice Gets an amount of tokens owned by the give address
	 * @dev Gets the balance of the specified address
	 * @param who address to query the balance for
	 * @return uint256 representing the amount owned by the passed address
	 */
	function balanceOf(address who) public constant returns (uint256) {
		// simply read the balance from balances
		return balances[who];
	}

	/**
	 * @notice Checks if specified token exists
	 * @dev Returns whether the specified token ID exists
	 * @param tokenId uint256 ID of the token to query the existence of
	 * @return whether the token exists
	 */
	function exists(uint256 tokenId) public constant returns (bool) {
		// get the token from storage
		uint256 token = tokens[tokenId];
		// check if this token exists
		return token > 0;
	}

	function updateFeatures(uint32 mask) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// caller should have a permission to update features
		require(p & PERM_UPDATE_FEATURES == PERM_UPDATE_FEATURES);

		// taking into account caller's permissions,
		// 1) enable features requested
		f |= p & mask;
		// 2) disable features requested
		f &= PERM_FULL ^ (p & (PERM_FULL ^ mask));
	}

	function createOperator(address operator, uint32 permissions) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// feature must be enabled globally and
		// caller should have a permission to add new operator
		require(f & p & PERM_OP_CREATE == PERM_OP_CREATE);
		// caller cannot grant a permission which he doesn't have himself
		require(p | permissions == p);
		// create is not allowed to overwrite existing operator
		require(operators[operator] == 0);

		// add an operator with the permissions specified
		operators[operator] = permissions;
	}

	function updateOperator(address operator, uint32 permissions) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// feature must be enabled globally and
		// caller should have a permission to update operator
		require(f & p & PERM_OP_UPDATE == PERM_OP_UPDATE);
		// caller cannot grant a permission which he doesn't have himself
		require(p | permissions == p);

		// update may extend existing operator's permissions
		uint32 e = operators[operator];
		// update an operator with the permissions specified
		operators[operator] = e | permissions;
	}

	function deleteOperator(address operator) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// feature must be enabled globally and
		// caller should have a permission to remove operator
		require(f & p & PERM_OP_DELETE == PERM_OP_DELETE);

		// remove an operator
		delete operators[operator];
	}

	function mint(uint256 id, address to) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// feature must be enabled globally and
		// caller should have a permission to mint a token
		require(f & p & PERM_MINT == PERM_MINT);
		// the token specified should not already exist
		require(tokens[id] == 0);

		// init token value with current date and new owner address
		uint256 token = (0xFFFFFFFF & block.number) << 192 | uint160(to);
		// persist newly created token
		tokens[id] = token;
		// update token owner balance
		balances[to]++;
		// update total tokens number
		totalSupply++;

		// fire an event
		Minted(id, to);
	}

	function burn(uint256 id) public {
		// call sender nicely - caller
		address caller = msg.sender;
		// read caller's permissions
		uint32 p = operators[caller];

		// feature must be enabled globally and
		// caller should have a permission to burn a token
		require(f & p & PERM_BURN == PERM_BURN);

		// get the token from storage
		uint256 token = tokens[id];

		// a token to burn should exist
		require(token > 0);

		// extract token owner address
		address from = address(token);

		// update token owner balance
		balances[from]--;
		// update total tokens number
		totalSupply--;

		// delete token
		delete tokens[id];

		// fire an event
		Burnt(id, from);
	}

	/**
	 * @notice Transfers a token specified to the address specified.
	 * If transferring to a smart contract be VERY CAREFUL to ensure
	 * that it is aware of ERC-721 or your Token may be lost forever.
	 * @dev Transfers the ownership of a given token ID to another address
	 * @dev Requires the msg sender to be the owner of a token
	 * @param to address to receive the ownership of the given token ID
	 * @param tokenId uint256 ID of the token to be transferred
	 */
	function transfer(address to, uint256 tokenId) public {
		// feature must be enabled globally
		require(f & FEATURE_TRANSFER == FEATURE_TRANSFER);

		// call sender nicely - caller
		address caller = msg.sender;

		// validate destination address
		require(to != address(0));
		require(to != caller);

		// caller must be an owner of the token
		require(ownerOf(tokenId) == caller);

		// update balances
		balances[caller]--;
		balances[to]++;

		// get the token from storage
		uint256 token = tokens[tokenId];

		// update token transfer date and owner
		tokens[tokenId] = token
										& 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000
										| (0xFFFFFFFF & block.number) << 160
										| uint160(to);
	}

}
