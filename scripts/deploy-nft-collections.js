const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { network, getNamedAccounts, deployments } = require("hardhat")

module.exports = async () => {
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()
	nftCollections = [
		{ name: "DevilNFairyClub", symbol: "DNF" },
		{ name: "FourthWorld", symbol: "FWD" },
		{ name: "JungleBookShelf", symbol: "JBK" },
	]
	nftAddressMapping = {}
	for (nftCollection of nftCollections) {
		const nftContract = await deploy("NftCollection", {
			from: deployer,
			args: [nftCollection.name, nftCollection.symbol],
			log: true,
			waitConfirmations: network.config.blockConfirmations || 1,
		})
		log(`NftCollection -- ${nftCollection.name} contract deployed...`)
		nftAddressMapping[nftCollection.name] = nftContract.address

		if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
			await verify(nftContract.address, [nftCollection.name, nftCollection.symbol])
		}
		log("---------------------------------")
	}
	return nftAddressMapping
}
