export const sampleContracts = [
  {
    name: "Simple Storage",
    description: "A basic contract that stores and retrieves a value",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
pragma solidity ^0.8.0;

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
        
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        require(balances[sender] >= amount, "Insufficient balance");
        require(allowances[sender][msg.sender] >= amount, "Insufficient allowance");
        
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
pragma solidity ^0.8.0;

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
    name: "Voting Contract",
    description: "A simple contract for creating and voting on proposals",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleVoting {
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
        chairperson = msg.sender;
    }
    
    modifier onlyChairperson() {
        require(msg.sender == chairperson, "Only chairperson can call this function");
        _;
    }
    
    function createProposal(string memory _description) public returns (uint256) {
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
    
    function closeProposal(uint256 _proposalId) public onlyChairperson {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(proposals[_proposalId].active, "Proposal is already closed");
        
        proposals[_proposalId].active = false;
        
        emit ProposalClosed(_proposalId);
    }
    
    function getProposalCount() public view returns (uint256) {
        return proposals.length;
    }
    
    function getProposal(uint256 _proposalId) public view returns (
        string memory description,
        uint256 voteCount,
        bool active
    ) {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        
        Proposal memory proposal = proposals[_proposalId];
        return (proposal.description, proposal.voteCount, proposal.active);
    }
    
    function hasVoted(address _voter) public view returns (bool) {
        return voters[_voter].hasVoted;
    }
    
    function getVotedProposal(address _voter) public view returns (uint256) {
        require(voters[_voter].hasVoted, "Address has not voted");
        return voters[_voter].votedProposalId;
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