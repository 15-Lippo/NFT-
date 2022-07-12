const { ethers } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks")
const TOKEN_ID = 0;

async function deleteNft() {
  const nftUnboxed = await ethers.getContract("NFTUnboxed");
  const basicNft = await ethers.getContract("BasicNft");
  const tx = await nftUnboxed.deleteItem(basicNft.address, TOKEN_ID);
  await tx.wait(1);
  console.log("Deleted NFT...");
  if (network.config.chainId == 31337) {
    // Moralis has a hard time if you move more than 1 at once!
    await moveBlocks(1, (sleepAmount = 1000))
  }
}

deleteNft()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
