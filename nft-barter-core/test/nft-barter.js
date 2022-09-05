const truffleAssert = require("truffle-assertions");
const { BN, balance } = require("@openzeppelin/test-helpers");
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
  INVALID_BALANCE_TRANSFERRED,
  checkObjectInArray,
  ERROR_SWAP_NOT_PENDING,
} = require("./test-helpers");
const nft_barter = artifacts.require("NFTBarter");

contract("NFT Barter", (accounts) => {
  const name = "Rupees";
  const symbol = "Rs";
  const valueDifference = 20000000;
  const swapId = 0,
    invalidSwapId = 100;
  const invalidTokenId = 100,
    takerTokenId = 1,
    makerTokenId = 3;
  const [takerAddress, makerAddress, address3] = accounts;
  let tokenInstance;
  let contractTracker;
  beforeEach("initializing token instance", async () => {
    tokenInstance = await nft_barter.new(name, symbol);
    contractTracker = await balance.tracker(tokenInstance.address);

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

  it("success: initiateFixedSwap", async () => {
    // Maker to Taker Swap
    const makerToTakerSwap = await tokenInstance.initiateFixedSwap(
      makerTokenId,
      takerTokenId,
      valueDifference,
      {
        from: makerAddress,
      }
    );
    const expectedSwap1 = {
      swapId: BN(1),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(
      makerToTakerSwap,
      "swap",
      expectedSwap1,
      EVENT_SWAP_INITIATED
    );

    // Taker to Maker Swap
    const takerToMakerValueDifference = -3;
    const takerToMakerSwap = await tokenInstance.initiateFixedSwap(
      makerTokenId,
      takerTokenId,
      takerToMakerValueDifference,
      {
        from: makerAddress,
        value: Math.abs(takerToMakerValueDifference),
      }
    );
    const expectedSwap2 = {
      swapId: BN(2),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(takerToMakerValueDifference),
    };

    checkDataFromEvent(
      takerToMakerSwap,
      "swap",
      expectedSwap2,
      EVENT_SWAP_INITIATED
    );
  });

  it("failure: initiateFixedSwap", async () => {
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

    // invalid balance transfer
    const negativeValueDifference = -5;
    await truffleAssert.reverts(
      tokenInstance.initiateFixedSwap.call(
        makerTokenId,
        takerTokenId,
        negativeValueDifference,
        {
          from: makerAddress,
        }
      ),
      INVALID_BALANCE_TRANSFERRED
    );
  });

  /**
   * Tests for updating Swap order
   */

  it("success: updateSwapValue", async () => {
    // positive value to negative value update
    const negativeValueDifference = -100000000000;
    const postiveToNegativeUpdate = await tokenInstance.updateSwapValue(
      swapId,
      negativeValueDifference,
      {
        from: makerAddress,
        value: Math.abs(negativeValueDifference),
      }
    );
    const expectedSwap = {
      swapId,
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(negativeValueDifference),
    };

    // checking event here
    checkDataFromEvent(
      postiveToNegativeUpdate,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );

    // check contract's balance here. It should be equal to negativeValueDifference
    let cBalance = await contractTracker.get();
    assert.equal(cBalance, Math.abs(negativeValueDifference));

    // lower to higher -ve value update
    const lowerToHigherValueDifference = -150000000000;
    const lowerToHigherNegative = await tokenInstance.updateSwapValue(
      swapId,
      lowerToHigherValueDifference,
      {
        from: makerAddress,
        value: Math.abs(lowerToHigherValueDifference - negativeValueDifference),
      }
    );
    expectedSwap.valueDifference = BN(lowerToHigherValueDifference);

    // checking event here
    checkDataFromEvent(
      lowerToHigherNegative,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );

    // check contract's balance here. It should be equal to lowerToHigherValueDifference
    cBalance = await contractTracker.get();
    assert.equal(cBalance, Math.abs(lowerToHigherValueDifference));

    // higher to lower -ve value update
    const higherToLowerValueDifference = -90000000000;
    const higherToLowerNegative = await tokenInstance.updateSwapValue(
      swapId,
      higherToLowerValueDifference,
      {
        from: makerAddress,
      }
    );

    expectedSwap.valueDifference = BN(higherToLowerValueDifference);

    // checking event here
    checkDataFromEvent(
      higherToLowerNegative,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );

    // check contract's balance here. It should be equal to lowerToHigherValueDifference
    cBalance = await contractTracker.get();
    assert.equal(cBalance, Math.abs(higherToLowerValueDifference));

    // -ve to +ve update
    const postiveValueDifference = 90000000000;
    const negativeToPositive = await tokenInstance.updateSwapValue(
      swapId,
      postiveValueDifference,
      {
        from: makerAddress,
      }
    );
    expectedSwap.valueDifference = BN(postiveValueDifference);

    // checking event here
    checkDataFromEvent(
      negativeToPositive,
      "updatedSwap",
      expectedSwap,
      EVENT_SWAP_UPDATED
    );

    // check contract's balance here. It should be equal to lowerToHigherValueDifference
    cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);
  });

  it("failure: updateSwapValue", async () => {
    // invalid swap id
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(invalidSwapId, valueDifference),
      ERROR_SWAP_NOT_PENDING
    );

    // permission denied
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(swapId, valueDifference, {
        from: address3,
      }),
      ERROR_PERMISSION_DENIED
    );

    // updating positive value to negative without transferring amount
    const negativeValueDifference = -100000000000;
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(swapId, negativeValueDifference, {
        from: makerAddress,
      }),
      INVALID_BALANCE_TRANSFERRED
    );

    // updating lower to negative value without transferring funds
    await tokenInstance.updateSwapValue(swapId, negativeValueDifference, {
      from: makerAddress,
      value: Math.abs(negativeValueDifference),
    });
    const higherNegativeValue = -200000000000;
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(swapId, higherNegativeValue, {
        from: makerAddress,
      }),
      INVALID_BALANCE_TRANSFERRED
    );
  });

  it("success: updateSwapMakerToken", async () => {
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
      swapId,
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

  it("failure: updateSwapMakerToken", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId, {
        from: makerAddress,
      }),
      ERROR_SWAP_NOT_PENDING
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

  it("success: updateSwapTakerToken", async () => {
    const differentTokenId = 2;
    await tokenInstance.mint(differentTokenId, { from: takerAddress });

    const response = await tokenInstance.updateSwapTakerToken(
      swapId,
      differentTokenId,
      { from: makerAddress }
    );
    const expectedSwap = {
      swapId,
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

  it("failure: updateSwapTakerToken", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId, {
        from: makerAddress,
      }),
      ERROR_SWAP_NOT_PENDING
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
  it("success: cancelSwap", async () => {
    // positive value difference
    let cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);
    const canceledSwap = await tokenInstance.cancelSwap(swapId, {
      from: makerAddress,
    });
    cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);

    let expectedSwap = {
      swapId,
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(canceledSwap, "swap", expectedSwap, EVENT_SWAP_CANCELED);

    // negative value difference
    const negativeValueDifference = -100000000000;
    await tokenInstance.initiateFixedSwap(
      makerTokenId,
      takerTokenId,
      negativeValueDifference,
      {
        from: makerAddress,
        value: Math.abs(negativeValueDifference),
      }
    );
    cBalance = await contractTracker.get();
    assert.equal(cBalance, Math.abs(negativeValueDifference));
    // cancelling swap
    const canceledSwap1 = await tokenInstance.cancelSwap(1, {
      from: makerAddress,
    });
    cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);

    expectedSwap.swapId = BN(1);
    expectedSwap.valueDifference = BN(negativeValueDifference);

    checkDataFromEvent(
      canceledSwap1,
      "swap",
      expectedSwap,
      EVENT_SWAP_CANCELED
    );
  });

  it("failure: cancelSwap", async () => {
    // invalid swap
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(invalidSwapId),
      ERROR_SWAP_NOT_PENDING
    );
    // permission denied
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(swapId, { from: address3 }),
      ERROR_PERMISSION_DENIED
    );
  });

  it("success: acceptSwap", async () => {
    // accepting the swap - with positive value
    let cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);
    const acceptedSwapPositiveVD = await tokenInstance.acceptSwap(
      swapId,
      takerTokenId,
      {
        from: takerAddress,
        value: valueDifference,
      }
    );
    cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);

    let expectedSwap = {
      swapId,
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };

    checkDataFromEvent(
      acceptedSwapPositiveVD,
      "swap",
      expectedSwap,
      EVENT_SWAP_ACCEPTED
    );

    // accepting the swap - with negative value
    const negativeValueDifference = -100000000000;
    await tokenInstance.initiateFixedSwap(
      takerTokenId,
      makerTokenId,
      negativeValueDifference,
      {
        from: makerAddress,
        value: Math.abs(negativeValueDifference),
      }
    );

    cBalance = await contractTracker.get();
    assert.equal(cBalance, Math.abs(negativeValueDifference));

    const acceptedSwapNegativeVD = await tokenInstance.acceptSwap(
      1,
      makerTokenId,
      {
        from: takerAddress,
      }
    );

    cBalance = await contractTracker.get();
    assert.equal(cBalance, 0);

    expectedSwap.swapId = BN(1);
    expectedSwap.valueDifference = BN(negativeValueDifference);
    expectedSwap.makerTokenId = BN(takerTokenId);
    expectedSwap.takerTokenId = BN(makerTokenId);

    checkDataFromEvent(
      acceptedSwapNegativeVD,
      "swap",
      expectedSwap,
      EVENT_SWAP_ACCEPTED
    );
  });

  it("failure: acceptSwap", async () => {
    // invalid swapId
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(invalidSwapId, takerTokenId),
      ERROR_SWAP_NOT_PENDING
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
    // insufficient balance
    await truffleAssert.reverts(
      tokenInstance.acceptSwap.call(swapId, takerTokenId, {
        from: takerAddress,
      }),
      INVALID_BALANCE_TRANSFERRED
    );
  });

  it("success: isSwapPossible", async () => {
    const isSwapPossible = await tokenInstance.isSwapPossible.call(swapId);
    assert.isTrue(isSwapPossible);

    await tokenInstance.acceptSwap(swapId, takerTokenId, {
      from: takerAddress,
      value: valueDifference,
    });

    const swapShouldNotBePossible = await tokenInstance.isSwapPossible.call(
      swapId
    );
    assert.isFalse(swapShouldNotBePossible);
  });

  it("failure: isSwapPossible", async () => {
    await truffleAssert.reverts(
      tokenInstance.isSwapPossible.call(invalidSwapId),
      ERROR_INVALID_SWAP
    );

    // stale swap
    const addr3TokenId = 5,
      swapAddr3AndMaker = 1;
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
      value: valueDifference,
    });

    const isInitialSwapPossible = await tokenInstance.isSwapPossible.call(
      swapId
    );
    assert.isFalse(isInitialSwapPossible);
  });

  it("get last on chain", async () => {
    const response = await tokenInstance.getLastOnChainSwap.call();
    const expectedSwap = {
      swapId: BN(0),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };
    checkObjectInArray(response, expectedSwap);
  });

  it("get swap by id", async () => {
    const response = await tokenInstance.getSwapBySwapId.call(swapId);
    const expectedSwap = {
      swapId: BN(0),
      makerTokenId: BN(makerTokenId),
      takerTokenId: BN(takerTokenId),
      makerAddress,
      takerAddress,
      valueDifference: BN(valueDifference),
    };
    checkObjectInArray(response, expectedSwap);
  });

  it("taker swaps", async () => {
    const response = await tokenInstance.getTakerSwaps.call(takerAddress);
    const expected = ["0"];
    assert.equal(response.length, expected.length);
    expected.forEach((expect, i) =>
      assert.equal(response[i].toString(), expect)
    );
  });

  it("maker swaps", async () => {
    const response = await tokenInstance.getMakerSwaps.call(makerAddress);
    const expected = ["0"];
    assert.equal(response.length, expected.length);
    expected.forEach((expect, i) =>
      assert.equal(response[i].toString(), expect)
    );
  });
});
