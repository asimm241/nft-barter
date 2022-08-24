// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/INFTFixedBarter.sol";

contract NFTBarter is ERC721, INFTFixedBarter {
    string private constant INVALID_TOKEN_ID = "1000: invalid token id";
    string private constant PERMISSION_DENIED = "1001: permission denied";
    string private constant INVALID_SWAP = "1002: invalid swap";
    string private constant USELESS_SWAP = "1003: useless swap"; //swap is not useable anymore some informatino in the swap is probably changed like ownership
    string private constant INSUFFICIENT_BALANCE = "1004: insufficient balance";
    string private constant TX_FAILED = "1005: transaction failed";

    //mapping based on swapId
    mapping(uint128 => SwapOrder) private _swaps;

    //mapping to keep record for user's balance transferred
    mapping(address => uint256) private _ledger;

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

    receive() external payable {
        _ledger[msg.sender] += msg.value;
    }

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
        override
        onlyIfValidSwap(makerTokenId, takerTokenId)
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = SwapOrder(
            msg.sender,
            ERC721.ownerOf(takerTokenId),
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
        override
        onlyIfSwapExists(swapId)
        onlyIfMaker(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];
        swap.valueDifference = valueDifference;

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
        override
        onlyIfSwapExists(swapId)
        onlyIfParticipant(swapId)
        returns (SwapOrder memory)
    {
        SwapOrder memory clearedSwap = _clearSwapsData(swapId);
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
        if (swap.valueDifference < 0) {
            _transferAmount(
                swap.makerAddress,
                swap.takerAddress,
                _abs(swap.valueDifference)
            );
        } else if (swap.valueDifference > 0) {
            _transferAmount(
                swap.takerAddress,
                swap.makerAddress,
                _abs(swap.valueDifference)
            );
        }
        emit SwapAccepted(swap);
        return true;
    }

    function withdrawAmount(uint256 amount) external payable {
        _transferAmount(msg.sender, msg.sender, amount);
    }

    function checkBalance() external view returns (uint256) {
        return _ledger[msg.sender];
    }

    function isSwapPossible(uint128 swapId)
        public
        view
        onlyIfSwapExists(swapId)
        returns (bool)
    {
        SwapOrder memory swap = _swaps[swapId];
        return (ERC721.ownerOf(swap.makerTokenId) == swap.makerAddress &&
            ERC721.ownerOf(swap.takerTokenId) == swap.takerAddress);
    }

    function _updateSwapsData(SwapOrder memory swap) private {
        _swaps[swap.swapId] = swap;
    }

    function _clearSwapsData(uint128 swapId)
        private
        returns (SwapOrder memory)
    {
        SwapOrder memory swap = _swaps[swapId];

        delete _swaps[swapId];

        return swap;
    }

    function _abs(int256 x) private pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    function _getNextId() private returns (uint128) {
        _swapCounter = _swapCounter + 1;
        return _swapCounter;
    }

    function _transferAmount(
        address from,
        address to,
        uint256 amount
    ) private {
        // checking from's account
        require(amount <= _ledger[from], INSUFFICIENT_BALANCE);
        // subtracting the amount in ledger
        _ledger[from] -= amount;
        // transferring the amount to `to`
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, TX_FAILED);
    }
}
