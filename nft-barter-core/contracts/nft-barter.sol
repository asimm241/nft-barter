// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/INFTFixedBarter.sol";

contract NFTBarter is ERC721, INFTFixedBarter {
    string private constant INVALID_TOKEN_ID = "1000: invalid token id";
    string private constant PERMISSION_DENIED = "1001: permission denied";
    string private constant INVALID_SWAP = "1002: invalid swap";
    string private constant USELESS_SWAP = "1003: useless swap"; //swap is not useable anymore some informatino in the swap is probably changed like ownership
    string private constant INVALID_BALANCE_TRANSFERRED =
        "1004: invalid balance transferred";
    string private constant TX_FAILED = "1005: transaction failed";

    //mapping based on swapId
    mapping(uint128 => SwapOrder) private _swaps;

    //swapId generator
    uint128 private _swapCounter;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    //modifiers
    modifier onlyIfTokenIsValid(uint256 tokenId) {
        require(ERC721._exists(tokenId), INVALID_TOKEN_ID);
        _;
    }

    modifier onlyIfValidSwap(uint256 makerTokenId, uint256 takerTokenId) {
        require(ERC721._exists(makerTokenId), INVALID_TOKEN_ID);
        require(ERC721._exists(takerTokenId), INVALID_TOKEN_ID);
        require(ERC721.ownerOf(takerTokenId) != msg.sender, INVALID_SWAP);
        require(ERC721.ownerOf(makerTokenId) == msg.sender, PERMISSION_DENIED);
        _;
    }

    modifier onlyIfSwapExists(uint128 swapId) {
        SwapOrder memory swap = _swaps[swapId];
        require(swap.makerAddress != address(0), INVALID_SWAP);
        _;
    }

    modifier onlyIfTaker(uint128 swapId) {
        SwapOrder memory swap = _swaps[swapId];
        require(swap.takerAddress == msg.sender, PERMISSION_DENIED);
        _;
    }

    modifier onlyIfParticipant(uint128 swapId) {
        SwapOrder memory swap = _swaps[swapId];
        require(
            swap.takerAddress == msg.sender || swap.makerAddress == msg.sender,
            PERMISSION_DENIED
        );
        _;
    }

    modifier onlyIfMaker(uint128 swapId) {
        SwapOrder memory swap = _swaps[swapId];
        require(swap.makerAddress == msg.sender, PERMISSION_DENIED);
        _;
    }

    //events
    event SwapInitiated(SwapOrder swap);
    event SwapUpdate(bytes20 updateProperty, SwapOrder updatedSwap);
    event SwapCanceled(SwapOrder swap);
    event SwapAccepted(SwapOrder swap);

    //implementation
    function mint(uint256 tokenId) external {
        ERC721._safeMint(msg.sender, tokenId);
    }

    function initiateFixedSwap(
        uint256 makerTokenId,
        uint256 takerTokenId,
        int152 valueDifference
    )
        external
        payable
        override
        onlyIfValidSwap(makerTokenId, takerTokenId)
        returns (SwapOrder memory)
    {
        // maker should transfer if the valueDifference is negative
        if (valueDifference < 0) {
            require(
                msg.value == _abs(valueDifference),
                INVALID_BALANCE_TRANSFERRED
            );
        }
        address takerAddress = ERC721.ownerOf(takerTokenId);

        SwapOrder memory swap = SwapOrder(
            msg.sender,
            takerAddress,
            valueDifference,
            _getNextId(),
            makerTokenId,
            takerTokenId
        );
        _updateSwapsData(swap);

        emit SwapInitiated(swap);

        return swap;
    }

    function updateSwapValue(uint128 swapId, int152 valueDifference)
        external
        payable
        override
        onlyIfSwapExists(swapId)
        onlyIfMaker(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];
        swap.valueDifference = valueDifference;

        // make appropriate transfers
        _adjustValueDifference(valueDifference, swapId);

        _updateSwapsData(swap);

        emit SwapUpdate("ValueUpdate", swap);
        return swap;
    }

    function updateSwapMakerToken(uint128 swapId, uint256 makerTokenId)
        external
        override
        onlyIfSwapExists(swapId)
        onlyIfTokenIsValid(makerTokenId)
        onlyIfMaker(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];
        swap.makerTokenId = makerTokenId;
        _updateSwapsData(swap);

        emit SwapUpdate("MakerUpdate", swap);
        return swap;
    }

    function updateSwapTakerToken(uint128 swapId, uint256 takerTokenId)
        external
        override
        onlyIfSwapExists(swapId)
        onlyIfTokenIsValid(takerTokenId)
        onlyIfMaker(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];
        swap.takerTokenId = takerTokenId;
        _updateSwapsData(swap);

        emit SwapUpdate("TakerUpdate", swap);
        return swap;
    }

    function cancelSwap(uint128 swapId)
        external
        payable
        override
        onlyIfSwapExists(swapId)
        onlyIfParticipant(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory clearedSwap = _clearSwapsData(swapId);
        // contract should transfer maker if the valueDifference is negative
        if (clearedSwap.valueDifference < 0) {
            _transferAmount(
                clearedSwap.makerAddress,
                _abs(clearedSwap.valueDifference)
            );
        }
        emit SwapCanceled(clearedSwap);
        return clearedSwap;
    }

    function acceptSwap(uint128 swapId, uint256 takerTokenId)
        external
        payable
        override
        onlyIfSwapExists(swapId)
        onlyIfTokenIsValid(takerTokenId)
        onlyIfTaker(swapId)
        returns (bool)
    {
        require(isSwapPossible(swapId), USELESS_SWAP);
        SwapOrder memory swap = _swaps[swapId];
        require(swap.takerTokenId == takerTokenId, INVALID_TOKEN_ID); //todo: discuss with team wheather to include this or not
        uint256 transferAmount = _abs(swap.valueDifference);
        // check if taker has transferred the amount in case valueDifference is positive
        if (swap.valueDifference > 0) {
            require(transferAmount == msg.value, INVALID_BALANCE_TRANSFERRED);
        }
        // swapping tokens
        ERC721._transfer(
            swap.makerAddress,
            swap.takerAddress,
            swap.makerTokenId
        );
        ERC721._transfer(
            swap.takerAddress,
            swap.makerAddress,
            swap.takerTokenId
        );
        // transfer the value to maker if valueDifference is positive
        if (swap.valueDifference > 0) {
            _transferAmount(swap.makerAddress, transferAmount);
        }
        // transfer the value to taker if valueDifference is negative
        else if (swap.valueDifference < 0) {
            _transferAmount(swap.takerAddress, transferAmount);
        }
        emit SwapAccepted(swap);
        return true;
    }

    function isSwapPossible(uint128 swapId)
        public
        view
        onlyIfSwapExists(swapId)
        returns (bool)
    {
        SwapOrder memory swap = _swaps[swapId];
        address maker = ERC721.ownerOf(swap.makerTokenId);
        if (maker != swap.makerAddress) return false;
        address taker = ERC721.ownerOf(swap.takerTokenId);
        if (taker != swap.takerAddress) return false;
        return true;
    }

    function _updateSwapsData(SwapOrder memory swap) private {
        _swaps[swap.swapId] = swap;
    }

    function _clearSwapsData(uint128 swapId)
        private
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];

        delete _swaps[swap.swapId];

        return swap;
    }

    function _abs(int256 x) private pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    function _getNextId() private returns (uint128) {
        _swapCounter = _swapCounter + 1;
        return _swapCounter;
    }

    function _transferAmount(address to, uint256 amount) private {
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, TX_FAILED);
    }

    function _adjustValueDifference(int152 valueDifference, uint128 swapId)
        private
    {
        // ignoring transfers since they will be done by taker on accepting swap
        if (valueDifference >= 0 && _swaps[swapId].valueDifference >= 0) return;

        /** 
        Transferring conditions:
         - maker transfers if:
           - old value is +ve and new value is -ve
           - old value is -ve and higher than the new value
         - contract transfers if 
           - old value is -ve and new value is +ve
           - old & new values are -ve and old value is lower than the new value
        */
        if (
            (_swaps[swapId].valueDifference > 0 && valueDifference < 0) ||
            (_swaps[swapId].valueDifference < 0 &&
                _swaps[swapId].valueDifference > valueDifference)
        ) {
            // Maker to Contract
            uint256 difference = _swaps[swapId].valueDifference >= 0
                ? _abs(valueDifference)
                : _abs(valueDifference - _swaps[swapId].valueDifference);
            require(msg.value == difference, INVALID_BALANCE_TRANSFERRED);
        } else if (
            (_swaps[swapId].valueDifference < 0 && valueDifference > 0) ||
            (_swaps[swapId].valueDifference < 0 &&
                valueDifference < 0 &&
                _swaps[swapId].valueDifference < valueDifference)
        ) {
            // Contract to Maker
            uint256 difference = valueDifference >= 0
                ? _abs(_swaps[swapId].valueDifference)
                : _abs(valueDifference - _swaps[swapId].valueDifference);
            _transferAmount(_swaps[swapId].makerAddress, difference);
        }
    }
}
