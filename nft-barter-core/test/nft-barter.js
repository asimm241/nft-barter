const truffleAssert = require("truffle-assertions");
const { BN } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const {
  checkDataFromEvent,
  ERROR_PERMISSION_DENIED,
  ERROR_INVALID_SWAP,
  ERROR_INVALID_TOKEN_ID,
  EVENT_SWAP_INITIATED,
  EVENT_SWAP_UPDATED,
  EVENT_SWAP_CANCELED,
  EVENT_SWAP_ACCEPTED,
} = require("./test-helpers");
const nft_barter = artifacts.require("NFTBarter");

contract("NFT Barter", (accounts) => {
  const name = "Rupees";
  const symbol = "Rs";
  const valueDifference = 2;
  const swapId = 1,
    invalidSwapId = 100;
  const invalidTokenId = 100,
    takerTokenId = 1,
    makerTokenId = 3;
  const [takerAddress, makerAddress, address3] = accounts;
  let tokenInstance;
  beforeEach("initializing token instance", async () => {
    tokenInstance = await nft_barter.new(name, symbol);

    // minting token id for maker address
    await tokenInstance.mint(makerTokenId, {
      from: makerAddress,
    });

    // minting token id for taker address
    await tokenInstance.mint(takerTokenId, {
      from: takerAddress,
    });

    // initiate a fixed swap
    await tokenInstance.initiateFixedSwap(
      makerTokenId,
      takerTokenId,
      valueDifference,
      {
        from: makerAddress,
      }
    );
  });

  it("Testing if name & symbol are correct", async () => {
    const _name = await tokenInstance.name.call();
    const _symbol = await tokenInstance.symbol.call();
    assert.equal(name, _name);
    assert.equal(symbol, _symbol);
  });

  it("initiateFixedSwap", async () => {
    const response = await tokenInstance.initiateFixedSwap(
      makerTokenId,
      takerTokenId,
      valueDifference,
      {
        from: makerAddress,
      }
    );
    const expectedSwap = {
      swapId: BN(2),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(response, "swap", expectedSwap, EVENT_SWAP_INITIATED);
  });

  it("initiateFixedSwap - failure cases", async () => {
    // invalid token id
    await truffleAssert.reverts(
      tokenInstance.initiateFixedSwap.call(
        makerTokenId,
        invalidTokenId,
        valueDifference
      ),
      ERROR_INVALID_TOKEN_ID
    );

    // access denied
    await truffleAssert.reverts(
      tokenInstance.initiateFixedSwap.call(
        makerTokenId,
        takerTokenId,
        valueDifference,
        {
          from: address3,
        }
      ),
      ERROR_PERMISSION_DENIED
    );

    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.initiateFixedSwap.call(
        makerTokenId,
        takerTokenId,
        valueDifference,
        {
          from: takerAddress,
        }
      ),
      ERROR_INVALID_SWAP
    );
  });

  /**
   * Tests for updating Swap order
   */

  it("updateSwapValue", async () => {
    const valueDifference = 10;
    const response = await tokenInstance.updateSwapValue(
      swapId,
      valueDifference,
      {
        from: makerAddress,
      }
    );
    const expectedSwap = {
      swapId: BN(1),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(
      response,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );
  });

  it("updateSwapValue - failure cases", async () => {
    // invalid swap id
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(invalidSwapId, valueDifference),
      ERROR_INVALID_SWAP
    );

    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(swapId, valueDifference, {
        from: address3,
      }),
      ERROR_PERMISSION_DENIED
    );
  });

  it("updateSwapMakerToken", async () => {
    const differentMakerTokenId = 10;
    // minting different token with maker
    await tokenInstance.mint(differentMakerTokenId, {
      from: makerAddress,
    });
    const response = await tokenInstance.updateSwapMakerToken(
      swapId,
      differentMakerTokenId,
      {
        from: makerAddress,
      }
    );
    const expectedSwap = {
      swapId: BN(1),
      makerTokenId: BN(differentMakerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(
      response,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );
  });

  it("updateSwapMakerToken - failure cases", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId, {
        from: makerAddress,
      }),
      ERROR_INVALID_SWAP
    );

    // invalid token id
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(swapId, invalidTokenId, {
        from: makerAddress,
      }),
      ERROR_INVALID_TOKEN_ID
    );

    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(swapId, makerTokenId, {
        from: address3,
      }),
      ERROR_PERMISSION_DENIED
    );
  });

  it("updateSwapTakerToken", async () => {
    const differentTokenId = 2;
    await tokenInstance.mint(differentTokenId, { from: takerAddress });

    const response = await tokenInstance.updateSwapTakerToken(
      swapId,
      differentTokenId,
      { from: makerAddress }
    );
    const expectedSwap = {
      swapId: BN(1),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(differentTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(
      response,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );
  });

  it("updateSwapTakerToken - failue cases", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId, {
        from: makerAddress,
      }),
      ERROR_INVALID_SWAP
    );

    // invalid token id
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(swapId, invalidTokenId, {
        from: makerAddress,
      }),
      ERROR_INVALID_TOKEN_ID
    );

    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(swapId, makerTokenId, {
        from: address3,
      }),
      ERROR_PERMISSION_DENIED
    );
  });

  /**
   * Tests for Swap actions
   */
  it("cancelSwap", async () => {
    const canceledSwap = await tokenInstance.cancelSwap(swapId, {
      from: makerAddress,
    });

    const expectedSwap = {
      swapId: BN(1),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(canceledSwap, "swap", expectedSwap, EVENT_SWAP_CANCELED);
  });

  it("cancelSwap - failure cases", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(invalidSwapId),
      ERROR_INVALID_SWAP
    );
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(swapId, { from: address3 }),
      ERROR_PERMISSION_DENIED
    );
  });

  it("acceptSwap", async () => {
    const acceptedSwap = await tokenInstance.acceptSwap(swapId, takerTokenId, {
      from: takerAddress,
    });

    const expectedSwap = {
      swapId: BN(1),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(acceptedSwap, "swap", expectedSwap, EVENT_SWAP_ACCEPTED);
  });

  it("acceptSwap - failure cases", async () => {
    // invalid swapId
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(invalidSwapId, takerTokenId),
      ERROR_INVALID_SWAP
    );
    // invalid takerTokenId
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(swapId, invalidTokenId),
      ERROR_INVALID_TOKEN_ID
    );
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(swapId, takerTokenId, { from: address3 }),
      ERROR_PERMISSION_DENIED
    );
  });

  it("isSwapPossible", async () => {
    const isSwapPossible = await tokenInstance.isSwapPossible.call(swapId);
    assert.isTrue(isSwapPossible);

    await tokenInstance.acceptSwap(swapId, takerTokenId, {
      from: takerAddress,
    });

    const swapShouldNotBePossible = await tokenInstance.isSwapPossible.call(
      swapId
    );
    assert.isFalse(swapShouldNotBePossible);
  });

  it("isSwapPossible - failure cases", async () => {
    await truffleAssert.reverts(
      tokenInstance.isSwapPossible.call(invalidSwapId),
      ERROR_INVALID_SWAP
    );

    // stale swap
    const addr3TokenId = 5,
      swapAddr3AndMaker = 2;
    // minting another token id
    await tokenInstance.mint(addr3TokenId, {
      from: address3,
    });
    // initiating another swap with makerToken and addr3TokenId
    await tokenInstance.initiateFixedSwap(
      makerTokenId,
      addr3TokenId,
      valueDifference,
      {
        from: makerAddress,
      }
    );
    // accepting the swap to invalidate the first swap
    await tokenInstance.acceptSwap(swapAddr3AndMaker, addr3TokenId, {
      from: address3,
    });

    const isInitialSwapPossible = await tokenInstance.isSwapPossible.call(
      swapId
    );
    assert.isFalse(isInitialSwapPossible);
  });
});
