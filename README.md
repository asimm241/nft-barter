
# NFT-Barter

This project supports the functionality to swap ownership of two NFTs that may or may not hold equal monetary value. It is compatible with ERC721

The software is built with

- node 16.13.1
- npm 8.1.2
- truffle 5.5.27
- solidity 0.8.15

Additional libraries used:

- @openzeppelin/contracts 4.0.37
- @openzeppelin/test-helpers 0.5.15
- chai 4.3.6
- truffle-assertions 0.9.2

## Install

This repository contains Smart Contract code in Solidity (using
Truffle) and tests (also using Truffle).

To install, download or clone the repo, then:

    cd nft-barter-core
    npm install
    npx truffle compile

## Tests

Tests to check the functionalities provided by the contract can be executed using the following commands:

    cd nft-barter-core
    npm test
Tests are written in `test/nft-barter.js`
### nft-barter.js

- minting the NFT, compatible with ERC721
- initating a swap with token ids that are to be swapped (`takerTokenId` and `makerTokenId`) along with the difference in their monetary values (`valueDifference`)
- updating the `valueDifference` in the specific swap
- updating the token ids for both participants in the specific swap.
- cancelation of a specific swap
- acceptance of a specific swap

## How NFT-Barter works

NFT-Barter provides an easy-to-use functionality for it's users to swap their NFTs with someone else's. Users can mint their NFTs, swap their NFTs, and transfer FTs to contract. NFT-Barter keeps a ledger to maintain the balance for each address. The amount for the specified address is deducted and transferred to the other participant after the swap is successful.
**mint(uint256  tokenId)**
This function takes the `tokenId` as param. It associates the NFT id with the user that calls this function.
**initiateFixedSwap(uint256  makerTokenId,uint256  takerTokenId,int152  valueDifference)**
 - `makerTokenId` denotes to the token id that is associated with the person creating the swap (or the owner of that purticular swap)
 - `takerTokenId` refers to the token, the owner wishes to swap with
 - `valueDifference` is the difference of value between the worth of both NFTs. Negative valueDifference transfers the amount from maker to taker's account and vice versa for positive valueDifference, when taker accepts the swap. In case of zero valueDifference, no transaction will be made other than swapping the two tokens.

Criteria to execute this function:
- `makerTokenId` should be owned by the maker of this swap
- `takerTokenId` should be owned by the taker of this swap

**updateSwapValue(uint128  swapId, int152  valueDifference)**
An update function to update the `valueDifference` of the specific swap. 
Criteria to execute this function:
- Sender has to be the owner of the swap
- Swap should exist

**updateSwapMakerToken(uint128  swapId, uint256  makerTokenId)**
An update function to update the `makerTokenId` of the specific swap.
Criteria to execute this function:
- Sender has to be the owner of the swap
- Swap should exist
- Token should be minted by maker

**updateSwapTakerToken(uint128  swapId, uint256  takerTokenId)**
An update function to update the `takerTokenId` of a swap.
Criteria to execute this function:
- Sender has to be the owner of the swap
- Swap should exist
- Token should be minted by taker

**acceptSwap(uint128  swapId, uint256  takerTokenId)**
A function that ends the transaction in a successful manner. Notifying that both NFTs have been successfully swapped along with the amount stated in `valueDifference`.
Criteria to execute this function:
- Sender has to be the taker
- Swap should exist
- Token should be under taker's ownership and be a part of specified swap

`
Note: This is a payable function. It transfers the amount to taker in case of negative valueDifference. For the case of positive valueDifference, the amount is transferred from taker into maker's account.
`
**cancelSwap(uint128  swapId)**
A function that ends the transaction in cancellation. Notifying that this swap is discarded from the list of swap. No further executions will work on this purticular swap.
Criteria to execute this function:
- Sender has to be either the taker or maker of this swap
- Swap should exist

**isSwapPossible(uint128  swapId)**
This is a helper function to test if the swap is still valid or not. The swap will be stale in case, the owner of any `tokenId` associated with that purticular swap have been updated.
Criteria to execute this function:
- Swap should exist

**withdrawAmount(uint256 amount)**
This function enables the users to withdraw their amount from NFT-Barter.
Criteria to execute this function:
- The amount specified should be less than or equal to the balance
`
Note: This is a payable function. It transfers the amount to the caller and updates their balance.
`

**checkBalance()**
This function helps the users to check their balance in NFT-Barter.
