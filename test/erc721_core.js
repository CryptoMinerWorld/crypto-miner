/**
 * ERC721 Core Tests are targeting ERC721Core.sol which is abstract
 * and inherited by GemERC721, CountryERC721 and PlotERC721
 * All the tests are performed ann all 3 instances
 */

export const ERC721Receiver = artifacts.require("./DummyReceiver.sol");

// supported interfaces
export const InterfaceId_ERC165 = web3.utils.sha3("supportsInterface(bytes4)").substr(0, 10);
export const InterfaceId_ERC721 = interfaceID(
	"balanceOf(address)",
	"ownerOf(uint256)",
	"approve(address,uint256",
	"getApproved(uint256)",
	"setApprovalForAll(address,bool)",
	"isApprovedForAll(address,address)",
	"transferFrom(address,address,uint256)",
	"safeTransferFrom(address,address,uint256)",
	"safeTransferFrom(address,address,uint256,bytes)"
);
export const InterfaceId_ERC721Exists = web3.utils.sha3("exists(uint256)").substr(0, 10);
export const InterfaceId_ERC721Enumerable = interfaceID(
	"totalSupply()",
	"tokenOfOwnerByIndex(address,uint256)",
	"tokenByIndex(uint256)"
);
export const InterfaceId_ERC721Metadata = interfaceID(
	"name()",
	"symbol()",
	"tokenURI(uint256)"
);

// Features and Roles:
// Enables ERC721 transfers of the tokens (token owner performs a transfer)
export const FEATURE_TRANSFERS = 0x00000001;
// Enables ERC721 transfers on behalf (approved operator performs a transfer)
export const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
// Allows minting tokens
export const ROLE_TOKEN_CREATOR = 0x00000001;
// Allows destroying tokens
export const ROLE_TOKEN_DESTROYER = 0x00000002;
// Extension writer is responsible for writing into ext256,
export const ROLE_EXT_WRITER = 0x00000004;
// State provider is responsible for modifying token's state
export const ROLE_STATE_PROVIDER = 0x00000010;
// State provider is responsible for modifying transfer lock bitmask (smart contract global)
export const ROLE_TRANSFER_LOCK_PROVIDER = 0x00000020;


// GemERC721 specific Features and Roles
export const ROLE_LEVEL_PROVIDER = 0x00000040;
export const ROLE_GRADE_PROVIDER = 0x00000080;
export const ROLE_AGE_PROVIDER = 0x00000100;
export const ROLE_NEXT_ID_INC = 0x00000200;
export const ROLE_COLOR_PROVIDER = 0x00000400;

// CountryERC721 specific Features and Roles
export const FEATURE_ALLOW_TAX_UPDATE = 0x00000010;
export const ROLE_TAX_MANAGER = 0x00000010;

// PlotERC721 specific Features and Roles:
// Allows modifying token's offset
export const ROLE_OFFSET_PROVIDER = 0x00000040;

// calculates ERC165 interface ID for the given selectors
export function interfaceID(...selectors) {
	let result = 0;
	for(let i = 0; i < selectors.length; i++) {
		result ^= web3.utils.toBN(web3.utils.sha3(selectors[i]).substr(0, 10)).toNumber();
	}
	return web3.utils.toHex(result >>> 0);
}
