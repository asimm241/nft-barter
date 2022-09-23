import * as dotenv from "dotenv";
dotenv.config();
import { ethers, Wallet, Contract, utils } from "ethers";
import { readFileSync } from "fs";
import assert from "assert";
import { sign, wrap, abiCoder, NULL_SIG, ZERO_BYTES32 } from "./util.js";

const network = process.env.NETWORK;
const infuraApiKey = process.env.INFURA_API_KEY;
const acc1Key = process.env.ACCOUNT1_PVT_KEY;
const acc2Key = process.env.ACCOUNT2_PVT_KEY;
assert(network && infuraApiKey && acc1Key && acc2Key), "envs not loaded";
const provider = new ethers.providers.JsonRpcProvider(
  `https://${process.env.NETWORK}.infura.io/v3/${process.env.INFURA_API_KEY}`
);

const registryAddress = "0x1E4878dE664ec235718A1Ee0A307E62749483158";
const exchangeAddress = "0x755f8463fA1BC7F8B7adB56b18Ac14B003e485Ba";
const atomicizerAddress = "0x8fBE0df6Deb99f320087CAff0fB47e519Ef624d0";
const wyvernStaticAddress = "0x71c743aBbeF58dF357F31Ba98b04F5AF4936F87a";
const erc20Address = "0x5C210a78191F6c6Ef976a03dEA7549F8D4B1718f";
const erc721Address = "0xF1CBF74dD2d432bBa5f5934aFCCAc9A554394f30";

const registryABI = readFileSync("./registryABI.json", "utf8");
const exchangeABI = readFileSync("./exchangeABI.json", "utf8");
const atomicizerABI = readFileSync("./atomicizerABI.json", "utf8");
const wyvernStaticABI = readFileSync("./wyvernStaticABI.json", "utf-8");
const erc20ABI = readFileSync("./erc20ABI.json", "utf8");
const erc721ABI = readFileSync("./erc721ABI.json", "utf8");
//signers
let account1 = new Wallet(acc1Key, provider); //0xe7968D5282dE8f95ED2CE011Fce07F4FC1873466
let account2 = new Wallet(acc2Key, provider); //0xD1105bdE31fcc3d20d57f25A88669B8C2CD503cf

function getWrappedExchangeWithSigner(account) {
  let exchange = new Contract(exchangeAddress,  exchangeABI, account);
  return wrap(exchange)     
}

async function registerProxy(account) {
  const registry = new Contract(registryAddress, registryABI, account);
  let p = await registry.proxies(account.address);
  if (p) {
    return p;
  } // already registered
  await registry.registerProxy();
  let proxy = await registry.proxies(account.address);
  if (proxy.length < 0) throw "failed to register proxy";
  return proxy;
}

async function grantApproval(proxy, account, ftAmount = 50) {
  const erc20c = new Contract(erc20Address, erc20ABI, account);
  const erc721c = new Contract(erc721Address, erc721ABI, account);

  const allowance = await erc20c.allowance(account.address, proxy);
  console.log(`allowanced by ${account.address} is ${allowance}`);
  if (allowance < ftAmount) {
    const isApproved = await erc20c.approve(proxy, ftAmount);
    if (!isApproved) {
      throw "failed to approve fts";
    }
  }
  let isApprovedForAll = await erc721c.isApprovedForAll(account.address, proxy);
  if (isApprovedForAll) {
    return "Approved";
  }
  const isnftsApproved = await erc721c.setApprovalForAll(proxy, true);
  if (!isnftsApproved) {
    throw "failed to approve nfts";
  }

  return "Approved";
}

// const proxy1 = await registerProxy(account1);
// console.log(`proxy for ${account1.address} is ${proxy1}`);
// const proxy2 = await registerProxy(account2);
// console.log(`proxy for ${account2.address} is ${proxy2}`);

// let approval1 = await grantApproval(proxy1, account1, 100);
// let approval2 = await grantApproval(proxy2, account2, 100);

// console.log(`Approvals : account1 ${approval1} account2 ${approval2}`);

async function swapNfts(nfts) {
  assert(nfts.length == 2, "invalid nfts ids to swap");
  //   const atomicizerc = new Contract(atomicizerAddress, atomicizerABI);
  //   const erc20c = new Contract(erc20Address, erc20ABI);
  const erc721c = new Contract(erc721Address, erc721ABI, provider);
  const registry = new Contract(registryAddress, registryABI);
  const statici = new Contract(wyvernStaticAddress, wyvernStaticABI);


  const iface = new utils.Interface(wyvernStaticABI);
  const selector = iface.getSighash(
    "swapOneForOneERC721Decoding(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
  );

  const paramsOne = abiCoder.encode(["address[2]", "uint256[2]"],[[erc721Address, erc721Address],[nfts[0], nfts[1]]]);
  const paramsTwo = abiCoder.encode(["address[2]", "uint256[2]"],[[erc721Address, erc721Address],[nfts[1], nfts[0]]]);

  const one = {
    registry: registryAddress,
    maker: account1.address,
    staticTarget: statici.address,
    staticSelector: selector,
    staticExtradata: paramsOne,
    maximumFill: "1",
    listingTime: "0",
    expirationTime: "10000000000",
    salt: "333123",
  };
  const two = {
    registry: registryAddress,
    maker: account2.address,
    staticTarget: statici.address,
    staticSelector: selector,
    staticExtradata: paramsTwo,
    maximumFill: "1",
    listingTime: "0",
    expirationTime: "10000000000",
    salt: "123344",
  };
  const ifaceErc721 = new utils.Interface(erc721ABI);
  const firstData = ifaceErc721.encodeFunctionData("transferFrom", [account1.address, account2.address, nfts[0]]);
  const secondData = ifaceErc721.encodeFunctionData("transferFrom", [account2.address, account1.address, nfts[1]]);

  /**
   * 0 denotes it will be CALL
   * 1 denotes it will be a DelegateCALL
   * for multiple assets we use DelegateCALL
   * https://github.com/wyvernprotocol/wyvern-v3/blob/master/contracts/registry/AuthenticatedProxy.sol#L32
   */
  const firstCall = { target: erc721Address, howToCall: 0, data: firstData };
  const secondCall = { target: erc721Address, howToCall: 0, data: secondData };
  const sigOne = await sign(one, account1);
  const sigTwo = await sign(two, account2);
  const exchange = getWrappedExchangeWithSigner(account2);
  try { 
    const response = await exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32)
    const MinedTx = await response.wait()
  } catch (error) {
    console.log(`Swap Failed",
    reason: ${error.reason} 
    errorCode: ${error.code}`)
    return 
  }
  
  const owner1 = await erc721c.ownerOf(nfts[0]);
  const owner2 = await erc721c.ownerOf(nfts[1]);

  if (owner1 == account2.address && owner2 == account1.address) {
  console.log("success")
  return
  } else {
    console.log("Swap Failed")
    }

}

const nfts = [27, 47];
swapNfts(nfts);
