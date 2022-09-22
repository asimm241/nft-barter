import * as dotenv from "dotenv";
dotenv.config();
import { ethers, Wallet, Contract } from "ethers";
import { readFileSync } from "fs";
import assert from "assert";

const network = process.env.NETWORK;
const infuraApiKey = process.env.INFURA_API_KEY;
const acc1Key = process.env.ACCOUNT1_PVT_KEY;
const acc2Key = process.env.ACCOUNT2_PVT_KEY;
assert(network && infuraApiKey && acc1Key && acc2Key), "envs not loaded";
const provider = new ethers.providers.JsonRpcProvider(
  `https://${process.env.NETWORK}.infura.io/v3/${process.env.INFURA_API_KEY}`
);

const registryAddress = "0x1E4878dE664ec235718A1Ee0A307E62749483158",
  exchangeAddress = "0x755f8463fA1BC7F8B7adB56b18Ac14B003e485Ba",
  atomicizerAddress = "0x8fBE0df6Deb99f320087CAff0fB47e519Ef624d0",
  erc20Address = "0x5C210a78191F6c6Ef976a03dEA7549F8D4B1718f",
  erc721Address = "0xF1CBF74dD2d432bBa5f5934aFCCAc9A554394f30";

const registryABI = readFileSync("./registryABI.json", "utf8"),
  exchangeABI = readFileSync("./exchangeABI.json", "utf8"),
  atomicizerABI = readFileSync("./atomicizerABI.json", "utf8"),
  erc20ABI = readFileSync("./erc20ABI.json", "utf8"),
  erc721ABI = readFileSync("./erc721ABI.json", "utf8");
//signers
let account1 = new Wallet(acc1Key, provider);
let account2 = new Wallet(acc2Key, provider);

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

const proxy1 = await registerProxy(account1);
console.log(`proxy for ${account1.address} is ${proxy1}`);
const proxy2 = await registerProxy(account2);
console.log(`proxy for ${account2.address} is ${proxy2}`);

let approval1 = await grantApproval(proxy1, account1, 100);
let approval2 = await grantApproval(proxy2, account2, 100);

console.log(`Approvals : account1 ${approval1} account2 ${approval2}`);
