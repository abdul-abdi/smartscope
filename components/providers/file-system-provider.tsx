'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FileSystemItem, FileSystemContextType } from '../ui/file-explorer';
import { useToast } from './toast-provider';

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

// Helper function to save project to localStorage
const saveProjectToLocalStorage = (project: FileSystemItem[]) => {
  localStorage.setItem('karibu-project', JSON.stringify(project));
};

// Helper function to load project from localStorage
const loadProjectFromLocalStorage = (): FileSystemItem[] => {
  try {
    const data = localStorage.getItem('karibu-project');
    if (data) {
      // Need to convert string dates back to Date objects
      const parsed = JSON.parse(data);
      const processItemDates = (item: any): FileSystemItem => {
        return {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          children: item.children ? item.children.map(processItemDates) : undefined
        };
      };
      
      return parsed.map(processItemDates);
    }
  } catch (error) {
    console.error('Error loading project from localStorage:', error);
  }
  return [];
};

// Sample default project structure with some example contracts
const getDefaultProject = (): FileSystemItem[] => {
  const rootId = uuidv4();
  const now = new Date();
  
  return [
    {
      id: rootId,
      name: 'contracts',
      type: 'folder',
      createdAt: now,
      updatedAt: now,
      children: [
        {
          id: uuidv4(),
          name: 'Token.sol',
          type: 'file',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}`,
          parent: rootId,
          createdAt: now,
          updatedAt: now,
          language: 'solidity'
        },
        {
          id: uuidv4(),
          name: 'SimpleStorage.sol',
          type: 'file',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    event ValueChanged(uint256 newValue);
    
    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`,
          parent: rootId,
          createdAt: now,
          updatedAt: now,
          language: 'solidity'
        },
        {
          id: uuidv4(),
          name: 'SafeMath.sol',
          type: 'file',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Library for safe math operations that prevent overflows.
 * Note: Solidity 0.8.0+ has built-in overflow checking, but this library
 * is provided as an example of how libraries work.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with overflow check.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, with underflow check.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction underflow");
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with overflow check.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev Returns the division of two unsigned integers, with zero division check.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
}`,
          parent: rootId,
          createdAt: now,
          updatedAt: now,
          language: 'solidity'
        },
        {
          id: uuidv4(),
          name: 'TokenWithLibrary.sol',
          type: 'file',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SafeMath.sol";

/**
 * @title TokenWithLibrary
 * @dev Example contract demonstrating library usage
 */
contract TokenWithLibrary {
    using SafeMath for uint256;
    
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[to] = balances[to].add(amount);
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        balances[from] = balances[from].sub(amount);
        balances[to] = balances[to].add(amount);
        allowances[from][msg.sender] = allowances[from][msg.sender].sub(amount);
        
        emit Transfer(from, to, amount);
        return true;
    }
}`,
          parent: rootId,
          createdAt: now,
          updatedAt: now,
          language: 'solidity'
        }
      ]
    }
  ];
};

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [currentFile, setCurrentFile] = useState<FileSystemItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load files from localStorage on component mount
  useEffect(() => {
    // Always load fresh default project
    setFiles(getDefaultProject());
    setIsInitialized(true);
  }, []);

  // Save files to localStorage whenever they change - but don't save between sessions
  useEffect(() => {
    if (isInitialized) {
      const defaultFiles = getDefaultProject();
      const defaultFileNames = new Set(
        defaultFiles.flatMap(folder => 
          folder.type === 'folder' && folder.children 
            ? folder.children.map(file => file.name) 
            : []
        )
      );
      
      // This is now just an in-memory store and not persisted to localStorage
      // We use localStorage just for the current session
      saveProjectToLocalStorage(files);
    }
  }, [files, isInitialized]);

  // Helper function to find a file by ID
  const findFileById = (id: string, items: FileSystemItem[] = files): FileSystemItem | null => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.type === 'folder' && item.children) {
        const found = findFileById(id, item.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  // Helper function to update a file in the tree
  const updateFileInTree = (updatedItem: FileSystemItem, items: FileSystemItem[] = [...files]): FileSystemItem[] => {
    return items.map(item => {
      if (item.id === updatedItem.id) {
        return updatedItem;
      }
      if (item.type === 'folder' && item.children) {
        return {
          ...item,
          children: updateFileInTree(updatedItem, [...item.children])
        };
      }
      return item;
    });
  };

  // Helper function to add an item to the tree
  const addItemToTree = (newItem: FileSystemItem, parentId: string | undefined, items: FileSystemItem[] = [...files]): FileSystemItem[] => {
    // If no parent specified, add to root
    if (!parentId) {
      return [...items, newItem];
    }

    return items.map(item => {
      if (item.id === parentId && item.type === 'folder') {
        return {
          ...item,
          children: [...(item.children || []), newItem]
        };
      }
      if (item.type === 'folder' && item.children) {
        return {
          ...item,
          children: addItemToTree(newItem, parentId, [...item.children])
        };
      }
      return item;
    });
  };

  // Helper function to remove an item from the tree
  const removeItemFromTree = (id: string, items: FileSystemItem[] = [...files]): FileSystemItem[] => {
    // Filter out the item to be removed
    const filteredItems = items.filter(item => item.id !== id);
    
    // If an item was removed, return the filtered items
    if (filteredItems.length < items.length) {
      return filteredItems;
    }
    
    // Otherwise, recursively check each folder
    return filteredItems.map(item => {
      if (item.type === 'folder' && item.children) {
        return {
          ...item,
          children: removeItemFromTree(id, [...item.children])
        };
      }
      return item;
    });
  };

  // Function to create a new file
  const createFile = (name: string, parentId?: string) => {
    // Check if name ends with .sol, if not, append it
    const fileName = name.endsWith('.sol') ? name : `${name}.sol`;
    
    const newFile: FileSystemItem = {
      id: uuidv4(),
      name: fileName,
      type: 'file',
      content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ${fileName.replace('.sol', '')} {
    // Your code here
}`,
      parent: parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      language: 'solidity'
    };

    setFiles(prev => addItemToTree(newFile, parentId, prev));
    setCurrentFile(newFile);
    toast({
      title: 'File Created',
      description: `Created file: ${fileName}`,
      type: 'success'
    });
  };

  // Function to create a new folder
  const createFolder = (name: string, parentId?: string) => {
    const newFolder: FileSystemItem = {
      id: uuidv4(),
      name,
      type: 'folder',
      children: [],
      parent: parentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setFiles(prev => addItemToTree(newFolder, parentId, prev));
    toast({
      title: 'Folder Created',
      description: `Created folder: ${name}`,
      type: 'success'
    });
  };

  // Function to rename an item
  const renameItem = (id: string, newName: string) => {
    const item = findFileById(id);
    if (!item) {
      toast({
        title: 'Error',
        description: 'Item not found',
        type: 'error'
      });
      return;
    }

    // For files, ensure proper extension
    let finalName = newName;
    if (item.type === 'file' && item.language === 'solidity' && !finalName.endsWith('.sol')) {
      finalName = `${finalName}.sol`;
    }

    const updatedItem = {
      ...item,
      name: finalName,
      updatedAt: new Date()
    };

    setFiles(prev => updateFileInTree(updatedItem, prev));
    
    // If this was the current file, update that reference too
    if (currentFile && currentFile.id === id) {
      setCurrentFile(updatedItem);
    }
    
    toast({
      title: 'Renamed',
      description: `Renamed to: ${finalName}`,
      type: 'info'
    });
  };

  // Function to delete an item
  const deleteItem = (id: string) => {
    const item = findFileById(id);
    if (!item) {
      toast({
        title: 'Error',
        description: 'Item not found',
        type: 'error'
      });
      return;
    }

    // If we're deleting the current file, clear it
    if (currentFile && (currentFile.id === id || currentFile.parent === id)) {
      setCurrentFile(null);
    }

    setFiles(prev => removeItemFromTree(id, prev));
    toast({
      title: 'Deleted',
      description: `Deleted: ${item.name}`,
      type: 'info'
    });
  };

  // Function to update file content
  const updateFileContent = (id: string, content: string) => {
    const file = findFileById(id);
    if (!file || file.type !== 'file') {
      toast({
        title: 'Error',
        description: 'File not found',
        type: 'error'
      });
      return;
    }

    const updatedFile = {
      ...file,
      content,
      updatedAt: new Date()
    };

    setFiles(prev => updateFileInTree(updatedFile, prev));
    
    // If this was the current file, update that reference too
    if (currentFile && currentFile.id === id) {
      setCurrentFile(updatedFile);
    }
  };

  // Function to select a file
  const selectFile = (id: string) => {
    const file = findFileById(id);
    if (file && file.type === 'file') {
      setCurrentFile(file);
    }
  };

  const value: FileSystemContextType = {
    files,
    currentFile,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
    updateFileContent,
    selectFile
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}; 