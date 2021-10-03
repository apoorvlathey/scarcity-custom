import { ethers, network, waffle } from "hardhat";
import { parseEther } from "@ethersproject/units";
import { AddressZero, MaxUint256, HashZero } from "@ethersproject/constants";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer, Contract } from "ethers";
import { solidity } from "ethereum-waffle";
import chai from "chai";

chai.use(solidity);
const { expect } = chai;
const { deployContract } = waffle;

// artifacts
import NamesV3Artifact from "../artifacts/contracts/NamesV3.sol/NamesV3.json";
import RarityArtifact from "../artifacts/contracts/Mocks/rarity.sol/rarity.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

// types
import { NamesV3 } from "../typechain/NamesV3";
import { IERC20 } from "../typechain/IERC20";

describe("NamesV3", () => {
  let namesV3: NamesV3;
  let rarity: Contract;
  let usdc: IERC20;
  let wbtc: IERC20;

  let deployer: SignerWithAddress;
  let user: SignerWithAddress;

  // for tests assuming 18 decimals for both tokens
  const USDCPrice = parseEther("1000");
  const WBTCPrice = parseEther("0.01");

  before(async () => {
    [deployer, user] = await ethers.getSigners();

    // deploy contracts
    rarity = (await deployContract(deployer, RarityArtifact)) as Contract;
    usdc = (await deployContract(deployer, MockERC20Artifact, [
      user.address,
    ])) as IERC20;
    wbtc = (await deployContract(deployer, MockERC20Artifact, [
      user.address,
    ])) as IERC20;

    namesV3 = (await deployContract(deployer, NamesV3Artifact, [
      rarity.address,
      usdc.address,
      wbtc.address,
      USDCPrice,
      WBTCPrice,
    ])) as NamesV3;

    // mint 2 summoners by user
    await rarity.connect(user).summon(1);
    await rarity.connect(user).summon(1);
    // mint 1 summoner by deployer
    await rarity.connect(deployer).summon(1);
  });

  context("claim", () => {
    it("should claim name with USDC", async () => {
      const summonerId = 0;
      const name = "hello1";

      const preUSDCBal = await usdc.balanceOf(namesV3.address);
      await usdc.connect(user).approve(namesV3.address, MaxUint256);

      await expect(namesV3.connect(user).claim(name, summonerId, true))
        .to.emit(namesV3, "NameClaimed")
        .withArgs(user.address, summonerId, name, 1);

      const postUSDCBal = await usdc.balanceOf(namesV3.address);
      expect(postUSDCBal.sub(preUSDCBal)).to.eq(USDCPrice);
    });

    it("should claim name with WBTC", async () => {
      const summonerId = 1;
      const name = "hello2";

      const preWBTCBal = await wbtc.balanceOf(namesV3.address);
      await wbtc.connect(user).approve(namesV3.address, MaxUint256);

      await expect(namesV3.connect(user).claim(name, summonerId, false))
        .to.emit(namesV3, "NameClaimed")
        .withArgs(user.address, summonerId, name, 2);

      const postWBTCBal = await wbtc.balanceOf(namesV3.address);
      expect(postWBTCBal.sub(preWBTCBal)).to.eq(WBTCPrice);
    });

    it("should revert if summoner not owner by user", async () => {
      const summonerId = 2;
      const name = "hello3";

      await expect(
        namesV3.connect(user).claim(name, summonerId, true)
      ).to.revertedWith("!owner");
    });
  });

  context("update_capitalization", () => {
    it("should update capitalization of name", async () => {
      const namesId = 1;
      const oldName = "hello1";
      const newName = "HELLO1";

      await expect(
        namesV3.connect(user).update_capitalization(namesId, newName)
      )
        .to.emit(namesV3, "NameUpdated")
        .withArgs(namesId, oldName, newName);
    });
  });

  context("withdrawFunds", () => {
    it("should allow owner to withdraw all USDC and WBTC from contract", async () => {
      const preUSDCContractBal = await usdc.balanceOf(namesV3.address);
      const preWBTCContractBal = await wbtc.balanceOf(namesV3.address);

      await namesV3.connect(deployer).withdrawFunds();

      const postUSDCOwnerBal = await usdc.balanceOf(deployer.address);
      const postWBTCOwnerBal = await wbtc.balanceOf(deployer.address);

      expect(postUSDCOwnerBal).to.eq(preUSDCContractBal);
      expect(postWBTCOwnerBal).to.eq(preWBTCContractBal);
    });
  });
});
