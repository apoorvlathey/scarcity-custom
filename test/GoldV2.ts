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
import GoldV2Artifact from "../artifacts/contracts/GoldV2.sol/GoldV2.json";
import NamesV3Artifact from "../artifacts/contracts/NamesV3.sol/NamesV3.json";
import RarityArtifact from "../artifacts/contracts/Mocks/rarity.sol/rarity.json";
import MockERC20Artifact from "../artifacts/contracts/Mocks/MockERC20.sol/MockERC20.json";

describe("GoldV2", () => {
  let goldV2: Contract;
  let namesV3: Contract;
  let rarity: Contract;
  let usdc: Contract;
  let wbtc: Contract;

  let deployer: SignerWithAddress;
  let user: SignerWithAddress;

  // for tests assuming 18 decimals for tokens
  const USDCPrice = parseEther("1000");

  before(async () => {
    [deployer, user] = await ethers.getSigners();

    // deploy contracts
    rarity = (await deployContract(deployer, RarityArtifact)) as Contract;
    usdc = (await deployContract(deployer, MockERC20Artifact, [
      user.address,
    ])) as Contract;

    namesV3 = (await deployContract(deployer, NamesV3Artifact, [
      rarity.address,
      usdc.address,
      USDCPrice,
    ])) as Contract;
    goldV2 = (await deployContract(deployer, GoldV2Artifact, [
      rarity.address,
      namesV3.address,
    ])) as Contract;

    // mint 3 summoners by user
    await rarity.connect(user).summon(1);
    await rarity.connect(user).summon(1);
    await rarity.connect(user).summon(1);
  });

  context("Claim Gold", () => {
    const summonerId = 0;

    before("Claim name for summoner", async () => {
      const name = "hello1";

      await usdc.connect(user).approve(namesV3.address, MaxUint256);
      await namesV3.connect(user).claim(name, summonerId);
    });

    it("should claim Gold for named summoner", async () => {
      await goldV2.connect(user).claim(summonerId);
    });

    it("should revert if summoner doesn't has name", async () => {
      await expect(goldV2.connect(user).claim(1)).to.revertedWith(
        "summoner doesn't have name"
      );
    });
  });
});
