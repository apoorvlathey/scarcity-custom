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

// types
import { GoldV2 } from "../typechain/GoldV2";
import { NamesV3 } from "../typechain/NamesV3";
import { IERC20 } from "../typechain/IERC20";

describe("GoldV2", () => {
  let goldV2: GoldV2;
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
    goldV2 = (await deployContract(deployer, GoldV2Artifact, [
      rarity.address,
      namesV3.address,
    ])) as GoldV2;

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
      await namesV3.connect(user).claim(name, summonerId, true);
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
