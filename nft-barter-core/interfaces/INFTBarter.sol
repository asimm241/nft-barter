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
        address makerAddress;
        address takerAddress;
        int152 valueDifference;
        uint128 swapId;
        uint makerTokenId; 
        uint takerTokenId;
    }
    /**
    @notice make swap between nft stored for thei swapID
    @dev this methods accept an already initiated swaps with a swap id and transfer nft to each user specified in the swap.
    @param swapId The swapId agaisn which swapd has to be performed
    @param takerTokenId The token id of the taker of the swap
    @return true if the swap is successfull and false if swaps fails
     */
    function acceptSwap(uint128 swapId, uint takerTokenId) external virtual payable returns(bool);

    /**
    @notice list all the swaps for the provided tokenId
    @dev this methods returns all the swaps stored in a mapping against tgat token id, 
    @param tokenId token id of the maker/taker of the swap
    @return list of all the swaps for that token id as maker/taker
     */
    // function listSwapsForTokenId(uint tokenId) view public virtual returns(SwapOrder[] memory);


        /**
    @notice list all the swaps for the provided address
    @dev this methods returns all the swaps stored in a mapping against that address
    @param account address of the maker/taker of the swap
    @return list of all the swaps for that address as maker/taker
     */
    // function listSwapsForAddress(address account) view public virtual returns(SwapOrder[] memory);


}