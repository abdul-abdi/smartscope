export const sampleContracts = [
  {
    name: "Simple Storage",
    description: "A basic contract that stores and retrieves a value",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract SimpleStorage {
    uint256 private storedValue;
    
    event ValueChanged(uint256 newValue);
    
    // Store a new value
    function store(uint256 value) public {
        storedValue = value;
        emit ValueChanged(value);
    }
    
    // Retrieve the stored value
    function retrieve() public view returns (uint256) {
        return storedValue;
    }
}`,
  },
  {
    name: "Token Contract",
    description: "A simple ERC-20 like token contract",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract SimpleToken {
    string public name = "SimpleToken";
    string public symbol = "STK";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        balances[msg.sender] = totalSupply;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(recipient != address(0), "Cannot transfer to zero address");
        
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        require(balances[sender] >= amount, "Insufficient balance");
        require(allowances[sender][msg.sender] >= amount, "Insufficient allowance");
        require(recipient != address(0), "Cannot transfer to zero address");
        
        balances[sender] -= amount;
        balances[recipient] += amount;
        allowances[sender][msg.sender] -= amount;
        
        emit Transfer(sender, recipient, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
}`,
  },
  {
    name: "Basic NFT",
    description: "A simplified NFT-like contract",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract SimpleNFT {
    // Token name
    string public name = "SimpleNFT";
    
    // Token symbol
    string public symbol = "SNFT";
    
    // Mapping from token ID to owner address
    mapping(uint256 => address) private owners;
    
    // Mapping owner address to token count
    mapping(address => uint256) private balances;
    
    // Mapping from token ID to approved address
    mapping(uint256 => address) private tokenApprovals;
    
    // Total number of tokens minted
    uint256 private _tokenIdCounter;
    
    // Token URI mapping
    mapping(uint256 => string) private _tokenURIs;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    
    function mint(address to, string memory tokenURI) public returns (uint256) {
        require(to != address(0), "Mint to the zero address");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        owners[tokenId] = to;
        balances[to]++;
        _tokenURIs[tokenId] = tokenURI;
        
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Address zero is not a valid owner");
        return balances[owner];
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "Token doesn't exist");
        return owner;
    }
    
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner, "Not the token owner");
        tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view returns (address) {
        require(owners[tokenId] != address(0), "Token doesn't exist");
        return tokenApprovals[tokenId];
    }
    
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(owners[tokenId] == from, "Not the token owner");
        require(to != address(0), "Transfer to the zero address");
        require(
            msg.sender == from || 
            msg.sender == tokenApprovals[tokenId],
            "Not authorized to transfer"
        );
        
        owners[tokenId] = to;
        balances[from]--;
        balances[to]++;
        delete tokenApprovals[tokenId];
        
        emit Transfer(from, to, tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(owners[tokenId] != address(0), "Token doesn't exist");
        return _tokenURIs[tokenId];
    }
}`,
  },
  {
    name: "Voting Contract (with issues)",
    description: "A simple contract for creating and voting on proposals (contains security issues)",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract VulnerableVoting {
    struct Proposal {
        string description;
        uint256 voteCount;
        bool active;
    }
    
    struct Voter {
        bool hasVoted;
        uint256 votedProposalId;
    }
    
    address public chairperson;
    Proposal[] public proposals;
    mapping(address => Voter) public voters;
    
    event ProposalCreated(uint256 proposalId, string description);
    event Voted(address voter, uint256 proposalId);
    event ProposalClosed(uint256 proposalId);
    
    constructor() {
        chairperson = tx.origin; // Using tx.origin is a security risk
    }
    
    // No function visibility modifier
    function createProposal(string memory _description) returns (uint256) {
        uint256 proposalId = proposals.length;
        proposals.push(Proposal({
            description: _description,
            voteCount: 0,
            active: true
        }));
        
        emit ProposalCreated(proposalId, _description);
        return proposalId;
    }
    
    function vote(uint256 _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(proposals[_proposalId].active, "Proposal is not active");
        require(!voters[msg.sender].hasVoted, "Already voted");
        
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        
        proposals[_proposalId].voteCount++;
        
        emit Voted(msg.sender, _proposalId);
    }
    
    // Unbounded loop - can cause DoS
    function getAllVoters() public view returns (address[] memory) {
        address[] memory allVoters = new address[](1000);
        uint256 count = 0;
        
        for (uint i = 0; i < block.number; i++) {
            address voterAddress = address(uint160(uint(keccak256(abi.encodePacked(i)))));
            if (voters[voterAddress].hasVoted) {
                allVoters[count] = voterAddress;
                count++;
                if (count >= 1000) break;
            }
        }
        
        return allVoters;
    }
    
    // Reentrancy vulnerability
    function closeProposalAndRefund(uint256 _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(proposals[_proposalId].active, "Proposal is already closed");
        require(msg.sender == chairperson, "Only chairperson can close proposals");
        
        // Send reward to the chairperson - vulnerable to reentrancy
        (bool success, ) = msg.sender.call{value: 0.1 ether}("");
        
        // State change after external call - reentrancy vulnerability
        proposals[_proposalId].active = false;
        
        emit ProposalClosed(_proposalId);
    }
    
    // Using block.timestamp for randomness
    function getRandomWinner() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp))) % proposals.length;
    }
    
    // Infinite loop possibility
    function findWinningProposal() public view returns (uint256) {
        uint256 winningVoteCount = 0;
        uint256 winningProposalId = 0;
        
        while(true) {
            // This loop will run indefinitely if no proposals exist
            if (proposals.length > 0) {
                break;
            }
        }
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        
        return winningProposalId;
    }
}`,
  }
];

export function getSampleContract(name: string) {
  return sampleContracts.find(contract => contract.name === name);
}

export function getDefaultSampleContract() {
  return sampleContracts[0];
} 