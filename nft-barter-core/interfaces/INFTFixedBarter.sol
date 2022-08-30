// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./INFTBarter.sol";

/**
@title an interface for swaping NFTs
@author Asim Mehmood
@notice This interface declares how a user can swap with a fixed NFT
@dev this contains functions needed to swap an NFT within a collection, It uses all the methods from INFTBarter.sol
 */
abstract contract INFTFixedBarter is INFTBarter {
    /**
    @notice It starts the process of swap between two fixed NFTs
    @dev this initiates the swap for two fixed NFTs , it creates an entry in the maps for swap list , with token id's and address 
    @param makerTokenId token id of maker of this swap
    @param takerTokenId token id of the taker of this swap
    @param valueDifference the value that the maker is willing to pay/receive for this swap, 0 means there is nothign to pay, postive value means maker wants to pay that much, negative value means maker want to recieve that much
     */
    function initiateFixedSwap(uint makerTokenId, uint takerTokenId, int152 valueDifference) payable external virtual returns(SwapOrder memory);

    /**
    @notice updates the difference value of a swap
    @param swapId swapId for swap to modify
    @param valueDifference new value for this swap
     */
    function updateSwapValue(uint128 swapId, int152 valueDifference) external payable virtual returns(SwapOrder memory);

    /**
    @notice updates the nft for maker of the swap
    @param swapId swapId for swap to modify
    @param makerTokenId new tokenId of the maker
     */
    function updateSwapMakerToken(uint128 swapId, uint makerTokenId) external virtual returns(SwapOrder memory);

    // /**
    // @notice updates the taker nft token
    // @param swapId swapId for swap to modify
    // @param takerTokenId new tokenId for the swap
    //  */
    function updateSwapTakerToken(uint128 swapId, uint takerTokenId) external virtual returns(SwapOrder memory);

    /**
    @notice cancels a swap if initiated
    @dev removes the swapId from maping , this can only be done by the account of the maker of the swap
    @param swapId swapId of the swap to be canceled
    @return true of swap is canceled , false if swap could not be canceled for some reason
     */
    function cancelSwap(uint128 swapId) external payable virtual returns(SwapOrder memory);
}