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
	uint32 public constant PERM_UPDATE_F = 0x00000020;
	uint32 public constant PERM_FULL = 0xFFFFFFFF;

	event Minted(uint256 id, address to);
	event Burnt(uint256 id, address from);

	function Gem() public {
		address creator = msg.sender;

		// grant the contract creator full permissions
		operators[creator] = PERM_FULL;
	}
	
	function ownerOf(uint256 tokenId) public constant returns (address) {
		// get the token from storage
		uint256 token = tokens[tokenId];

		// check if this token exists
		require(token > 0);

		// extract token's address and return
		return address(token);
	}

	function balanceOf(address who) public constant returns (uint256) {
		// simply read the balance from balances
		return balances[who];
	}

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
		require(p & PERM_UPDATE_F == PERM_UPDATE_F);

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

		// init token value with new owner address
		uint256 token = uint256(to);
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
}
