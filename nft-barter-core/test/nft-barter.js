const truffleAssert = require("truffle-assertions");
const { BN, expectEvent } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const {
  checkDataFromEvent,
  ERROR_PERMISSION_DENIED,
  ERROR_INVALID_SWAP,
  ERROR_INVALID_TOKEN_ID,
  EVENT_SWAP_INITIATED,
  EVENT_SWAP_UPDATED,
  EVENT_SWAP_CANCELED,
} = require("./test-helpers");
const nft_barter = artifacts.require("NftBarter");

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

    // failure case:
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
    // success case:
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

    // failure case:
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(invalidSwapId, valueDifference),
      ERROR_PERMISSION_DENIED
    );
  });

  it("updateSwapMakerToken", async () => {
    // success case:
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

    // failure case:
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId, {
        from: makerAddress,
      }),
      ERROR_PERMISSION_DENIED
    );
  });

  it.skip("updateSwapTakerToken", async () => {
    // success case:
    const response = await tokenInstance.updateSwapTakerToken.call(
      swapId,
      takerTokenId,
      { from: makerAddress }
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
    // assert.equal(response.swapId, swapId);
    // assert.equal(response.takerTokenId, takerTokenId);

    // failure case:
    // invalid swap id
    await truffleAssert.reverts(
      tokenInstance.updateSwapTakerToken.call(invalidSwapId, takerTokenId),
      ERROR_INVALID_SWAP_ID
    );
    // invalid token id
    await truffleAssert.reverts(
      tokenInstance.updateSwapTakerToken.call(swapId, invalidTokenId),
      ERROR_INVALID_TOKEN_ID
    );
  });

  /**
   * Tests for Swap actions
   */
  it("cancelSwap", async () => {
    // success case:
    const response = await tokenInstance.cancelSwap.call(swapId, {
      from: makerAddress,
    });
    assert.isTrue(response);

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

    checkDataFromEvent(
      canceledSwap,
      "canceledSwap",
      expectedSwap,
      EVENT_SWAP_CANCELED
    );

    // failure case:
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(invalidSwapId),
      ERROR_PERMISSION_DENIED
    );
  });

  it.skip("acceptSwap", async () => {
    // success case:
    const response = await tokenInstance.acceptSwap.call(swapId, takerTokenId);
    assert.isTrue(response);

    // failure case:
    // invalid swapId
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(invalidSwapId, takerTokenId),
      ERROR_INVALID_SWAP_ID
    );
    // invalid takerTokenId
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(swapId, invalidTokenId),
      ERROR_INVALID_TOKEN_ID
    );
  });
});
