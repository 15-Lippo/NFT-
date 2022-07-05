const { assert, expect } = require('chai');
const { network, ethers } = require('hardhat');
const { developmentChains } = require('../../helper-hardhat-config');

!developmentChains.includes(network.name) ?
  describe.skip :
  describe("NFTUnboxed Unit Tests", async function () {
    let nftUnboxed, basicNft, deployer, user;
    const PRICE = ethers.utils.parseEther("0.01");
    const TOKEN_ID = 0;

    beforeEach(async function () {
      const accounts = await ethers.getSigners();
      deployer = accounts[0];
      user = accounts[1];
      await deployments.fixture(["all"]);
      // All this is done by deployer by default
      nftUnboxed = await ethers.getContract("NFTUnboxed");
      basicNft = await ethers.getContract("BasicNft");
      await basicNft.mintNft();
      await basicNft.approve(nftUnboxed.address, TOKEN_ID);
    });

    describe("ListItem", function () {
      it("It can be listed", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const nft = await nftUnboxed.getItem(basicNft.address, TOKEN_ID);
        assert.equal(nft.seller, deployer.address);
        assert.equal(nft.price, PRICE.toString());
      });

      it("Emits an event after listing an item", async function () {
        expect(await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
          "ItemListed"
        )
      })

      it("Reverts for price less than 0", async function () {
        await expect(nftUnboxed.listItem(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith("NFTUnboxed__PriceMustBeGreaterThanZero");
      });

      it("Reverts if seller is not owner", async function () {
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await expect(userConnectedNftUnboxed.listItem(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith("NFTUnboxed__NotOwner");
      });

      it("Reverts for non-approved nft", async function () {
        await basicNft.mintNft();
        await expect(nftUnboxed.listItem(basicNft.address, 1, PRICE)).to.be.revertedWith("NFTUnboxed__NotApprovedForMarketplace");
      });
    });

    describe("BuyItem", function () {
      it("It can be listed and bought", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await userConnectedNftUnboxed.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
        const newOwner = await basicNft.ownerOf(TOKEN_ID);
        assert.equal(newOwner, user.address);
        const proceeds = await nftUnboxed.getProceeds(deployer.address);
        assert.equal(proceeds.toString(), PRICE.toString());
      });

      it("Emits an event after buying an item", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        expect(await userConnectedNftUnboxed.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })).to.emit(
          "ItemBought"
        )
      })

      it("Reverts for nonlisted nft", async function () {
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await expect(userConnectedNftUnboxed.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })).to.be.revertedWith("NFTUnboxed__NotListed");
      });

      it("Reverts for price lower than nft price", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await expect(userConnectedNftUnboxed.buyItem(basicNft.address, TOKEN_ID, { value: PRICE.sub(ethers.utils.parseEther("0.005")) })).to.be.revertedWith("NFTUnboxed__NotEnoughPrice");
      });
    });


    describe("DeleteItem", function () {
      it("It is deleted", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        expect(await nftUnboxed.deleteItem(basicNft.address, TOKEN_ID)).to.emit("ItemDeleted");
        const nft = await nftUnboxed.getItem(basicNft.address, TOKEN_ID);
        // assert.equal(nft.seller, '');
        assert.equal(nft.price, (0).toString());
      });

      it("Emits an event after deleting an item", async function () {
        expect(await nftUnboxed.deleteItem(basicNft.address, TOKEN_ID)).to.emit(
          "ItemDelete"
        )
      })

      it("Reverts if sender is not owner", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await expect(userConnectedNftUnboxed.deleteItem(basicNft.address, TOKEN_ID)).to.be.revertedWith("NFTUnboxed__NotOwner");
      });
    });

    describe("UpdateItem", function () {
      it("It is updated", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        await nftUnboxed.updateItem(basicNft.address, TOKEN_ID, PRICE.add(ethers.utils.parseEther("0.02")));
        const nft = await nftUnboxed.getItem(basicNft.address, TOKEN_ID);
        assert.equal(nft.price.toString(), PRICE.add(ethers.utils.parseEther("0.02")).toString());
      });

      it("Emits an event after updating an item", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        expect(await nftUnboxed.updateItem(basicNft.address, TOKEN_ID, PRICE.add(ethers.utils.parseEther("0.02")))).to.emit(
          "ItemListed"
        )
      })

      it("Reverts if sender is not owner", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await expect(userConnectedNftUnboxed.updateItem(basicNft.address, TOKEN_ID, PRICE.add(ethers.utils.parseEther("0.02")))).to.be.revertedWith("NFTUnboxed__NotOwner");
      });
    });

    describe("WithdrawProceeds", function () {
      it("It withdraw proceeds", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        const userConnectedNftUnboxed = nftUnboxed.connect(user);
        await userConnectedNftUnboxed.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
        const deployerProceedsBefore = await nftUnboxed.getProceeds(deployer.address);
        const deployerBalanceBefore = await deployer.getBalance();
        const txResponse = await nftUnboxed.withdrawProceeds();
        const transactionReceipt = await txResponse.wait(1)
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const gasCost = gasUsed.mul(effectiveGasPrice)
        const deployerBalanceAfter = await deployer.getBalance()
        assert(
          deployerBalanceAfter.add(gasCost).toString() ==
          deployerProceedsBefore.add(deployerBalanceBefore).toString()
        )
      });

      it("Reverts if no proceeds", async function () {
        await nftUnboxed.listItem(basicNft.address, TOKEN_ID, PRICE);
        await expect(nftUnboxed.withdrawProceeds()).to.be.revertedWith("NFTUnboxed__NoProceeds");
      });
    });
  });