//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../Twinesis.sol";

contract TestnetTwinesis is Twinesis {
    address private recipient = 0x8fE5EFB29F4D4F48dFDA2D72454152587b59A95F;
    string private _name;

    constructor(
        string memory unrevealedBaseURI_,
        string memory revealedBaseURI_,
        address withdrawalAddress1_,
        address withdrawalAddress2_,
        string memory name_
    ) Twinesis(unrevealedBaseURI_, revealedBaseURI_, withdrawalAddress1_, withdrawalAddress2_) {
        _mintPreviously(3, 1 days); // collector
        _mintPreviously(12, 59.9 days); // collector, almost believer
        _mintPreviously(20, 80 days); // believer
        _mintPreviously(25, 119.9 days); // believer, almost supporter
        _mintPreviously(30, 140 days); // supporter
        _mintPreviously(35, 179.9 days); // supporter, almost fan
        _mintPreviously(42, 200 days); // fan
        _name = name_;
    }

    function _mintPreviously(uint256 tokenId, uint256 timeBefore) private {
        _safeMint(recipient, tokenId);
        outsetDate[tokenId] = block.timestamp - timeBefore;
    }

    function name() public view override returns (string memory) {
        return _name;
    }
}
