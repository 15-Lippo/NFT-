// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NftCollection is ERC721 {
	struct Token {
		string tokenUri;
		uint256 price;
	}
	uint256 private s_tokenCounter;
	mapping(uint256 => Token) private s_tokenIdToToken;

	event NftMinted(uint256 indexed tokenId, address indexed owner, uint256 price);

	constructor(string memory nftCollectionName, string memory nftCollectionSymbol)
		ERC721(nftCollectionName, nftCollectionSymbol)
	{
		s_tokenCounter = 0;
	}

	function mintNft(string memory tokenUri, uint256 price) public {
		_safeMint(msg.sender, s_tokenCounter);
		s_tokenIdToToken[s_tokenCounter] = Token(tokenUri, price);
		emit NftMinted(s_tokenCounter, msg.sender, price);
		s_tokenCounter = s_tokenCounter + 1;
	}

	function getToken(uint256 tokenId) public view returns (Token memory) {
		require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
		return s_tokenIdToToken[tokenId];
	}

	function getTokenCounter() public view returns (uint256) {
		return s_tokenCounter;
	}
}
