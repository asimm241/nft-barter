const truffleAssert = require("truffle-assertions");
const nft_barter = artifacts.require("NftBarter");

const ERROR_INVALID_TOKEN_ID = "Invalid token ID provided!";
const ERROR_INVALID_SWAP_ID = "Invalid swap ID provided!";
const ERROR_INVALID_ADDRESS = "Invalid account provided!";

contract("NFT Barter", (accounts) => {
  const name = "Rupees";
  const symbol = "Rs";
  const swapId = 1,
    invalidSwapId = 100;
  const invalidTokenId = 100,
    takerTokenId = 1,
    makerTokenId = 3;
  const [userAddress] = accounts,
    zero_address = "0x0000000000000000000000000000000000000000";
  let tokenInstance;
  beforeEach("initializing token instance", async () => {
    tokenInstance = await nft_barter.new(name, symbol);
  });

  it("Testing if name & symbol are correct", async () => {
    const _name = await tokenInstance.name.call();
    const _symbol = await tokenInstance.symbol.call();
    assert.equal(name, _name);
    assert.equal(symbol, _symbol);
  });

  it("initiateFixedSwap", async () => {
    const valueDifference = 2;

    // success case:
    const response = await tokenInstance.initiateFixedSwap.call(
      makerTokenId,
      takerTokenId,
      valueDifference
    );
    assert.equal(response.takerTokenId, takerTokenId);
    assert.equal(response.makerTokenId, makerTokenId);
    assert.equal(response.valueDifference, valueDifference);

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
  });

  /**
   * Tests for updating Swap order
   */

  it("updateSwapValue", async () => {
    // success case:
    const valueDifference = 2;
    const response = await tokenInstance.updateSwapValue.call(
      swapId,
      valueDifference
    );
    assert.equal(response.swapId, swapId);
    assert.equal(response.valueDifference, valueDifference);

    // failure case:
    // invalid swap id
    await truffleAssert.reverts(
      tokenInstance.updateSwapValue.call(invalidSwapId, valueDifference),
      ERROR_INVALID_SWAP_ID
    );
  });

  it("updateSwapMakerToken", async () => {
    // success case:
    const response = await tokenInstance.updateSwapMakerToken.call(
      swapId,
      makerTokenId
    );
    assert.equal(response.swapId, swapId);
    assert.equal(response.makerTokenId, makerTokenId);

    // failure case:
    // invalid swap id
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(invalidSwapId, makerTokenId),
      ERROR_INVALID_SWAP_ID
    );
    // invalid token id
    await truffleAssert.reverts(
      tokenInstance.updateSwapMakerToken.call(swapId, invalidTokenId),
      ERROR_INVALID_TOKEN_ID
    );
  });

  it("updateSwapTakerToken", async () => {
    // success case:
    const response = await tokenInstance.updateSwapTakerToken.call(
      swapId,
      takerTokenId
    );
    assert.equal(response.swapId, swapId);
    assert.equal(response.takerTokenId, takerTokenId);

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
    const response = await tokenInstance.cancelSwap.call(swapId);
    assert.isTrue(response);

    // failure case:
    // invalid swapId
    await truffleAssert.reverts(
      tokenInstance.cancelSwap.call(invalidSwapId),
      ERROR_INVALID_SWAP_ID
    );
  });

  it("acceptSwap", async () => {
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

  /**
   * Reading swap lists
   */
  it("listSwapsForTokenId", async () => {
    // success case:
    const response = await tokenInstance.listSwapsForTokenId.call(takerTokenId);
    assert.equal(response.length, 2);
    assert.equal(response[0].takerTokenId, takerTokenId);
    assert.equal(response[1].takerTokenId, takerTokenId);

    // failure case:
    await truffleAssert.reverts(
      tokenInstance.listSwapsForTokenId.call(invalidTokenId),
      ERROR_INVALID_TOKEN_ID
    );
  });

  it("listSwapsForAddress", async () => {
    // success case:
    const response = await tokenInstance.listSwapsForAddress.call(userAddress);
    assert.equal(response.length, 2);
    assert.equal(response[0].makerAddress, userAddress);
    assert.equal(response[1].takerAddress, userAddress);

    // failure case:
    await truffleAssert.reverts(
      tokenInstance.listSwapsForAddress.call(zero_address),
      ERROR_INVALID_ADDRESS
    );
  });
});
