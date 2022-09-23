import { utils } from "ethers";

const eip712Domain = {
  name: "EIP712Domain",
  fields: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
};

const eip712Order = {
  Order: [
    { name: "registry", type: "address" },
    { name: "maker", type: "address" },
    { name: "staticTarget", type: "address" },
    { name: "staticSelector", type: "bytes4" },
    { name: "staticExtradata", type: "bytes" },
    { name: "maximumFill", type: "uint256" },
    { name: "listingTime", type: "uint256" },
    { name: "expirationTime", type: "uint256" },
    { name: "salt", type: "uint256" },
  ],
};
export const abiCoder = new utils.AbiCoder();
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const NULL_SIG = { v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32 };

const parseSig = (bytes) => {
  bytes = bytes.substr(2);
  const r = "0x" + bytes.slice(0, 64);
  const s = "0x" + bytes.slice(64, 128);
  const v = parseInt("0x" + bytes.slice(128, 130), 16);
  return { v, r, s };
};

const structToSign = (order, exchange) => {
  return {
    name: "Order",
    fields: eip712Order.Order,
    domain: {
      name: "Wyvern Exchange",
      version: "3.1",
      chainId: 4,
      verifyingContract: exchange,
    },
    data: order,
  };
};

export const sign = async (order, account) => {
  const str = structToSign(order, "0x755f8463fA1BC7F8B7adB56b18Ac14B003e485Ba"); //exchange address
//   console.log(str.domain, eip712Domain, order);
  const sigBytes = await account._signTypedData(str.domain, eip712Order, order);
  const sig = parseSig(sigBytes);
    return sig
};

/**
 * exchange wrapper
 * https://github.com/wyvernprotocol/wyvern-v3/blob/master/test/util.js#L99
 */
export const wrap = (inst) => {
    var obj = {
      inst: inst,
      hashOrder: (order) => inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
      hashToSign: (order) => {
        return inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt).then(hash => {
          return inst.hashToSign_.call(hash)
        })
      },
      validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
      validateOrderAuthorization: (hash, maker, sig, misc) => inst.validateOrderAuthorization_.call(hash, maker, web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''), misc),
      approveOrderHash: (hash) => inst.approveOrderHash_(hash),
      approveOrder: (order, inclusion, misc) => inst.approveOrder_(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt, inclusion, misc),
      setOrderFill: (order, fill) => inst.setOrderFill_(hashOrder(order), fill),
      atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch_(
        [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
          counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
        [order.staticSelector, counterorder.staticSelector],
        order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
        [call.howToCall, countercall.howToCall],
        metadata,
        abiCoder.encode(['bytes', 'bytes'], [
            abiCoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
            abiCoder.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
        ])
      ),
      atomicMatchWith: (order, sig, call, counterorder, countersig, countercall, metadata, misc) => inst.atomicMatch_(
        [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
          counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
        [order.staticSelector, counterorder.staticSelector],
        order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
        [call.howToCall, countercall.howToCall],
        metadata,
        abiCoder.encode(['bytes', 'bytes'], [
            abiCoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
            abiCoder.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
        ]),
        misc
      )
    }
    obj.sign = (order, account) => {
      const str = structToSign(order, inst.address)
      return web3.signTypedData(account, {
        types: {
          EIP712Domain: eip712Domain.fields,
          Order: eip712Order.fields
        },
        domain: str.domain,
        primaryType: 'Order',
        message: order
      }).then(sigBytes => {
        console.log("signedTypedData -> sigBytes", sigBytes)
        const sig = parseSig(sigBytes)
        return sig
      })
    }
    obj.personalSign = (order, account) => {
      const calculatedHashToSign = hashToSign(order, inst.address)
      return web3.eth.sign(calculatedHashToSign, account).then(sigBytes => {
        let sig = parseSig(sigBytes)
        sig.v += 27
        sig.suffix = '03' // EthSign suffix like 0xProtocol
        return sig
      })
    }
    return obj
  }