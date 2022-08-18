# NFT-Barter

This project supports the functionality to swap ownership of two NFTs that do not hold equal monetary value.

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

Tests to check the functionalities provided by the contract can be executed using the following command in `nft-barter-core` directory:

    npm test
Tests are written in `test/nft-barter.js`
### nft-barter.js

- initating a swap with token ids that are to be swapped (`takerTokenId` and `makerTokenId`) along with the difference in their monetary values (`valueDifference`)
- updating the `valueDifference` in the specific swap
- updating the token ids for both participants in the specific swap.
- cancelation of a specific swap
- acceptance of a specific swap

## How NFT-Barter works

NFT-Barter provides an easy-to-use functionality for it's users to swap their NFT with someone else's contract.
### initiateFixedSwap