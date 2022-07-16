// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NftMarketplace is ReentrancyGuard {
    error NftMarketplace__PriceMustBeGreaterThanZero();
    error NftMarketplace__NotApprovedForMarketplace();
    error NftMarketplace__AlreadyListed();
    error NftMarketplace__NotListed();
    error NftMarketplace__NotOwner();
    error NftMarketplace__NotEnoughPrice();
    error NftMarketplace__NoProceeds();
    error NftMarketplace__TransferFailed();

    struct Item {
        address owner;
        uint256 price;
    }

    event ItemListed(
        address indexed owner,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemSold(
        address indexed owner,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(address indexed nftAddress, uint256 indexed tokenId);

    mapping(address => mapping(uint256 => Item)) private s_items;
    mapping(address => uint256) s_proceeds;

    constructor() {}

    /////////////////////
    //    Modifiers    //
    /////////////////////

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address sender
    ) {
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != sender) revert NftMarketplace__NotOwner();
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Item memory item = s_items[nftAddress][tokenId];
        if (item.price <= 0) revert NftMarketplace__NotListed();
        _;
    }

    modifier notListed(address nftAddress, uint256 tokenId) {
        Item memory item = s_items[nftAddress][tokenId];
        if (item.price > 0) revert NftMarketplace__AlreadyListed();
        _;
    }

    /////////////////////
    // Main Functions  //
    /////////////////////

    /*
     * @notice Method for listing NFT
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param price sale price for each item
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) revert NftMarketplace__PriceMustBeGreaterThanZero();
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this))
            revert NftMarketplace__NotApprovedForMarketplace();
        s_items[nftAddress][tokenId] = Item(msg.sender, price);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(address nftAddress, uint256 tokenId)
        external
        payable
        nonReentrant
        isListed(nftAddress, tokenId)
    {
        Item memory item = s_items[nftAddress][tokenId];
        if (msg.value < item.price) revert NftMarketplace__NotEnoughPrice();
        // PULL OVER PUSH: Don't send money, have them withdaw it
        s_proceeds[item.owner] += item.price;
        delete (s_items[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(item.owner, msg.sender, tokenId);
        emit ItemSold(msg.sender, nftAddress, tokenId, item.price);
    }

    function cancelItem(address nftAddress, uint256 tokenId)
        external
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        delete (s_items[nftAddress][tokenId]);
        emit ItemCanceled(nftAddress, tokenId);
    }

    function updateItem(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        nonReentrant
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (newPrice <= 0) revert NftMarketplace__PriceMustBeGreaterThanZero();
        s_items[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) revert NftMarketplace__NoProceeds();
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) revert NftMarketplace__TransferFailed();
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    function getItem(address nftAddress, uint256 tokenId) external view returns (Item memory) {
        return s_items[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
