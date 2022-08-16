// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/INFTFixedBarter.sol";

contract NFTBarter is ERC721, INFTFixedBarter {

  string private constant INVALID_TOKEN_ID = "1000: invalid token id";
  string private constant PERMISSION_DENIED = "1001: permission denied";
  string private constant INVALID_SWAP = "1002: invalid swap";


  //TODO optimize swaps mapping, use only one of them if possible

  //mapping based on swapId 
  mapping(uint => SwapOrder) private _swaps;

  //mapping token ids to Swap Orders for both makers and takers
  mapping(uint => SwapOrder) private _swapsForToken; 

  //mapping based on address to swaps
  mapping (address=>SwapOrder) private _swapsForAccount;

  //swapId generator
  uint private _swapCounter;
  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

  //modifiers

  modifier onlyIfMakerIsOwner(uint newMakerTokenId){
    require(super._exists(newMakerTokenId), INVALID_TOKEN_ID);
    require(super.ownerOf(newMakerTokenId) == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfValidSwap(uint makerTokenId, uint takerTokenId ){
    require(super._exists(makerTokenId), INVALID_TOKEN_ID);
    require(super._exists(takerTokenId), INVALID_TOKEN_ID);
    require(ownerOf(takerTokenId)!= msg.sender, INVALID_SWAP);
    require(super.ownerOf(makerTokenId) == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfSwapOwner(uint swapId){
    SwapOrder memory swap = _swaps[swapId];
    require(swap.makerAddress == msg.sender, PERMISSION_DENIED);
    _;
  }

  modifier onlyIfSwapExists(uint swapId){
  }

  //events
  event SwapInitiated(SwapOrder swap);
  event SwapUpdate(bytes20 updateProperty, SwapOrder updatedSwap);
  event SwapCanceled(SwapOrder canceledSwap);

  //implementation 
  function initiateFixedSwap(uint makerTokenId, uint takerTokenId, int256 valueDifference) external override onlyIfValidSwap(makerTokenId, takerTokenId) returns(SwapOrder memory){
    address takerAddress = ownerOf(takerTokenId);

    SwapOrder memory swap = SwapOrder(_getNextId(),makerTokenId, takerTokenId, msg.sender,  takerAddress, valueDifference);
    _updateSwapsData(swap);

    emit SwapInitiated(swap);

    return swap;
  }

  function updateSwapValue(uint swapId, int256 valueDifference) external override onlyIfSwapOwner(swapId) returns(SwapOrder memory){
    SwapOrder memory swap = _swaps[swapId];
    swap.valueDifference = valueDifference;

    _updateSwapsData(swap);

    emit SwapUpdate("ValuUpdate", swap);
    return swap;
  }

  function updateSwapMakerToken(uint swapId, uint makerTokenId) external override onlyIfSwapOwner(swapId) onlyIfMakerIsOwner(makerTokenId) returns(SwapOrder memory){

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

  function cancelSwap(uint swapId) external override onlyIfSwapOwner(swapId) returns(bool){
    SwapOrder memory clearedSwap = _clearSwapsData(swapId);
    emit SwapCanceled(clearedSwap);
    return true;
  }

  function acceptSwap(uint swapId, uint takerTokenId) external override returns(bool){

  }

  function listSwapsForTokenId(uint tokenId) view public override returns(SwapOrder[] memory){

  }

  function listSwapsForAddress(address account) view public override returns(SwapOrder[] memory){

  }

  function _updateSwapsData(SwapOrder memory swap) private {
    //todo find a way to avoid duplication of data
    _swapsForToken[swap.makerTokenId] = swap;
    _swapsForToken[swap.takerTokenId] = swap;

    _swapsForAccount[swap.makerAddress] = swap;
    _swapsForAccount[swap.takerAddress] = swap;

    _swaps[swap.swapId] = swap;
  }

  function _clearSwapsData(uint swapId) private returns(SwapOrder memory){
    SwapOrder memory swap = _swaps[swapId];

    delete _swapsForToken[swap.makerTokenId];
    delete _swapsForToken[swap.takerTokenId];

    delete _swapsForAccount[swap.makerAddress];
    delete _swapsForAccount[swap.takerAddress];

    delete _swaps[swap.swapId];

    return swap;
  }

  function _getNextId() private returns(uint){
    _swapCounter = _swapCounter +1;
    return _swapCounter;
  }

}