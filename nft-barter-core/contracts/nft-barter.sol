pragma solidity ^0.8.15;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NftBarter is ERC721 {
  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}
}