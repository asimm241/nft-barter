# Preamble

Title: nft-barter Proposal document 

## Simple Summary

A standardized way to swap an NFT  with exchanging value in native or erc20 tokens.

1. Swap NFT of the same collection (contract) and chain and transfer native tokens to pay the difference
2. Swap NFT of different collections but the same chain and transfer native tokens to pay the difference
3. Swap NFT of different collections and different chains (EVM compatible) and transfer erc20 or native tokens to pay the difference

## Abstract 
This standard allows contracts, such as NFTs that support [ERC-721](https://eips.ethereum.org/EIPS/eip-721) and [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) interfaces to swap erc721 tokens and pay the difference of value in native or erc20 token. To initiate a Barter there are two ways 
1. Make a swap request directly to another address 
2. Create signed orders in the book and match order 
The swap-pay implementation should be independent of transferFrom(). Although it can use transferFrom().
UserA, an nft holder should be able to set his nft for swapping. We can call this swapActiveList.
UserB, an nft holder can create a swap request with another nft out of swapActiveList. We can call this user maker since he creates the request. We can keep all the swap requests in swapRequestList
UserA, can see the swapRequestList and execute a request if he wishes to so userA becomes a taker since he fulfills the order.
ExchangeValue parameter should denote the value to be exchanged along with the swap. An exchange value of 0 means the offerer wants to swap the tokens without any value transfer. A positive exchange value means the offerer is offering some funds in the addition to the offered token, whereas a negative exchange value means the offerer is requesting funds in part of the deal. (If a positive value is given, the exact amount of funds must have been sent with the transaction.)
On executing the order the required nfts should be transferred to each other along with exchange value in native or erc20 token.
Taker should also be able to cancel the offer which should remove the offer from swapRequestList.

## Motivation
This idea is a widespread use case of trading / exchanging goods in both virtual and real world

#### Real world example: 
You have an iphone13 and you decide to switch to android,
  1. You put up your iphone available for exchange with samsung on an online marketplace where you also find someone having a samsung s20 willing to swap with iphone.
  2. To be noted in this case your iphone has more monetary value than the other party's samsung 20 thus along with the swap you would also want to receive money with it that both parties agree upon. 
  3. NFT swap and pay-receive should be able to perform this kind of deal for NFT in a non custodial way.

#### Virtual example:

In gaming items buy / sell / trade is very common too. Dmarket is one of the markets for this purpose. Here is a video explaining the same use case for game skins. [Link](https://www.youtube.com/watch?v=F45Ni6x9q0k)

## Reference 

* [NFTrade](https://nftrade.com/swaps) is website that allows nft swaps.

* 0x protocol NFT swap standard
0x is an open-source, decentralized exchange infrastructure that enables the exchange of tokenized assets on multiple blockchains.
They have launched an nft swap standard on polygon as per below blog [post](https://bitcoinist.com/ethereum-ox-deploys-nft-swap-standard-on-polygon/).

## Implementation
As in the real world this would be a 3 step procedure.

  1. Initiate 
  2. Offer
  3. Accept

Let's say Alex wants to swap an NFT, it can be done in two ways.
 1. Swap with a fixed NFT
 2. Swap with any NFT 
### Case 1: 
Alex **Initiates** the swap and **Offer** an NFT. The will be saved in contract state. Bob sees his NFT listed as swap with two options
i) Accept ii) Reject. If Bob **Accept** the swap the NFTs will be swapped. 
Bob can also reject the swap. In that case NFT swap will be reset. So, Alex will have to reinitiate the swap if he wants to.  Alex can also cancel the swap 
anytime before the reject and accept.
<p align = "center">This diagram explains swap for a fixed nft
  
<img src = "/diagrams/fixed-nft/sequence.svg" alt = "sequence diagram for a fixed nft swap">
</p>



NFT barter main contract will implement these interfaces to handle case 1

**NFT Barter base interface**
```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
@title an interface for swaping nfts
@author Asim Mehmood
@notice the contract enable users to swap their nft any other nft
@dev It descriebe the signature to accept swaps given its swap id  and list all the swaps for token id
 */
abstract contract INFTBarter {
    /**
    @title swap order 
    @notice A struct containing information needed for a swap
     */
    struct SwapOrder{
        uint swapId;
        uint makerTokenId; 
        uint takerTokenId;
        address makerAddress;
        address takerAddress;
        int256 valueDifference;
    }
    /**
    @notice make swap between nft stored for thei swapID
    @dev this methods accept an already initiated swaps with a swap id and transfer nft to each user specified in the swap.
    @param swapId The swapId agaisn which swapd has to be performed
    @param takerTokenId The token id of the taker of the swap
    @return true if the swap is successfull and false if swaps fails
     */
    function acceptSwap(uint swapId, uint takerTokenId) external virtual returns(bool);

    /**
    @notice list all the swaps for the provided tokenId
    @dev this methods returns all the swaps stored in a mapping against tgat token id, 
    @param tokenId token id of the maker/taker of the swap
    @return list of all the swaps for that token id as maker/taker
     */
    function listSwapsForTokenId(uint tokenId) view public virtual returns(SwapOrder[] memory);


        /**
    @notice list all the swaps for the provided address
    @dev this methods returns all the swaps stored in a mapping against that address
    @param account address of the maker/taker of the swap
    @return list of all the swaps for that address as maker/taker
     */
    function listSwapsForAddress(address account) view public virtual returns(SwapOrder[] memory);


}
```
**NFT barter interface for fixed nft swap**

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./INFTBarter.sol";

/**
@title an interface for swaping nfts
@author Asim Mehmood
@notice This interface declares how a user can swap with a fixed NFT
@dev this contains functions needed to swap an nft within a collection, It uses all the methods from INFTBarter.sol
 */
abstract contract INFTFixedBarter is INFTBarter {
    /**
    @notice the started the process of swap between two fixed nfts
    @dev this initiates the swap for two fixed nfts , it creates an entry in the maps for swap list , with token id's and address 
    @param makerTokenId token id of maker of this swap
    @param takerTokenId token id of the taker of this swap
    @param valueDifference the value that the maker is willing to pay/receive for this swap 0 means there is nothign to pay, postive value means maker wants to pay that much, negative value means maker want to recieve that much
     */
    function initiateFixedSwap(uint makerTokenId, uint takerTokenId, int256 valueDifference) external virtual returns(SwapOrder memory);

    /**
    @notice updates the difference value of a swap
    @param swapId swapId for swap to modify
    @param valueDifference new value for this swap
     */
    function updateSwapValue(uint swapId, int256 valueDifference) external virtual returns(SwapOrder memory);

    /**
    @notice updates the nft for maker of the swap
    @param swapId swapId for swap to modify
    @param makerTokenId new tokenId of the maker
     */
    function updateSwapMakerToken(uint swapId, uint makerTokenId) external virtual returns(SwapOrder memory);

    /**
    @notice updates the taker nft token
    @param swapId swapId for swap to modify
    @param takerTokenId new tokenId for the swap
     */
    function updateSwapTakerToken(uint swapId, uint takerTokenId) external virtual returns(SwapOrder memory);

    /**
    @notice cancels a swap if initiated
    @dev removes the swapId from maping , this can only be done by the account of the maker of the swap
    @param swapId swapId of the swap to be canceled
    @return true of swap is canceled , false if swap could not be canceled for some reason
     */
    function cancelSwap(uint swapId) external virtual returns(bool);
}
```



### Case 2:
Alex puts his nft to swap by **Initiating**. Multiple persons see Alex's swap listed, they can **Offer** the exchange with their on NFTs.  Alex **Accept** any NFT and nft will be swapped. Alex can also cancel his swap anytime before the transfer. 

<p align = "center">This diagram explains swap for an arbitrary nft
  
<img src = "/diagrams/arbitrary-nft/sequence.svg" alt = "sequence diagram for an arbitrary nft swap">
</p>

