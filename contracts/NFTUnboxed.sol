// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTUnboxed is ReentrancyGuard {
    error NFTUnboxed__PriceMustBeGreaterThanZero();
    error NFTUnboxed__NotApprovedForMarketplace();
    error NFTUnboxed__AlreadyListed();
    error NFTUnboxed__NotListed();
    error NFTUnboxed__NotOwner();
    error NFTUnboxed__NotEnoughPrice();
    error NFTUnboxed__NoProceeds();
    error NFTUnboxed__TransferFailed();

    struct Item {
        address seller;
        uint256 price;
    }

    event ItemListed(
        address indexed sellerAddress,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyerAddress,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemDelete(address indexed nftAddress, uint256 indexed tokenId);

    mapping(address => mapping(uint256 => Item)) private s_items;
    mapping(address => uint256) s_proceeds;

    constructor() {}

    /////////////////////
    //    Modifiers    //
    /////////////////////

    modifier notListed(address nftAddress, uint256 tokenId) {
        Item memory item = s_items[nftAddress][tokenId];
        if (item.price > 0) revert NFTUnboxed__AlreadyListed();
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address sender
    ) {
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != sender) revert NFTUnboxed__NotOwner();
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Item memory item = s_items[nftAddress][tokenId];
        if (item.price <= 0) revert NFTUnboxed__NotListed();
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
    )
        external
        notListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) revert NFTUnboxed__PriceMustBeGreaterThanZero();
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this))
            revert NFTUnboxed__NotApprovedForMarketplace();
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
        if (msg.value < item.price) revert NFTUnboxed__NotEnoughPrice();
        // PULL OVER PUSH: Don't send money, have them withdaw it
        s_proceeds[item.seller] += item.price;
        delete (s_items[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(item.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, item.price);
    }

    function deleteItem(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
    {
        delete (s_items[nftAddress][tokenId]);
        emit ItemDelete(nftAddress, tokenId);
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
        if (newPrice <= 0) revert NFTUnboxed__PriceMustBeGreaterThanZero();
        Item memory item = s_items[nftAddress][tokenId];
        s_items[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, item.price);
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) revert NFTUnboxed__NoProceeds();
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) revert NFTUnboxed__TransferFailed();
    }

    /////////////////////
    // Getter Functions //
    /////////////////////

    function getItem(address nftAddress, uint256 tokenId)
        external
        view
        returns (Item memory)
    {
        return s_items[nftAddress][tokenId];
    }

    function getProceeds(address sellerAddress)
        external
        view
        returns (uint256)
    {
        return s_proceeds[sellerAddress];
    }
}
