const { frontEndContractsFile, frontEndAbiLocation } = require("../helper-hardhat-config")
require("dotenv").config()
const fs = require("fs")
const { ethers, network } = require("hardhat")
const deployNftCollection = require("../scripts/deploy-nft-collections")

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Writing to front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end written!")
  }
}

async function updateAbi() {
  const nftMarketplace = await ethers.getContract("NftMarketplace")
  fs.writeFileSync(
    `${frontEndAbiLocation}NftMarketplace.json`,
    nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
  )

  const basicNft = await ethers.getContract("BasicNft")
  fs.writeFileSync(
    `${frontEndAbiLocation}BasicNft.json`,
    basicNft.interface.format(ethers.utils.FormatTypes.json)
  )

  const nftCollection = await ethers.getContract("NftCollection")
  fs.writeFileSync(
    `${frontEndAbiLocation}NftCollection.json`,
    nftCollection.interface.format(ethers.utils.FormatTypes.json)
  )
}

async function updateContractAddresses() {
  const chainId = network.config.chainId.toString()
  const nftMarketplace = await ethers.getContract("NftMarketplace")
  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
  contractAddresses[chainId] = await deployNftCollection()
  contractAddresses[chainId]["NftMarketplace"] = nftMarketplace.address
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
