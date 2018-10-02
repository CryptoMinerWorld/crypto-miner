pragma solidity 0.4.23;

interface ERC721 {
  function supportsInterface(bytes4 interfaceID) external view returns (bool);
  function ownerOf(uint256 _tokenId) external view returns (address);
  function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
  function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;
}
