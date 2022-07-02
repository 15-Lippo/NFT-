const { network } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const nftUnboxed = await deploy(
    "NFTUnboxed", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
  }
  );
  log('NFTUnboxed contract deployed...');
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(nftUnboxed.address, []);
  }
  log("---------------------------------");
}

module.exports.tags = ["all", "nft-unboxed"];
