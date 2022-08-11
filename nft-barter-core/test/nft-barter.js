const nft_barter = artifacts.require("NftBarter");

contract("NFT Barter", (accounts) => {
  const name = "Rupees";
  const symbol = "Rs";
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
});
