import { NextResponse } from 'next/server';
import * as solc from 'solc';
import parser from '@solidity-parser/parser';
import { logError } from '../../utils/helpers';
import { withRetry } from '../../utils/helpers';

// Common regex to match all Solidity import styles
const IMPORT_REGEX = /import\s+(?:{[^}]*}\s+from\s+)?["']([^"']+)["']\s*;/g;
const IMPORT_PATH_REGEX = /(?:from\s+)?["']([^"']+)["']\s*;/;

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid contract code' }, { status: 400 });
    }

    // Basic contract analysis
    let analysisWarnings: string[] = [];
    let analysisErrors: string[] = [];
    let securityScore = 100;
    try {
      const ast = parser.parse(code, { loc: true });
      const analysis = analyzeContract(ast, code);
      analysisWarnings = analysis.warnings;
      analysisErrors = analysis.errors;
      securityScore = analysis.securityScore;
    } catch (parseError: any) {
      logError('Solidity parsing error', parseError, { codeLength: code.length });
      return NextResponse.json({ 
        error: `Parsing error: ${parseError.message}`,
        errorType: 'PARSE_ERROR',
        location: parseError.location
      }, { status: 400 });
    }

    // Don't proceed with compilation if there are critical errors
    if (analysisErrors.length > 0) {
      return NextResponse.json({ 
        error: analysisErrors[0],
        errorType: 'VALIDATION_ERROR',
        errors: analysisErrors,
        warnings: analysisWarnings,
        securityScore,
        compilerVersion: 'N/A'
      }, { status: 400 });
    }

    // Use retry logic for compilation which can sometimes fail due to transient issues
    return await withRetry(() => compileContract(code, analysisWarnings, securityScore));
  } catch (error: any) {
    logError('Error in compile route', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error compiling contract',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

async function compileContract(code: string, analysisWarnings: string[], securityScore: number) {
  try {
    // Extract imports from the code to handle external libraries
    const importMatches = code.match(IMPORT_REGEX) || [];
    const imports = importMatches.map(match => {
      const pathMatch = match.match(IMPORT_PATH_REGEX);
      return pathMatch ? pathMatch[1] : '';
    }).filter(path => path);

    // Check for external library imports
    const externalImports = imports.filter(path => 
      path.startsWith('@openzeppelin/') || 
      path.startsWith('@chainlink/') ||
      path.startsWith('hardhat/')
    );
    
    // Initialize library cache
    const libraryCache = new Map<string, string>();
    const fetchQueue = new Set<string>(); // Track pending imports
    const fetchedLibraries = new Set<string>(); // Track successfully fetched imports
    const failedLibraries = new Set<string>(); // Track failed imports
    
    // Library version configurations
    const LIBRARY_CONFIGS = {
      // OpenZeppelin versions and compatibility
      openzeppelin: {
        defaultVersion: '5.0',  // Updated to default to v5.0
        baseUrl: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/',
        pathPrefix: '@openzeppelin/contracts/',
        relativePathInRepo: 'contracts/',
        versions: [
          { version: '5.0', branch: 'release-v5.0', features: ['Ownable(address)', 'draft-IERC6093.sol'] },
          { version: '4.9', branch: 'release-v4.9', features: ['Ownable()'] },
          { version: '4.8', branch: 'release-v4.8', features: ['Ownable()'] },
          { version: '4.7', branch: 'release-v4.7', features: ['Ownable()'] },
          { version: '4.4', branch: 'release-v4.4', features: ['Ownable()'] },
          { version: '3.4', branch: 'release-v3.4', features: ['Ownable()'] },
        ]
      },
      // Chainlink versions and compatibility
      chainlink: {
        defaultVersion: '0.8',
        baseUrl: 'https://raw.githubusercontent.com/smartcontractkit/chainlink/',
        pathPrefix: '@chainlink/contracts/',
        relativePathInRepo: 'contracts/',
        versions: [
          { version: '2.7', branch: 'v2.7.0', features: [] },
          { version: '2.6', branch: 'v2.6.0', features: [] },
          { version: '2.5', branch: 'v2.5.0', features: [] },
          { version: '2.4', branch: 'v2.4.0', features: [] },
          { version: '2.3', branch: 'v2.3.0', features: [] },
          { version: '2.2', branch: 'v2.2.0', features: [] },
          { version: '2.1', branch: 'v2.1.0', features: [] },
          { version: '2.0', branch: 'v2.0.0', features: [] },
          { version: '1.0', branch: 'v1.0.0', features: [] },
          { version: '0.8', branch: 'develop', features: [] }, // develop is most recent
        ]
      },
      // Add more libraries as needed, e.g., Uniswap, Aave, etc.
      uniswap: {
        defaultVersion: '4.0',
        baseUrl: 'https://raw.githubusercontent.com/Uniswap/v4-core/',
        pathPrefix: '@uniswap/v4-core/',
        relativePathInRepo: 'contracts/',
        versions: [
          { version: '4.0', branch: 'main', features: [] }, 
        ]
      },
      // Add support for hardhat libraries
      hardhat: {
        defaultVersion: 'latest',
        baseUrl: 'https://raw.githubusercontent.com/NomicFoundation/hardhat/',
        pathPrefix: 'hardhat/',
        relativePathInRepo: 'packages/hardhat-core/contracts/',
        versions: [
          { version: 'latest', branch: 'main', features: [] },
        ]
      }
    };
    
    // Extract library name from import path
    function getLibraryInfo(importPath: string): { name: string, config: any } | null {
      for (const [name, config] of Object.entries(LIBRARY_CONFIGS)) {
        if (importPath.startsWith(config.pathPrefix)) {
          return { name, config };
        }
      }
      return null;
    }
    
    // Map to track which version to use for each import path
    const importVersionMap = new Map<string, string>();

    // Determine required features from the code
    function detectRequiredFeatures(sourceCode: string): { [library: string]: string[] } {
      const features: { [library: string]: string[] } = {
        openzeppelin: [],
        chainlink: [],
        uniswap: [],
        hardhat: []
      };
      
      // OpenZeppelin feature detection
      if (sourceCode.includes('Ownable(') && !sourceCode.includes('Ownable()')) {
        features.openzeppelin.push('Ownable(address)');
      }
      
      // Check for other v5.0 specific features
      if (sourceCode.includes('IERC6093') || 
          sourceCode.includes('IERC20Errors') || 
          sourceCode.includes('IERC721Errors') || 
          sourceCode.includes('IERC1155Errors')) {
        features.openzeppelin.push('draft-IERC6093.sol');
      }
      
      // If we detect any imports from OpenZeppelin, check if it might need v5.0
      if (sourceCode.includes('@openzeppelin/contracts/') && 
         (sourceCode.includes('ERC20.sol') || 
          sourceCode.includes('ERC721.sol') || 
          sourceCode.includes('Ownable.sol'))) {
        // Look for v5 specific patterns
        if (sourceCode.includes('v5') || 
            sourceCode.includes('Ownable(msg.sender)') || 
            sourceCode.includes('OwnableUpgradeable(') ||
            sourceCode.includes('AccessManager')) {
          features.openzeppelin.push('v5.0'); // Mark as needing v5.0
        }
      }
      
      return features;
    }
    
    // Detect explicit version references in code
    function detectExplicitVersions(sourceCode: string): { [library: string]: string | null } {
      const versions: { [library: string]: string | null } = {
        openzeppelin: null,
        chainlink: null,
        uniswap: null,
        hardhat: null
      };
      
      // Check for OpenZeppelin version
      const ozVersionMatch = sourceCode.match(/@openzeppelin\/contracts[@\s]*[v]*([\d.]+)/);
      if (ozVersionMatch && ozVersionMatch[1]) {
        versions.openzeppelin = ozVersionMatch[1];
      }
      
      // Check for Chainlink version
      const chainlinkVersionMatch = sourceCode.match(/@chainlink\/contracts[@\s]*[v]*([\d.]+)/);
      if (chainlinkVersionMatch && chainlinkVersionMatch[1]) {
        versions.chainlink = chainlinkVersionMatch[1];
      }
      
      // Add more libraries as needed
      
      return versions;
    }
    
    // Detect which library versions to use based on code content
    function detectLibraryVersions(sourceCode: string): { [library: string]: string } {
      const requiredFeatures = detectRequiredFeatures(sourceCode);
      const explicitVersions = detectExplicitVersions(sourceCode);
      const detectedVersions: { [library: string]: string } = {};
      
      // Process each library
      for (const [libraryName, config] of Object.entries(LIBRARY_CONFIGS)) {
        let selectedVersion = config.defaultVersion;
        const libFeatures = requiredFeatures[libraryName] || [];
        
        // Check for explicit version first
        if (explicitVersions[libraryName]) {
          const explicitVersion = explicitVersions[libraryName]!;
          const majorMinor = explicitVersion.split('.').slice(0, 2).join('.');
          
          // Find closest matching version
          const matchingVersion = config.versions.find(v => v.version.startsWith(majorMinor));
          if (matchingVersion) {
            console.log(`Using explicitly referenced ${libraryName} v${matchingVersion.version}`);
            selectedVersion = matchingVersion.version;
          }
        }
        // Check for features that require v5.0
        else if (libFeatures.includes('draft-IERC6093.sol') || 
                 libFeatures.includes('v5.0') || 
                 libFeatures.includes('Ownable(address)')) {
          console.log(`Selected ${libraryName} v5.0 based on required features: ${libFeatures.join(', ')}`);
          selectedVersion = '5.0';
        }
        // Then check for other features
        else if (libFeatures.length > 0) {
          // Find the earliest version that supports all required features
          for (const { version, features } of config.versions) {
            const hasAllFeatures = libFeatures.every(f => features.includes(f));
            if (hasAllFeatures) {
              console.log(`Selected ${libraryName} v${version} based on required features: ${libFeatures.join(', ')}`);
              selectedVersion = version;
              break;
            }
          }
        }
        
        detectedVersions[libraryName] = selectedVersion;
        console.log(`Using ${libraryName} version ${selectedVersion}`);
      }
      
      return detectedVersions;
    }
    
    // Get branch name for a specific library and version
    function getLibraryBranch(libraryName: string, version: string): string {
      const config = LIBRARY_CONFIGS[libraryName as keyof typeof LIBRARY_CONFIGS];
      if (!config) return 'main';
      
      const versionInfo = config.versions.find(v => v.version === version);
      return versionInfo?.branch || 'main';
    }
    
    // Detect and set library versions based on code content
    const detectedVersions = detectLibraryVersions(code);
    
    // Fetch an external library from its source
    async function fetchExternalLibrary(importPath: string): Promise<string> {
      // Check cache first
      if (libraryCache.has(importPath)) {
        return libraryCache.get(importPath)!;
      }
      
      // Mark as being fetched to avoid duplicate requests
      if (fetchQueue.has(importPath)) {
        // This library is already being fetched, wait for it
        let retries = 5;
        while (retries > 0 && !libraryCache.has(importPath) && !failedLibraries.has(importPath)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }
        
        if (libraryCache.has(importPath)) {
          return libraryCache.get(importPath)!;
        } else if (failedLibraries.has(importPath)) {
          throw new Error(`Failed to fetch library: ${importPath}`);
        }
      }
      
      fetchQueue.add(importPath);
      
      try {
        let url = '';
        let fallbackUrls: string[] = [];
        let content: string | null = null;
        
        // Determine which library this import is from
        const libraryInfo = getLibraryInfo(importPath);
        
        if (libraryInfo) {
          const { name: libraryName, config } = libraryInfo;
          const relativePath = importPath.replace(config.pathPrefix, '');
          
          // Get version to use (from map or detected)
          const primaryVersion = importVersionMap.get(importPath) || detectedVersions[libraryName];
          const primaryBranch = getLibraryBranch(libraryName, primaryVersion);
          
          // Construct URL
          url = `${config.baseUrl}${primaryBranch}/${config.relativePathInRepo}${relativePath}`;
          
          // Set up fallback URLs with other versions
          fallbackUrls = config.versions
            .filter(v => v.version !== primaryVersion)
            .map(v => `${config.baseUrl}${v.branch}/${config.relativePathInRepo}${relativePath}`);
        } else {
          throw new Error(`Unsupported external library: ${importPath}`);
        }
        
        // Try primary URL first
        try {
          console.log(`Fetching library ${importPath} from ${url}`);
          const response = await fetch(url, {
            headers: {
              'Accept': 'text/plain',
              'User-Agent': 'Karibu-IDE-Compiler/1.0'
            }
          });
          
          if (response.ok) {
            content = await response.text();
          } else {
            console.warn(`Failed to fetch from primary URL (${response.status}), trying fallbacks...`);
          }
        } catch (error) {
          console.warn(`Error fetching from primary URL: ${error}`);
        }
        
        // If primary URL failed, try fallbacks
        if (!content && fallbackUrls.length > 0) {
          for (const fallbackUrl of fallbackUrls) {
            try {
              console.log(`Trying fallback URL: ${fallbackUrl}`);
              const response = await fetch(fallbackUrl, {
                headers: {
                  'Accept': 'text/plain',
                  'User-Agent': 'Karibu-IDE-Compiler/1.0'
                }
              });
              
              if (response.ok) {
                content = await response.text();
                
                // Extract library and version from the URL
                const libraryInfo = getLibraryInfo(importPath);
                if (libraryInfo) {
                  for (const version of libraryInfo.config.versions) {
                    if (fallbackUrl.includes(version.branch)) {
                      console.log(`Successfully fetched ${importPath} using ${libraryInfo.name} version ${version.version}`);
                      
                      // Update version map for this import path
                      importVersionMap.set(importPath, version.version);
                      break;
                    }
                  }
                }
                
                break;
              }
            } catch (error) {
              console.warn(`Error fetching from fallback URL: ${error}`);
            }
          }
        }
        
        if (!content) {
          throw new Error(`Failed to fetch library ${importPath} from all sources`);
        }
        
        // Cache the result
        libraryCache.set(importPath, content);
        fetchedLibraries.add(importPath);
        
        // Find imports in this file and queue them
        const nestedImportMatches = content.match(IMPORT_REGEX) || [];
        const nestedImports = nestedImportMatches
          .map(match => {
            const pathMatch = match.match(IMPORT_PATH_REGEX);
            return pathMatch ? pathMatch[1] : '';
          })
          .filter(path => path);
          
        // Process relative imports
        const nestedExternalImports = nestedImports
          .map(path => {
            // Convert relative imports to absolute paths
            if (path.startsWith('./') || path.startsWith('../')) {
              return resolveRelativePath(importPath, path);
            }
            return path;
          })
          .filter(path => {
            // Check if path is from a known library
            return Object.values(LIBRARY_CONFIGS).some(config => 
              path.startsWith(config.pathPrefix)
            );
          });
        
        // Queue nested imports for fetching, using the same version as the parent
        if (nestedExternalImports.length > 0) {
          console.log(`Found ${nestedExternalImports.length} nested imports in ${importPath}`);
          
          // Propagate version information to nested imports
          const libraryInfo = getLibraryInfo(importPath);
          if (libraryInfo) {
            const libraryName = libraryInfo.name;
            const version = importVersionMap.get(importPath) || detectedVersions[libraryName];
            
            for (const nestedImport of nestedExternalImports) {
              const nestedLibInfo = getLibraryInfo(nestedImport);
              if (nestedLibInfo && nestedLibInfo.name === libraryName) {
                importVersionMap.set(nestedImport, version);
              }
            }
          }
          
          await fetchDependencies(nestedExternalImports);
        }
        
        return content;
      } catch (error: any) {
        console.error(`Error fetching external library ${importPath}:`, error);
        failedLibraries.add(importPath);
        throw new Error(`Failed to fetch external library: ${importPath} - ${error.message}`);
      } finally {
        fetchQueue.delete(importPath);
      }
    }
    
    // Resolve relative import paths to absolute paths
    function resolveRelativePath(basePath: string, relativePath: string): string {
      // Get library info for base path
      const libraryInfo = getLibraryInfo(basePath);
      if (!libraryInfo) {
        return relativePath; // Not a library path we manage
      }
      
      // Extract the directory part of the base path
      const parts = basePath.split('/');
      const baseDir = parts.slice(0, parts.length - 1).join('/');
      
      // Handle different relative path formats
      if (relativePath.startsWith('./')) {
        // Same directory: ./Contract.sol
        return `${baseDir}/${relativePath.substring(2)}`;
      } else if (relativePath.startsWith('../')) {
        // Parent directory: ../Contract.sol
        let result = baseDir;
        let relPath = relativePath;
        
        // Process each "../" segment
        while (relPath.startsWith('../')) {
          // Remove one directory level from the base path
          result = result.substring(0, result.lastIndexOf('/'));
          // Remove the "../" from the relative path
          relPath = relPath.substring(3);
        }
        
        return `${result}/${relPath}`;
      }
      
      // Return the original path if it's not relative
      return relativePath;
    }
    
    // Parse nested imports from already fetched content
    function parseNestedImports(content: string, parentPath: string): string[] {
      // Extract all import statements
      const importMatches = content.match(IMPORT_REGEX) || [];
      const imports = importMatches
        .map(match => {
          const pathMatch = match.match(IMPORT_PATH_REGEX);
          return pathMatch ? pathMatch[1] : '';
        })
        .filter(path => path);
      
      // Convert relative imports to absolute paths
      return imports.map(importPath => {
        // If it's an absolute path (starts with @), return as is
        if (importPath.startsWith('@')) {
          return importPath;
        }
        
        // Handle relative imports
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          return resolveRelativePath(parentPath, importPath);
        }
        
        // If it's not relative but also not starting with @, 
        // it might be a standard library or a direct import
        // For OpenZeppelin, prepend the path to make it absolute
        const libraryInfo = getLibraryInfo(parentPath);
        if (libraryInfo && libraryInfo.name) {
          const libraryName = libraryInfo.name;
          const config = LIBRARY_CONFIGS[libraryName as keyof typeof LIBRARY_CONFIGS];
          if (config && config.pathPrefix) {
            // For simplicity, assume it's relative to the base of the library
            return `${config.pathPrefix}${importPath}`;
          }
        }
        
        return importPath;
      });
    }

    // Fetch all dependencies iteratively (non-recursive to avoid stack overflow)
    async function fetchDependencies(imports: string[]): Promise<void> {
      // Initialize a queue of imports to process
      const pendingImports = new Set(imports);
      const processedImports = new Set<string>();
      
      let iterations = 0;
      const MAX_ITERATIONS = 1000; // Safety limit
      
      // Process imports iteratively
      while (pendingImports.size > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // Get next import
        const importPath = Array.from(pendingImports)[0];
        pendingImports.delete(importPath);
        
        // Skip if already processed
        if (libraryCache.has(importPath) || 
            failedLibraries.has(importPath) || 
            processedImports.has(importPath)) {
          continue;
        }
        
        processedImports.add(importPath);
        
        try {
          const content = await fetchExternalLibrary(importPath);
          console.log(`✓ Successfully fetched: ${importPath}`);
          
          // After successfully fetching a file, parse it for more imports
          const nestedImports = parseNestedImports(content, importPath);
          
          if (nestedImports.length > 0) {
            console.log(`Found ${nestedImports.length} nested imports in ${importPath}`);
            
            // Add new imports to pending queue (filter already processed)
            for (const nestedImport of nestedImports) {
              if (!processedImports.has(nestedImport) && 
                  !libraryCache.has(nestedImport) && 
                  !failedLibraries.has(nestedImport)) {
                pendingImports.add(nestedImport);
              }
            }
          }
        } catch (error) {
          console.error(`✗ Failed to fetch ${importPath}:`, error);
        }
      }
      
      // Report if we hit the iteration limit
      if (iterations >= MAX_ITERATIONS) {
        console.warn(`Warning: Reached maximum iterations (${MAX_ITERATIONS}) while resolving imports`);
      }
    }

    // Create import callback function for the Solidity compiler
    const findImports = (path: string): { contents: string, error?: string } => {
      try {
        // First, check if we already have this library in the cache
        if (libraryCache.has(path)) {
          console.log(`Using cached library: ${path}`);
          return { contents: libraryCache.get(path)! };
        }
        
        // Log the missing import
        console.log(`Import resolver called for: ${path}`);
        
        // Handle different library types
        if (path.startsWith('@openzeppelin/contracts/')) {
          if (path.includes('draft-IERC6093.sol')) {
            console.log(`Providing fallback for draft-IERC6093.sol`);
            // Provide a simplified interface that will allow compilation to continue
            return {
              contents: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Standard ERC20 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093 specification.
 */
interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

/**
 * @dev Standard ERC721 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093 specification.
 */
interface IERC721Errors {
    error ERC721InvalidOwner(address owner);
    error ERC721NonexistentToken(uint256 tokenId);
    error ERC721InvalidSender(address sender);
    error ERC721InvalidReceiver(address receiver);
    error ERC721InsufficientApproval(address operator, uint256 tokenId);
    error ERC721InvalidApprover(address approver);
    error ERC721InvalidOperator(address operator);
}

/**
 * @dev Standard ERC1155 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093 specification.
 */
interface IERC1155Errors {
    error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId);
    error ERC1155InvalidSender(address sender);
    error ERC1155InvalidReceiver(address receiver);
    error ERC1155InsufficientApproval(address operator, uint256 tokenId);
    error ERC1155InvalidApprover(address approver);
    error ERC1155InvalidOperator(address operator);
    error ERC1155InvalidArrayLength(uint256 idsLength, uint256 valuesLength);
}

// Simple version of the draft IERC6093 interface
interface IERC6093 is IERC20Errors, IERC721Errors, IERC1155Errors {}
`
            };
          }
          
          // Provide a minimal Context implementation
          if (path.endsWith('/utils/Context.sol')) {
            console.log(`Providing fallback for Context.sol`);
            return {
              contents: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}
`
            };
          }
          
          // Provide a minimal Ownable implementation
          if (path.endsWith('/access/Ownable.sol')) {
            console.log(`Providing fallback for Ownable.sol`);
            return {
              contents: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * 'onlyOwner' functions. Can only be called by the current owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account ('newOwner').
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account ('newOwner').
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
`
            };
          }
          
          // Return a descriptive error that suggests the user what might be wrong
          return {
            contents: '',
            error: `File ${path} not found: OpenZeppelin library file needs to be pre-fetched. Check if you're using the correct OpenZeppelin version (detected: ${detectedVersions['openzeppelin'] || 'unknown'}).`
          };
        }
        
        // Handle Chainlink imports
        if (path.startsWith('@chainlink/contracts/')) {
          return { 
            contents: '', 
            error: `File ${path} not found: Chainlink library file needs to be pre-fetched.` 
          };
        }
        
        // Handle Uniswap imports
        if (path.startsWith('@uniswap/')) {
          return { 
            contents: '', 
            error: `File ${path} not found: Uniswap library file needs to be pre-fetched.` 
          };
        }
        
        // Default case for unfetched libraries
        return { 
          contents: '', 
          error: `File ${path} not found: External library needs to be pre-fetched.` 
        };
      } catch (error: any) {
        console.error(`Error processing import ${path}:`, error);
        return { 
          contents: '', 
          error: `Error processing import ${path}: ${error.message}` 
        };
      }
    };

    // Pre-fetch all external imports and their dependencies
    if (externalImports.length > 0) {
      console.log(`Pre-fetching external libraries starting with ${externalImports.length} root imports`);
      await fetchDependencies(externalImports);
      
      // Log summary of fetched libraries
      console.log(`Successfully fetched ${fetchedLibraries.size} libraries`);
      
      // If any libraries failed to fetch, provide detailed error
      if (failedLibraries.size > 0) {
        console.warn(`Failed to fetch ${failedLibraries.size} libraries: ${Array.from(failedLibraries).join(', ')}`);
      }
    }

    // Setup compiler input
    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: code
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    // Add the imports callback if we have external imports
    const hasExternalImports = externalImports.length > 0;
    let output;
    
    if (hasExternalImports) {
      console.log(`Compiling with ${externalImports.length} external libraries`);
      output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    } else {
      // Standard compilation without import resolver
      output = JSON.parse(solc.compile(JSON.stringify(input)));
    }

    // Check for compilation errors
    if (output.errors && output.errors.some((error: any) => error.severity === 'error')) {
      const errorMessages = output.errors
        .filter((error: any) => error.severity === 'error')
        .map((error: any) => error.formattedMessage)
        .join('\n');
      
      return NextResponse.json({ 
        error: errorMessages,
        errorType: 'COMPILATION_ERROR',
        errors: output.errors.filter((error: any) => error.severity === 'error'),
        warnings: analysisWarnings,
        securityScore
      }, { status: 400 });
    }

    // Extract compiled contract data
    const contractName = Object.keys(output.contracts['contract.sol'])[0];
    
    if (!contractName) {
      return NextResponse.json({ 
        error: 'No contract found in the provided code',
        errorType: 'NO_CONTRACT_FOUND',
        warnings: analysisWarnings,
        securityScore
      }, { status: 400 });
    }
    
    const contract = output.contracts['contract.sol'][contractName];

    // Add any warnings to the response
    const compilerWarnings = output.errors?.filter((error: any) => error.severity === 'warning')
      .map((warning: any) => warning.formattedMessage) || [];

    // Combine compiler and analysis warnings
    const warnings = [...compilerWarnings, ...analysisWarnings];

    // Perform additional bytecode analysis
    const bytecodeAnalysis = analyzeBytecode(contract.evm.bytecode.object);
    warnings.push(...bytecodeAnalysis.warnings);
    
    // Update security score based on bytecode analysis
    const updatedSecurityScore = Math.max(0, securityScore - bytecodeAnalysis.securityImpact);

    console.log(`Successfully compiled contract: ${contractName}`);
    
    return NextResponse.json({
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      contractName,
      warnings,
      securityScore: updatedSecurityScore,
      compilerVersion: solc.version(),
      gasEstimates: contract.evm.gasEstimates,
      methodIdentifiers: contract.evm.methodIdentifiers,
      deployedBytecodeSize: contract.evm.deployedBytecode.object.length / 2,
    });
  } catch (error: any) {
    logError('Error in compileContract function', error, { codeSnippet: code.substring(0, 100) });
    throw error; // Let the retry mechanism handle it
  }
}

function analyzeContract(ast: any, code: string): { warnings: string[], errors: string[], securityScore: number } {
  const warnings: string[] = [];
  const errors: string[] = [];
  let securityScore = 100;
  let hasExternalCalls = false;
  let hasReentrancyProtection = false;
  let hasDelegateCall = false;
  let hasUnboundedLoop = false;
  const stateVars = new Set<string>();
  const writtenAfterCall = new Set<string>();

  // Extract all state variables first
  parser.visit(ast, {
    StateVariableDeclaration(node: any) {
      node.variables.forEach((variable: any) => {
        stateVars.add(variable.name);
      });
    }
  });

  // Now do the complete analysis
  parser.visit(ast, {
    ForStatement(node: any) {
      if (!node.test) {
        warnings.push('Unbounded for loop detected. Consider adding a condition to prevent infinite loops.');
        hasUnboundedLoop = true;
        securityScore -= 15;
      }
    },
    WhileStatement(node: any) {
      if (node.test && node.test.type === 'BooleanLiteral' && node.test.value === true) {
        warnings.push('Infinite while loop detected (while(true)). This may cause the transaction to run out of gas.');
        hasUnboundedLoop = true;
        securityScore -= 20;
      }
    },
    ModifierInvocation(node: any) {
      if (node.name.name === 'nonReentrant') {
        hasReentrancyProtection = true;
      }
    },
    FunctionCall(node: any) {
      if (node.expression && 
          node.expression.type === 'MemberAccess') {
        
        // Check for external calls
        if (node.expression.memberName === 'call' || 
            node.expression.memberName === 'transfer' || 
            node.expression.memberName === 'send') {
          hasExternalCalls = true;
          
          // Check return value validation for calls (only low-level calls, not transfer)
          if (node.expression.memberName === 'call' && 
              (!node.parent || node.parent.type !== 'IfStatement' && 
               node.parent.type !== 'BinaryOperation' && 
               node.parent.type !== 'VariableDeclarationStatement')) {
            warnings.push('Unchecked external call detected. Always check the return value of low-level calls.');
            securityScore -= 15;
          }
        }
        
        // Check for delegatecall which is more dangerous
        if (node.expression.memberName === 'delegatecall') {
          hasDelegateCall = true;
          warnings.push('Delegatecall usage detected. Ensure you trust the called contract completely as it can access your entire state.');
          securityScore -= 20;
        }
      }
    },
    ContractDefinition(node: any) {
      if (node.baseContracts) {
        for (const base of node.baseContracts) {
          if (base.baseName.name === 'ReentrancyGuard') {
            hasReentrancyProtection = true;
          }
        }
      }
    },
    ExpressionStatement(node: any) {
      // Check for state variables written after external calls
      if (node.expression.type === 'Assignment' && hasExternalCalls) {
        const varName = node.expression.left.name;
        if (stateVars.has(varName)) {
          writtenAfterCall.add(varName);
        }
      }
    }
  });

  // Post processing
  if (hasExternalCalls && !hasReentrancyProtection && writtenAfterCall.size > 0) {
    warnings.push(`State variable(s) ${Array.from(writtenAfterCall).join(', ')} modified after external calls without reentrancy protection.`);
    securityScore -= 25; // Critical security issue
  }

  // Check for floating pragma
  const pragmaRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)/;
  if (pragmaRegex.test(code)) {
    warnings.push('Floating pragma detected. Consider using a fixed compiler version for production.');
    securityScore -= 5;
  }

  // Check for outdated Solidity version
  const oldVersionRegex = /pragma\s+solidity\s+(?:\^|>|>=|<|<=)\s*0\.[1-7]\.\d+/;
  if (oldVersionRegex.test(code)) {
    warnings.push('Outdated Solidity version detected. Consider using version 0.8.0 or later for built-in overflow protection.');
    securityScore -= 15;
  }

  // Check for contract size
  if (code.length > 24576) {
    warnings.push('Contract code is very large and may exceed deployment size limits on Hedera.');
    securityScore -= 10;
  }

  // Check for use of dangerous functions
  if (code.includes('selfdestruct') || code.includes('suicide')) {
    warnings.push('Use of selfdestruct/suicide detected, which will be deprecated in future Solidity versions.');
    securityScore -= 10;
  }

  if (code.includes('tx.origin')) {
    warnings.push('Use of tx.origin detected, which can lead to phishing attacks. Consider using msg.sender instead.');
    securityScore -= 15;
  }

  // Ensure security score doesn't go below 0
  securityScore = Math.max(0, securityScore);
  
  return { warnings, errors, securityScore };
}

function analyzeBytecode(bytecode: string): { warnings: string[], securityImpact: number } {
  const warnings: string[] = [];
  let securityImpact = 0;
  
  // Check bytecode size
  const bytecodeSize = bytecode.length / 2; // Convert hex string to bytes
  if (bytecodeSize > 24576) { // 24KB bytecode size
    warnings.push(`Bytecode size (${bytecodeSize} bytes) exceeds 24KB and may not deploy on all EVM-compatible chains.`);
    securityImpact += 10;
  }
  
  // Check for bytecode signatures of known vulnerabilities
  // These are simplified examples - real checks would be more complex
  
  // Check for EXTCODESIZE zero-address check (common protection against contract calls)
  // This is a very simplified check - in practice would need more sophisticated analysis
  if (!bytecode.includes('3b') || !bytecode.includes('73000000000000000000000000000000000000000')) {
    warnings.push('May be missing zero-address validation for external contract calls.');
    securityImpact += 5;
  }
  
  return { warnings, securityImpact };
} 