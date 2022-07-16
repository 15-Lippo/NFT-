const { ethers } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 0

async function cancelNft() {
	const nftMarketplace = await ethers.getContract("NftMarketplace")
	const basicNft = await ethers.getContract("BasicNft")

	console.log("Cancelling nft...")
	const tx = await nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
	await tx.wait(1)

	if (network.config.chainId == 31337) {
		await moveBlocks(1, (sleepAmount = 1000))
	}

	console.log("Canceled NFT...")
}

cancelNft()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
