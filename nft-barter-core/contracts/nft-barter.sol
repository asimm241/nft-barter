// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/INFTFixedBarter.sol";

contract NFTBarter is ERC721, INFTFixedBarter {

  string private constant INVALID_TOKEN_ID = "1000: invalid token id";
  string private constant PERMISSION_DENIED = "1001: permission denied";
  string private constant INVALID_SWAP = "1002: invalid swap";
  string private constant USELESS_SWAP = "1003: useless swap";//swap is not useble anymore some informatino in the swap is probably changed like ownership


  //TODO optimize swaps mapping, use only one of them if possible

  //mapping based on swapId 
  mapping(uint128 => SwapOrder) private _swaps;

  //mapping token ids to Swap Orders for both makers and takers
  // mapping(uint => SwapOrder) private _swapsForToken; 

  //mapping based on address to swaps
  // mapping (address => SwapOrder) private _swapsForAccount;

  //swapId generator
  uint128 private _swapCounter;
  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

  //modifiers

  modifier onlyIfMakerIsOwner(uint newMakerTokenId){
    require(ERC721._exists(newMakerTokenId), INVALID_TOKEN_ID);
    require(ERC721.ownerOf(newMakerTokenId) == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfValidSwap(uint makerTokenId, uint takerTokenId ){
    require(ERC721._exists(makerTokenId), INVALID_TOKEN_ID);
    require(ERC721._exists(takerTokenId), INVALID_TOKEN_ID);
    require(ERC721.ownerOf(takerTokenId)!= msg.sender, INVALID_SWAP);
    require(ERC721.ownerOf(makerTokenId) == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfSwapOwner(uint128 swapId){
    SwapOrder memory swap = _swaps[swapId];
    require(swap.makerAddress == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfSwapExists(uint128 swapId){
    SwapOrder memory swap = _swaps[swapId];
    _;
  }

  modifier onlyIfTaker(uint128 swapId){
     SwapOrder memory swap = _swaps[swapId];
    require(swap.takerAddress == msg.sender, PERMISSION_DENIED);
    _;
  }

  //events
  event SwapInitiated(SwapOrder swap);
  event SwapUpdate(bytes20 updateProperty, SwapOrder updatedSwap);
  event SwapCanceled(SwapOrder swap);
  event SwapAccepted(SwapOrder swap);

  //implementation 
  function initiateFixedSwap(uint makerTokenId, uint takerTokenId, int152 valueDifference) external override onlyIfValidSwap(makerTokenId, takerTokenId) returns(SwapOrder memory){
    address takerAddress = ERC721.ownerOf(takerTokenId);

    SwapOrder memory swap = SwapOrder(msg.sender, takerAddress, valueDifference, _getNextId(),makerTokenId, takerTokenId);
    _updateSwapsData(swap);

    emit SwapInitiated(swap);

    return swap;
  }

  function updateSwapValue(uint128 swapId, int152 valueDifference) external override onlyIfSwapOwner(swapId) returns(SwapOrder memory){
    SwapOrder memory swap = _swaps[swapId];
    swap.valueDifference = valueDifference;

    _updateSwapsData(swap);

    emit SwapUpdate("ValueUpdate", swap);
    return swap;
  }

  function updateSwapMakerToken(uint128 swapId, uint makerTokenId) external override onlyIfSwapOwner(swapId) onlyIfMakerIsOwner(makerTokenId) returns(SwapOrder memory){

    SwapOrder memory swap = _swaps[swapId];
    swap.makerTokenId = makerTokenId;
    _updateSwapsData(swap);

    emit SwapUpdate("MakerUpdate", swap);
    return swap;
  }

  // function updateSwapTakerToken(uint swapId, uint takerTokenId) external override onlyIfSwapOwner(swapId) returns(SwapOrder memory){
  //   SwapOrder memory swap = _swaps[swapId];
  //   //todo shouldn't be allowed to update taker token
  //   // swap.makerTokenId = makerTokenId;
  //   // _updateSwapsData(swap);

  //   // emit SwapUpdate("MakerUpdate", swap);
  //   return swap;
  // }

  function cancelSwap(uint128 swapId) external override onlyIfSwapExists(swapId) onlyIfSwapOwner(swapId) returns(SwapOrder memory){
    SwapOrder memory clearedSwap = _clearSwapsData(swapId);
    emit SwapCanceled(clearedSwap);
    return clearedSwap;
  }

  function acceptSwap(uint128 swapId, uint takerTokenId) external override payable onlyIfSwapExists(swapId) onlyIfTaker(swapId) returns(bool){
    require(isSwapPossible(swapId), USELESS_SWAP);
    SwapOrder memory swap = _swaps[swapId];
    require(swap.takerTokenId == takerTokenId, INVALID_TOKEN_ID); //todo: discuss with team wheather to include this or not
    ERC721.safeTransferFrom(swap.makerAddress, swap.takerAddress, swap.makerTokenId);
    ERC721.safeTransferFrom(swap.takerAddress, swap.makerAddress, swap.takerTokenId);
    emit SwapAccepted(swap);
    return true;
  }

  // function listSwapsForTokenId(uint tokenId) view public override returns(SwapOrder[] memory){

  // }

  // function listSwapsForAddress(address account) view public override returns(SwapOrder[] memory){

  // }

  function isSwapPossible(uint128 swapId) view public onlyIfSwapExists(swapId)  returns(bool) {
    SwapOrder memory swap = _swaps[swapId];
    address maker = ERC721.ownerOf(swap.makerTokenId);
    if(maker!=swap.makerAddress) return false;
    address taker = ERC721.ownerOf(swap.takerTokenId);
    if(taker!=swap.takerAddress) return false;
    return true;
  }

  function _updateSwapsData(SwapOrder memory swap) private {
    //todo find a way to avoid duplication of data
    // _swapsForToken[swap.makerTokenId] = swap;
    // _swapsForToken[swap.takerTokenId] = swap;

    // _swapsForAccount[swap.makerAddress] = swap;
    // _swapsForAccount[swap.takerAddress] = swap;
    _swaps[swap.swapId] = swap;
  }

  function _clearSwapsData(uint128 swapId) private returns(SwapOrder memory){
    SwapOrder memory swap = _swaps[swapId];

    // delete _swapsForToken[swap.makerTokenId];
    // delete _swapsForToken[swap.takerTokenId];

    // delete _swapsForAccount[swap.makerAddress];
    // delete _swapsForAccount[swap.takerAddress];

    delete _swaps[swap.swapId];

    return swap;
  }

  function _getNextId() private returns(uint128){
    _swapCounter = _swapCounter +1;
    return _swapCounter;
  }

}