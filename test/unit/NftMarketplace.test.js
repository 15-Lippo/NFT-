const { assert, expect } = require("chai")
const { network, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("NftMarketplace Unit Tests", async function () {
    let nftMarketplace, basicNft, deployer, user
    const PRICE = ethers.utils.parseEther("0.01")
    const TOKEN_ID = 0

    beforeEach(async function () {
      const accounts = await ethers.getSigners()
      deployer = accounts[0]
      user = accounts[1]
      await deployments.fixture(["all"])
      // All this is done by deployer by default
      nftMarketplace = await ethers.getContract("NftMarketplace")
      basicNft = await ethers.getContract("BasicNft")
      await basicNft.mintNft()
      await basicNft.approve(nftMarketplace.address, TOKEN_ID)
    })

    describe("ListItem", function () {
      it("It can be listed", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const nft = await nftMarketplace.getItem(basicNft.address, TOKEN_ID)
        assert.equal(nft.owner, deployer.address)
        assert.equal(nft.price, PRICE.toString())
      })

      it("Emits an event after listing an item", async function () {
        expect(
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        ).to.emit("ItemListed")
      })

      it("Reverts for price less than 0", async function () {
        await expect(
          nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
        ).to.be.revertedWith("NftMarketplace__PriceMustBeGreaterThanZero")
      })

      it("Reverts if seller is not owner", async function () {
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await expect(
          userConnectedNftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
        ).to.be.revertedWith("NftMarketplace__NotOwner")
      })

      it("Reverts for non-approved nft", async function () {
        await basicNft.mintNft()
        await expect(
          nftMarketplace.listItem(basicNft.address, 1, PRICE)
        ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
      })
    })

    describe("BuyItem", function () {
      it("It can be listed and bought", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
          value: PRICE,
        })
        const newOwner = await basicNft.ownerOf(TOKEN_ID)
        assert.equal(newOwner, user.address)
        const proceeds = await nftMarketplace.getProceeds(deployer.address)
        assert.equal(proceeds.toString(), PRICE.toString())
      })

      it("Emits an event after buying an item", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        expect(
          await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          })
        ).to.emit("ItemSold")
      })

      it("Reverts for nonlisted nft", async function () {
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await expect(
          userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          })
        ).to.be.revertedWith("NftMarketplace__NotListed")
      })

      it("Reverts for price lower than nft price", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await expect(
          userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE.sub(ethers.utils.parseEther("0.005")),
          })
        ).to.be.revertedWith("NftMarketplace__NotEnoughPrice")
      })
    })

    describe("CancelItem", function () {
      it("It can be canceled", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        await nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
        const nft = await nftMarketplace.getItem(basicNft.address, TOKEN_ID)
        // assert.equal(nft.owner, '');
        assert.equal(nft.price, (0).toString())
      })

      it("Emits an event after cancelling an item", async function () {
      await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        expect(await nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)).to.emit(
          "ItemCanceled"
        )
      })

      it("Reverts if sender is not owner", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await expect(
          userConnectedNftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
        ).to.be.revertedWith("NftMarketplace__NotOwner")
      })
    })

    describe("UpdateItem", function () {
      it("Its price can be updated", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        await nftMarketplace.updateItem(
          basicNft.address,
          TOKEN_ID,
          PRICE.add(ethers.utils.parseEther("0.02"))
        )
        const nft = await nftMarketplace.getItem(basicNft.address, TOKEN_ID)
        assert.equal(
          nft.price.toString(),
          PRICE.add(ethers.utils.parseEther("0.02")).toString()
        )
      })

      it("Emits an event after updating an item", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        expect(
          await nftMarketplace.updateItem(
            basicNft.address,
            TOKEN_ID,
            PRICE.add(ethers.utils.parseEther("0.02"))
          )
        ).to.emit("ItemListed")
      })

      it("Reverts if sender is not owner", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await expect(
          userConnectedNftMarketplace.updateItem(
            basicNft.address,
            TOKEN_ID,
            PRICE.add(ethers.utils.parseEther("0.02"))
          )
        ).to.be.revertedWith("NftMarketplace__NotOwner")
      })
    })

    describe("WithdrawProceeds", function () {
      it("It can withdraw proceeds", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        const userConnectedNftMarketplace = nftMarketplace.connect(user)
        await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
          value: PRICE,
        })
        const deployerProceedsBefore = await nftMarketplace.getProceeds(
          deployer.address
        )
        const deployerBalanceBefore = await deployer.getBalance()
        const txResponse = await nftMarketplace.withdrawProceeds()
        const transactionReceipt = await txResponse.wait(1)
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const gasCost = gasUsed.mul(effectiveGasPrice)
        const deployerBalanceAfter = await deployer.getBalance()
        assert(
          deployerBalanceAfter.add(gasCost).toString() ==
          deployerProceedsBefore.add(deployerBalanceBefore).toString()
        )
      })

      it("Reverts if there are no proceeds", async function () {
        await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
        await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
          "NftMarketplace__NoProceeds"
        )
      })
    })
  })
