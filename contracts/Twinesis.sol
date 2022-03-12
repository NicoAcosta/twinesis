//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Description.sol";
import "./Types.sol";
import "./ITwinesis.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 *
 *              Collection details in Description.sol
 *
 *
 *          --------------               -----------------
 *          |   ARTIST   |               |   DEVELOPER   |
 *          --------------               -----------------
 *          twinnytwin.eth             nicoacosta.eth
 *          @djtwinnytwin              @0xnico_
 *          twinnytwin.io              github.com/NicoAcosta
 *          twinnytwin.com             linktr.ee/nicoacosta.eth
 *
 *
 *
 *                          -------------
 *                          |   INDEX   |
 *                          -------------                     line
 *
 *      TWINESIS Contract .................................... 82
 *
 *          1.  Libraries .................................... 84
 *
 *          2.  Events ....................................... 93
 *
 *          3.  State variables .............................. 103
 *
 *          4.  Constructor .................................. 154
 *
 *          5.  Minting ...................................... 187
 *
 *                  A.  Public minting ....................... 232
 *
 *                  B.  Internal minting ..................... 263
 *
 *          6.  Metadata ..................................... 297
 *
 *                  A.  Revealable metadata .................. 302
 *
 *                  B.  Contract URI ......................... 334
 *
 *                  C.  Token URI ............................ 345
 *
 *                          1.  Rarities ..................... 380
 *
 *                          2.  Levels ....................... 400
 *
 *                                  A.  Outset date .......... 419
 *
 *                          3.  Journey percentage ........... 462
 *
 *          7.  Withdrawal ................................... 480
 *
 */

/**
 *  @title Twinesis
 *  @author Nicolás Acosta (nicoacosta.eth) @0xnico_
 *          linktr.ee/nicoacosta.eth
 *  @notice NFT ERC721.
 *          3 rarities.
 *          4 levels (based on time since minting or transfer)
 *              If a token is transferd before final level, level is resetted to 0.
 *              Once token reaches final level, it does not reset when transfered.
 *          Journey percentage
 *          Goodlist pre sale
 *          Public minting
 *  @dev Inherits from @openzeppelin/contracts ERC721 and Ownable
 *       Uses enums Rarity and Level (Types.sol)
 *       Ownable only for marketplaces customization purposes
 */
contract Twinesis is ITwinesis, ERC721, Ownable {
    /// ---------------
    /// 1. Libraries
    /// ---------------

    using Strings for uint256;

    using TwinesisStrings for Rarity;
    using TwinesisStrings for Level;

    /// ------------
    /// 2. Events
    /// ------------

    /// @notice New outset date for a token
    /// @dev Emitted when `outsetDate` is setted or resetted
    /// @param tokenId Token id
    /// @param date New outset date
    event NewOutsetDate(uint256 indexed tokenId, uint256 date);

    /// ---------------------
    /// 3. State variables
    /// ---------------------

    /// @notice Artist address
    /// @dev Used to add addresses to pre sale goodlist
    address private constant ARTIST =
        0x567B5E79cE0d465a0FF1e1eeeFE65d180b4C5D41; // twinnytwin.eth

    /// @notice Developer address
    /// @dev Used to add addresses to pre sale goodlist
    address private constant DEV = 0xab468Aec9bB4b9bc59b2B2A5ce7F0B299293991f; // nicoacosta.eth

    /// @notice Maximum amount of tokens that can be minted
    /// @dev Required not to be to exceeded in minting public functions
    /// @return MAX_TOKENS Maximum amount of tokens that can be minted
    uint256 public constant MAX_TOKENS = 222;

    /// @notice Minting price per token
    /// @dev Required to match msg.value in minting public functions
    /// @return MINTING_PRICE Minting price per token in ETH
    uint256 public constant MINTING_PRICE = 0.06 ether;

    /// @notice Public minting start date
    /// @dev Used in public minting functions
    /// @return PUBLIC_MINTING_START_DATE Public minting start date
    uint256 public constant PUBLIC_MINTING_START_DATE = 1647298800; // 2022-03-14 20:00:00

    /// @notice Date from which the contract starts to count to calculate its level.
    /// @dev Used to calculate a token's level. When it was minted or transfered if it was not at maximum level
    /// @return outsetDate Token's outset id
    mapping(uint256 => uint256) public outsetDate;

    /// @notice Amount of tokens already minted
    /// @return mintedTokens Amount of tokens already minted
    uint256 public mintedTokens;

    /// @notice Id of the last minted token
    uint256 private _lastId;

    /// @notice Unreaveled rarities base metadata IPFS URI
    /// @dev Initialized at deployment
    string private _unrevealedRaritiesBaseURI;

    /// @notice Revealed rarities base metadata IPFS URI. Only can be set once.
    string private _revealedRaritiesBaseURI;

    /// @notice Addresses for ETH withdrawal
    address private immutable _withdrawalAddress1;
    address private immutable _withdrawalAddress2;

    /// -----------------
    /// 4. Constructor
    /// -----------------

    /// @notice run at deployment
    constructor(
        string memory unrevealedBaseURI_,
        address withdrawalAddress1_,
        address withdrawalAddress2_
    ) ERC721("Twinesis", "TWN1") {
        // Set unreaveled base metadata IPFS URI
        _unrevealedRaritiesBaseURI = unrevealedBaseURI_;

        // Set withdrawal addresses
        _withdrawalAddress1 = withdrawalAddress1_;
        _withdrawalAddress2 = withdrawalAddress2_;

        // Mint tokens to artist and dev
        _safeMint(ARTIST, 1);
        _safeMint(ARTIST, 5);
        _safeMint(DEV, 8);
        _safeMint(DEV, 10);
        _safeMint(ARTIST, 100);
        _safeMint(ARTIST, 202);

        // Set minted tokens to 6
        mintedTokens = 6;

        // Set last id to #1. First minting call will mint #2
        _lastId = 1;
    }

    /// -------------
    /// -------------
    /// 5. Minting
    /// -------------
    /// -------------

    /// @notice Checks if token has been minted.
    /// @dev Returns ERC721's internal `_exists`
    /// @param tokenId Token id
    /// @return Bool: whether the token has been minted or not
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /// @notice Returns the amount of tokens that can be minted.
    /// @dev Maximum amount of tokens that can be minted minus the amount of already minted tokens.
    /// @return Tokens Tokens left to mint
    function tokensToMint() external view returns (uint256) {
        return MAX_TOKENS - mintedTokens;
    }

    /// @notice Verifies that one token can be minted.
    /// @dev Verifies that ETH received matches minting price and that the maximum amount of tokens has not been reached.
    modifier canMintOne() {
        // ETH received must match minting price
        require(msg.value == MINTING_PRICE, "Invalid ETH amount");
        // The maximum amount of tokens must not have been reached
        require(mintedTokens < MAX_TOKENS, "Max tokens already minted");
        _;
    }

    /// @notice Verifies that a certain amount of tokens can be minted.
    /// @dev Verifies that amount is greater than 1, that ETH received matches minting price and that the maximum amount of tokens would not be exceeded.
    modifier canMint(uint256 amount) {
        // This function must be called for minting more than one token.
        require(amount > 1, "Call this function to mint multiple tokens");
        // ETH received must match minting price
        require(msg.value == MINTING_PRICE * amount, "Invalid ETH amount");
        // The maximum amount of tokens must not be exceeded
        require(
            mintedTokens + amount <= MAX_TOKENS,
            "Max tokens already minted"
        );
        _;
    }

    /// ------------------------
    /// 5.A. Public minting
    /// ------------------------

    /// @notice Verifies that public minting has started
    modifier publicMintingStarted() {
        require(
            block.timestamp > PUBLIC_MINTING_START_DATE,
            "Public minting has not started yet"
        );
        _;
    }

    /// @notice Mint one token (public minting)
    /// @dev Verifies public minting start date, max tokens and ETH received. Mints next id available.
    function mintTwin() external payable publicMintingStarted canMintOne {
        _mintOneToken();
    }

    /// @notice Mint several tokens (public minting)
    /// @dev Verifies public minting start date, max tokens and ETH received. Mints next ids available.
    /// @param amount The number of tokens to mint
    function mintTwins(uint256 amount)
        external
        payable
        publicMintingStarted
        canMint(amount)
    {
        _mintSeveralTokens(amount);
    }

    /// --------------------------
    /// 5.B. Internal minting
    /// --------------------------

    /// @notice Mints next id avilable
    function _mintOneToken() private {
        uint256 _id = _lastId + 1;
        if (_exists(_id)) _id++;

        _safeMint(msg.sender, _id);

        // Update _lastId and mintedTokens
        _lastId = _id;
        mintedTokens++;
    }

    /// @notice Mints next ids available
    /// @param _amount Amount of tokens to mint
    function _mintSeveralTokens(uint256 _amount) private {
        uint256 _id = _lastId;

        for (uint256 _i = 0; _i < _amount; _i++) {
            _id++;
            if (_exists(_id)) _id++;

            _safeMint(msg.sender, _id);
        }

        // Update _lastId and mintedTokens
        _lastId = _id;
        mintedTokens += _amount;
    }

    /// --------------
    /// --------------
    /// 6. Metadata
    /// --------------
    /// --------------

    /// -----------------------------
    /// 6.A. Revealable metadata
    /// -----------------------------

    /// @notice Returns metadata base URI depending on whether rarities have been revealed
    /// @return baseURI Base URI
    function _metadataBaseURI() private view returns (string memory) {
        if (raritiesHaveBeenRevealed()) {
            return _revealedRaritiesBaseURI;
        }
        return _unrevealedRaritiesBaseURI;
    }

    /// @notice Verifies if rarities have been revealed
    /// @dev If rarities have been revealed, `_revealedRaritiesBaseURI` length would be greater than 0, as it is empty by default.
    /// @return bool whether rarities have been revealed
    function raritiesHaveBeenRevealed() public view returns (bool) {
        return bytes(_revealedRaritiesBaseURI).length > 0;
    }

    /// @notice Reveal rarities metadata. Contract and token metadata will be based on this new IPFS URI. It can only be run once.
    /// @param newBaseURI New base URI to be set
    function revealRarities(string memory newBaseURI) public onlyOwner {
        // Can only be run once
        require(!raritiesHaveBeenRevealed(), "Metadata already revealed");

        _revealedRaritiesBaseURI = newBaseURI;
    }

    /// ----------------------
    /// 6.B. Contract URI
    /// ----------------------

    /// @notice Collection metadata URL
    /// @dev Collection IPFS URI link
    /// @return contractURI collection metadata link
    function contractURI() public view returns (string memory) {
        return string(abi.encodePacked(_metadataBaseURI(), "collection.json"));
    }

    /// -------------------
    /// 6.C. Token URI
    /// -------------------

    /// @notice Token metadata URL
    /// @dev Looks for a token URI based on its rarity, level and percentage.
    /// @param tokenId Token id
    /// @return tokenURI Token metadata URL
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Token does not exist");

        // Get token rarity, level and percentage
        string memory _rarity = rarity(tokenId).toString();
        string memory _level = level(tokenId).toString();
        string memory _percentage = journeyPercentage(tokenId).toString();

        return
            string(
                abi.encodePacked(
                    _metadataBaseURI(),
                    _rarity,
                    "-",
                    _level,
                    "-",
                    _percentage,
                    ".json"
                )
            );
    }

    /// --------------------
    /// 6.C.1 Rarities
    /// --------------------

    /// @notice Token rarity. If rarities have not been revealed yet, it returns `UNREVEALED` as rarity.
    /// @param tokenId Token id
    /// @return rarity Token rarity
    function rarity(uint256 tokenId) public view returns (Rarity) {
        require(_exists(tokenId), "Token does not exist");

        if (!raritiesHaveBeenRevealed()) return Rarity.UNREVEALED;

        // GOLD:  22 tokens
        if (tokenId % 10 == 0) return Rarity.GOLD;
        // RED:   66 tokens
        if ((tokenId + 2) % 3 == 0) return Rarity.RED;
        // BLUE:  134 tokens
        return Rarity.BLUE;
    }

    /// ------------------
    /// 6.C.2 Levels
    /// ------------------

    /// @notice Token level
    /// @dev Returns Level enum based on the amount of days since its `outsetDate`.
    /// @param tokenId Token id
    /// @return level Token level
    function level(uint256 tokenId) public view returns (Level) {
        require(_exists(tokenId), "Token does not exist");

        uint256 _daysPassed = timeSinceOutset(tokenId) / 1 days;

        if (_daysPassed < 60) return Level.COLLECTOR;
        else if (_daysPassed < 120) return Level.BELIEVER;
        else if (_daysPassed < 180) return Level.SUPPORTER;
        else return Level.FAN;
    }

    /// -----------------------------
    /// 6.C.2.A. Outset date
    /// -----------------------------

    /// @notice Time since a token outset date was last updated
    /// @dev Last block's timestamp minus its outset date
    /// @param tokenId Token id
    /// @return timeSinceOutset Seconds since outset date
    function timeSinceOutset(uint256 tokenId) public view returns (uint256) {
        return block.timestamp - outsetDate[tokenId];
    }

    /// @notice Set token `outsetDate` to current timestamp
    /// @param _tokenId tokenId
    function _resetOutsetDate(uint256 _tokenId) private {
        outsetDate[_tokenId] = block.timestamp;

        emit NewOutsetDate(_tokenId, block.timestamp);
    }

    /// @notice Calls standard `_transfer` and resets outset date if it has not reached the maximum level.
    /// @param from Token's owner or approved address
    /// @param to Recipient
    /// @param tokenId Token id to be transfered
    /// @inheritdoc	ERC721
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        ERC721._transfer(from, to, tokenId);
        if (timeSinceOutset(tokenId) < 180 days) _resetOutsetDate(tokenId);
    }

    /// @notice Calls standard `_mint` and sets outset date
    /// @param to Recipient
    /// @param tokenId Token id to be minted
    /// @inheritdoc	ERC721
    function _mint(address to, uint256 tokenId) internal override {
        ERC721._mint(to, tokenId);
        _resetOutsetDate(tokenId);
    }

    /// ------------------------------
    /// 6.C.3 Journey percentage
    /// ------------------------------

    /// @notice Percentage of time passed for maximum level (180 days)
    /// @dev Calculates percentage of time since `outsetDate` for 180 days.
    /// @param tokenId Token id
    /// @return percentage Percentage of time passed for maximum level (180 days)
    function journeyPercentage(uint256 tokenId) public view returns (uint256) {
        uint256 timePassed = timeSinceOutset(tokenId);

        if (timePassed >= 180 days) {
            return 100;
        }
        return (timePassed * 100) / 180 days;
    }

    /// ----------------
    /// ----------------
    /// 7. Withdrawal
    /// ----------------
    /// ----------------

    /// @notice Withdraw contract's balance to withdrawal addresses
    function withdraw() external {
        require(
            msg.sender == owner() ||
                msg.sender == _withdrawalAddress1 ||
                msg.sender == _withdrawalAddress2,
            "Caller cannot withdraw funds"
        );
        uint256 _balance = address(this).balance;
        require(_balance > 0, "No balance to transfer");

        uint256 _amount1 = (_balance * 150) / 1296;

        payable(_withdrawalAddress1).transfer(_amount1);
        payable(_withdrawalAddress2).transfer(_balance - _amount1);
    }
}

/// Shout out to the Boostribe and Cryptotribe community 💜
