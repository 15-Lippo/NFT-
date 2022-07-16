const { ethers } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 3
const PRICE = ethers.utils.parseEther("0.1")

async function buyNft() {
  const nftMarketplace = await ethers.getContract("NftMarketplace")
  const basicNft = await ethers.getContract("BasicNft")

  console.log("Buying NFT...")
  const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
  await tx.wait(1)

  if (network.config.chainId == 31337) {
    await moveBlocks(1, (sleepAmount = 1000))
  }

  console.log("NFT Bought!")
}

buyNft()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
