import { NextRequest, NextResponse } from 'next/server';
import solc from 'solc';
import axios from 'axios';
import path from 'path';

// Define common external libraries repositories
const EXTERNAL_LIBRARIES = {
  '@openzeppelin/contracts': {
    url: 'https://github.com/OpenZeppelin/openzeppelin-contracts',
    versions: [
      {
        name: '5.0',
        branch: 'release-v5.0',
        base: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/release-v5.0/contracts/',
        features: ['Ownable(address)', 'IERC6093', 'AccessManager']
      },
      {
        name: '4.9',
        branch: 'release-v4.9',
        base: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/release-v4.9/contracts/',
        features: ['Ownable()']
      },
      {
        name: '4.7',
        branch: 'release-v4.7',
        base: 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/release-v4.7/contracts/',
        features: ['Ownable()']
      }
    ],
    defaultVersion: '5.0'
  },
  '@chainlink/contracts': {
    url: 'https://github.com/smartcontractkit/chainlink',
    versions: [
      {
        name: 'latest',
        branch: 'develop',
        base: 'https://raw.githubusercontent.com/smartcontractkit/chainlink/develop/contracts/',
        features: []
      },
      {
        name: 'v2.0.0',
        branch: 'v2.0.0',
        base: 'https://raw.githubusercontent.com/smartcontractkit/chainlink/v2.0.0/contracts/',
        features: []
      }
    ],
    defaultVersion: 'latest'
  },
  '@uniswap/v3-core': {
    url: 'https://github.com/Uniswap/v3-core',
    versions: [
      {
        name: 'latest',
        branch: 'main',
        base: 'https://raw.githubusercontent.com/Uniswap/v3-core/main/contracts/',
        features: []
      }
    ],
    defaultVersion: 'latest'
  },
  '@uniswap/v4-core': {
    url: 'https://github.com/Uniswap/v4-core',
    versions: [
      {
        name: 'latest',
        branch: 'main',
        base: 'https://raw.githubusercontent.com/Uniswap/v4-core/main/',
        features: []
      }
    ],
    defaultVersion: 'latest'
  }
};

// Create a cache for external libraries to avoid repeated fetches
const libraryCache = new Map<string, string>();
const failedFetches = new Map<string, Error>();

// Keep track of which library version to use for each path prefix
const libraryVersionMap = new Map<string, string>();

// Create a mapping of import paths to their corresponding file paths
const importPathMapping = new Map<string, string>();

// Detect required library version from code
function detectLibraryVersion(code: string): void {
  // OpenZeppelin version detection
  if (code.includes('@openzeppelin/contracts')) {
    // Check for v5.0 specific features
    if (code.includes('Ownable(') && !code.includes('Ownable()') || 
        code.includes('IERC6093') || 
        code.includes('AccessManager') || 
        code.includes('import {') || // v5.0 uses the import {X} from 'Y' syntax
        code.match(/@openzeppelin\/contracts(\/)?(\/v5|\@5|@v5|@~5)/)) {
      
      libraryVersionMap.set('@openzeppelin/contracts', '5.0');
      console.log('Detected OpenZeppelin v5.0 features');
    }
    // Can add more version detection logic here
  }

  // Chainlink version detection  
  if (code.includes('@chainlink/contracts')) {
    if (code.match(/@chainlink\/contracts(\/)?(\/v2|\@2|@v2)/)) {
      libraryVersionMap.set('@chainlink/contracts', 'v2.0.0');
    }
  }
}

/**
 * Fetch external library content from GitHub or other sources with retry and version fallback
 */
async function fetchExternalLibrary(importPath: string): Promise<string> {
  // Check cache first
  if (libraryCache.has(importPath)) {
    return libraryCache.get(importPath)!;
  }
  
  // Check if we've already tried and failed to fetch this
  if (failedFetches.has(importPath)) {
    throw failedFetches.get(importPath)!;
  }
  
  try {
    // Determine which library this import is from
    const libraryKey = Object.keys(EXTERNAL_LIBRARIES).find(key => 
      importPath.startsWith(key)
    );

    if (!libraryKey) {
      throw new Error(`Unsupported external library: ${importPath}`);
    }
    
    const library = EXTERNAL_LIBRARIES[libraryKey as keyof typeof EXTERNAL_LIBRARIES];
    const relativePath = importPath.replace(libraryKey, '').replace(/^\//, '');
    
    // Determine which version to use
    const versionToUse = libraryVersionMap.get(libraryKey) || library.defaultVersion;
    const versionInfo = library.versions.find(v => v.name === versionToUse) || library.versions[0];
    
    // Try with the selected version first
    let content: string | null = null;
    let error: Error | null = null;
    
    const url = `${versionInfo.base}${relativePath}`;
    log(`Fetching ${importPath} from ${url}`);
    
    // Helper function to fetch with retry
    async function fetchWithRetry(url: string, retries = SAFETY_LIMITS.MAX_FETCH_RETRIES): Promise<string> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SAFETY_LIMITS.FETCH_TIMEOUT);
        
        try {
          const response = await axios.get(url, {
            timeout: SAFETY_LIMITS.FETCH_TIMEOUT,
            signal: controller.signal as any,
            headers: {
              'Accept': 'text/plain',
              'User-Agent': 'Karibu-IDE/1.0'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (response.status === 200) {
            return response.data;
          }
          throw new Error(`HTTP status ${response.status}`);
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
          error.message = `Request timed out after ${SAFETY_LIMITS.FETCH_TIMEOUT}ms`;
        }
        
        if (retries > 0) {
          // Exponential backoff
          const delay = 1000 * Math.pow(2, SAFETY_LIMITS.MAX_FETCH_RETRIES - retries);
          log(`Retrying fetch in ${delay}ms (${retries} retries left): ${url}`, 'warn');
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, retries - 1);
        }
        
        throw error;
      }
    }
    
    // Try primary version
    try {
      content = await fetchWithRetry(url);
      log(`✅ Successfully fetched ${importPath} using ${versionInfo.name}`);
    } catch (e: any) {
      error = e;
      log(`Failed to fetch ${importPath} with version ${versionInfo.name}: ${e.message}`, 'warn');
    }
    
    // If primary version failed, try other versions as fallbacks
    if (!content) {
      for (const version of library.versions) {
        // Skip the version we already tried
        if (version.name === versionToUse) continue;
        
        const fallbackUrl = `${version.base}${relativePath}`;
        log(`Trying fallback: ${fallbackUrl}`);
        
        try {
          content = await fetchWithRetry(fallbackUrl);
          log(`✅ Successfully fetched ${importPath} using fallback version ${version.name}`);
          
          // Update version map to use this version for future imports from this library
          libraryVersionMap.set(libraryKey, version.name);
          break;
        } catch (e) {
          log(`Fallback fetch failed for ${fallbackUrl}`, 'warn');
        }
      }
    }
    
    // Special handling for common edge cases
    if (!content) {
      // Special handling for draft files in OpenZeppelin
      if (importPath.includes('draft-IERC6093.sol') && libraryKey === '@openzeppelin/contracts') {
        log('Attempting to fetch draft-IERC6093.sol from v5.0 branch...', 'info');
        try {
          const specialUrl = 'https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/release-v5.0/contracts/interfaces/draft-IERC6093.sol';
          content = await fetchWithRetry(specialUrl);
          log('✅ Successfully fetched draft-IERC6093.sol using special URL');
        } catch (e) {
          log('Special fetch for draft-IERC6093.sol failed', 'warn');
        }
      }
      
      // Handle other common edge cases here
      
      // If still no content, throw the error
      if (!content) {
        throw error || new Error(`Failed to fetch ${importPath} from all sources`);
      }
    }
    
    // Cache the successful result
    libraryCache.set(importPath, content);
    return content;
  } catch (error: any) {
    log(`Error fetching external library ${importPath}: ${error.message}`, 'error');
    failedFetches.set(importPath, error);
    throw error;
  }
}

/**
 * Resolve imports function for solc
 */
function createImportResolver(files: Record<string, string>, importedFiles: Set<string>, resolvedImports: Set<string>) {
  return function findImports(importPath: string) {
    // If it's already in our files, use that
    if (files[importPath]) {
      return { contents: files[importPath] };
    }
    
    // For absolute imports in the project (starting with /)
    const absolutePath = importPath.startsWith('/') ? importPath.substring(1) : importPath;
    if (files[absolutePath]) {
      return { contents: files[absolutePath] };
    }
    
    // Check if we've already resolved this import path to a file
    if (importPathMapping.has(importPath)) {
      const mappedPath = importPathMapping.get(importPath)!;
      if (files[mappedPath]) {
        return { contents: files[mappedPath] };
      }
    }
    
    // For relative imports, we attempt to resolve in the context of the current file
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Look for potential matches by filename in our files
      const fileName = importPath.split('/').pop() || '';
      const fileNameWithExtension = fileName.endsWith('.sol') ? fileName : `${fileName}.sol`;
      
      // Check if there's a file with this name in our files
      for (const filePath of Object.keys(files)) {
        const fileBaseName = filePath.split('/').pop() || '';
        if (fileBaseName === fileNameWithExtension || fileBaseName === fileName) {
          // Found a potential match by filename
          log(`Resolved relative import ${importPath} to ${filePath} by filename match`, 'info');
          importPathMapping.set(importPath, filePath);
          // Mark this as resolved so it's not treated as an external import
          resolvedImports.add(importPath);
          return { contents: files[filePath] };
        }
      }
    }
    
    // Only add to importedFiles if not already resolved
    importedFiles.add(importPath);
    
    // External import that we need to fetch
    return { error: `External import ${importPath} needs to be resolved` };
  };
}

// Add logging utility
function log(message: string, type: 'info' | 'warn' | 'error' = 'info', data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';

  console[type](`${prefix} [${timestamp}] ${message}`);
  if (data) {
    console[type](data);
  }
}

// Add safety limits for compilation
const SAFETY_LIMITS = {
  MAX_FILES: 100,           // Maximum number of files to compile
  MAX_FILE_SIZE: 500 * 1024, // Maximum file size (500 KB)
  MAX_TOTAL_SIZE: 2 * 1024 * 1024, // Maximum total size of all files (2 MB)
  MAX_IMPORTS: 200,         // Maximum number of imports to resolve
  MAX_FETCH_RETRIES: 3,     // Maximum retries for fetching a library
  FETCH_TIMEOUT: 10000,     // Timeout for fetching a library (10 seconds)
  COMPILE_TIMEOUT: 30000,   // Timeout for compilation (30 seconds)
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  log('Received compilation request');
  
  try {
    const { files, mainFile } = await request.json();
    
    if (!files || !mainFile) {
      return NextResponse.json(
        { error: 'Missing required fields: files and mainFile' },
        { status: 400 }
      );
    }
    
    // Validate input
    const fileCount = Object.keys(files).length;
    if (fileCount > SAFETY_LIMITS.MAX_FILES) {
      log(`Too many files: ${fileCount}`, 'error');
      return NextResponse.json(
        { error: `Too many files (${fileCount}). Maximum is ${SAFETY_LIMITS.MAX_FILES}` },
        { status: 400 }
      );
    }
    
    let totalSize = 0;
    for (const [path, content] of Object.entries(files)) {
      const size = (content as string).length;
      totalSize += size;
      
      if (size > SAFETY_LIMITS.MAX_FILE_SIZE) {
        log(`File too large: ${path} (${size} bytes)`, 'error');
        return NextResponse.json(
          { error: `File ${path} is too large (${size} bytes). Maximum is ${SAFETY_LIMITS.MAX_FILE_SIZE} bytes` },
          { status: 400 }
        );
      }
    }
    
    if (totalSize > SAFETY_LIMITS.MAX_TOTAL_SIZE) {
      log(`Total size too large: ${totalSize}`, 'error');
      return NextResponse.json(
        { error: `Total size of all files (${totalSize} bytes) exceeds maximum of ${SAFETY_LIMITS.MAX_TOTAL_SIZE} bytes` },
        { status: 400 }
      );
    }
    
    if (!files[mainFile]) {
      log(`Main file not found: ${mainFile}`, 'error');
      return NextResponse.json(
        { error: `Main file ${mainFile} not found in provided files` },
        { status: 400 }
      );
    }
    
    // Make a copy of files to avoid modifying the input
    const compilationFiles = { ...files };
    const importedFiles = new Set<string>();
    const resolvedImports = new Set<string>();
    
    // Keep statistics to log at the end
    const stats = {
      totalFiles: fileCount,
      externalImports: 0,
      resolvedImports: 0,
      failedImports: 0,
      compilationTime: 0
    };
    
    // Run version detection across all files to set version preferences
    log('Analyzing code for library version requirements...');
    for (const [filePath, content] of Object.entries(compilationFiles)) {
      detectLibraryVersion(content as string);
    }
    
    // Log which versions we're using
    for (const [library, version] of libraryVersionMap.entries()) {
      log(`Using ${library} version ${version}`);
    }
    
    // First pass to collect all imports
    const findImports = createImportResolver(compilationFiles, importedFiles, resolvedImports);
    
    // Extract all imports from the files to look for external libraries
    for (const [filepath, content] of Object.entries(files)) {
      // Match both styles of imports: import "X" and import {Y} from "X"
      const importMatches = ((content as string).match(/import\s+(?:{[^}]*}\s+from\s+)?['"](.+?)['"]\s*;/g) || []) as string[];
      
      importMatches.forEach(match => {
        const pathMatch = match.match(/from\s+['"](.+?)['"]\s*;/) || match.match(/import\s+['"](.+?)['"]\s*;/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          findImports(importPath);
        }
      });
    }
    
    // Resolve external imports
    if (importedFiles.size > SAFETY_LIMITS.MAX_IMPORTS) {
      log(`Too many imports: ${importedFiles.size}`, 'error');
      return NextResponse.json(
        { error: `Too many imports (${importedFiles.size}). Maximum is ${SAFETY_LIMITS.MAX_IMPORTS}` },
        { status: 400 }
      );
    }
    
    log(`Found ${importedFiles.size} external imports to resolve`);
    stats.externalImports = importedFiles.size;
    
    // Track import processing to prevent circular dependencies
    const processingImports = new Set<string>();
    const processedImports = new Set<string>();
    let importDepth = 0;
    const MAX_IMPORT_DEPTH = 50; // Safety limit to prevent infinite recursion

    // Resolve relative path properly
    function resolveRelativePath(basePath: string, relativePath: string): string {
      // Extract directory from base path
      const baseParts = basePath.split('/');
      let dirParts = baseParts.slice(0, baseParts.length - 1);
      
      // Handle relative paths
      const relParts = relativePath.split('/');
      
      for (let i = 0; i < relParts.length; i++) {
        const part = relParts[i];
        
        if (part === '.') {
          continue;
        } else if (part === '..') {
          if (dirParts.length > 0) {
            dirParts.pop();
          } else {
            // Can't go up further, handle edge case
            console.warn(`Invalid relative path: ${relativePath} from ${basePath}`);
            return relativePath; // Return as is to fail gracefully
          }
        } else {
          dirParts.push(part);
        }
      }
      
      return dirParts.join('/');
    }

    // Fetch all external libraries with cycle detection - ITERATIVE approach to prevent stack overflow
    async function resolveAllImports() {
      // Initialize a queue of imports to process
      let importQueue: string[] = [...importedFiles].filter(path => 
        !resolvedImports.has(path) && 
        !processingImports.has(path) &&
        !processedImports.has(path) &&
        !importPathMapping.has(path) // Don't process imports that have been mapped to local files
      );
      
      let iterations = 0;
      const MAX_ITERATIONS = SAFETY_LIMITS.MAX_IMPORTS * 2; // Safety limit
      
      // Process imports iteratively instead of recursively
      while (importQueue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // Get next import
        const importPath = importQueue.shift()!;
        
        // Skip if already processed
        if (resolvedImports.has(importPath) || 
            processingImports.has(importPath) ||
            processedImports.has(importPath)) {
          continue;
        }
        
        // Mark as processing
        processingImports.add(importPath);
        processedImports.add(importPath);
        
        try {
          // Handle external library imports
          let handled = false;
          
          for (const [prefix, config] of Object.entries(EXTERNAL_LIBRARIES)) {
            if (importPath.startsWith(prefix)) {
              try {
                log(`Fetching external library: ${importPath}`);
                const content = await fetchExternalLibrary(importPath);
                compilationFiles[importPath] = content;
                resolvedImports.add(importPath);
                handled = true;
                
                // Parse content for more imports
                const nestedImportMatches = content.match(/import\s+(?:{[^}]*}\s+from\s+)?['"](.+?)['"]\s*;/g) || [];
                log(`Found ${nestedImportMatches.length} potential nested imports in ${importPath}`);
                
                const newImports: string[] = [];
                
                for (const match of nestedImportMatches) {
                  // Support both import styles
                  const pathMatch = match.match(/from\s+['"](.+?)['"]\s*;/) || match.match(/import\s+['"](.+?)['"]\s*;/);
                  
                  if (pathMatch) {
                    const nestedImportPath = pathMatch[1];
                    
                    // Skip if already processed to avoid cycles
                    if (resolvedImports.has(nestedImportPath) || 
                        processingImports.has(nestedImportPath) ||
                        processedImports.has(nestedImportPath)) {
                      continue;
                    }
                    
                    // Handle relative imports within the library
                    if (nestedImportPath.startsWith('./') || nestedImportPath.startsWith('../')) {
                      const resolvedPath = resolveRelativePath(importPath, nestedImportPath);
                      
                      // Don't add if it creates a cycle
                      if (resolvedPath !== importPath && !processingImports.has(resolvedPath)) {
                        newImports.push(resolvedPath);
                        importedFiles.add(resolvedPath);
                      }
                    } else if (!resolvedImports.has(nestedImportPath)) {
                      // Absolute import
                      newImports.push(nestedImportPath);
                      importedFiles.add(nestedImportPath);
                    }
                  }
                }
                
                if (newImports.length > 0) {
                  log(`Adding ${newImports.length} new nested imports to queue`);
                  // Add to import queue (at the end to keep processing breadth-first)
                  importQueue.push(...newImports);
                }
                
                break;
              } catch (error: any) {
                log(`Failed to resolve import ${importPath}: ${error.message}`, 'error');
                // Continue with other imports instead of failing completely
              }
            }
          }
          
          if (!handled) {
            log(`Unhandled import: ${importPath}`, 'warn');
          }
        } finally {
          // Always remove from processing, regardless of success or failure
          processingImports.delete(importPath);
        }
      }
      
      // Check if we hit the iteration limit
      if (iterations >= MAX_ITERATIONS) {
        log(`Warning: Reached maximum iterations (${MAX_ITERATIONS}) while resolving imports. This may indicate circular dependencies.`, 'warn');
      }
      
      // Check if we have unresolved imports
      const unresolvedImports = [...importedFiles].filter(path => 
        !resolvedImports.has(path) && !importPathMapping.has(path)
      );
      if (unresolvedImports.length > 0) {
        log(`Warning: ${unresolvedImports.length} imports could not be resolved`, 'warn');
        for (const unresolved of unresolvedImports.slice(0, 10)) {
          log(`  - ${unresolved}`, 'warn');
        }
        if (unresolvedImports.length > 10) {
          log(`  ... and ${unresolvedImports.length - 10} more`, 'warn');
        }
      }
    }
    
    // Resolve all imports
    try {
      await resolveAllImports();
      log(`Resolved ${resolvedImports.size} external imports`);
      stats.resolvedImports = resolvedImports.size;
      stats.failedImports = importedFiles.size - resolvedImports.size;
    } catch (error: any) {
      log(`Error resolving imports: ${error.message}`, 'error', error);
      return NextResponse.json(
        { error: `Error resolving imports: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Create the final import resolver that can handle both cached libraries and files
    function createFinalImportResolver() {
      return function finalFindImports(importPath: string) {
        // First, check the compilation files
        if (compilationFiles[importPath]) {
          return { contents: compilationFiles[importPath] as string };
        }
        
        // Check for absolute imports in the project
        const absolutePath = importPath.startsWith('/') ? importPath.substring(1) : importPath;
        if (compilationFiles[absolutePath]) {
          return { contents: compilationFiles[absolutePath] as string };
        }
        
        // Check if we've already resolved this import path to a file
        if (importPathMapping.has(importPath)) {
          const mappedPath = importPathMapping.get(importPath)!;
          if (compilationFiles[mappedPath]) {
            return { contents: compilationFiles[mappedPath] as string };
          }
        }
        
        // Handle relative imports
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Look for potential matches by filename in our files
          const fileName = importPath.split('/').pop() || '';
          const fileNameWithExtension = fileName.endsWith('.sol') ? fileName : `${fileName}.sol`;
          
          // Try to find a matching file by name
          for (const filePath of Object.keys(compilationFiles)) {
            const fileBaseName = filePath.split('/').pop() || '';
            if (fileBaseName === fileNameWithExtension || fileBaseName === fileName) {
              // Found a potential match by filename
              log(`Resolved relative import ${importPath} to ${filePath} by filename match`, 'info');
              importPathMapping.set(importPath, filePath);
              return { contents: compilationFiles[filePath] as string };
            }
          }
          
          // If not found by direct match, provide a helpful error
          return {
            error: `Relative import ${importPath} not found. Make sure the file exists in your project.`
          };
        }
        
        // Check the library cache
        if (libraryCache.has(importPath)) {
          return { contents: libraryCache.get(importPath)! };
        }
        
        // Special handling for different libraries
        
        // OpenZeppelin contracts
        if (importPath.startsWith('@openzeppelin/contracts/')) {
          // For missing OpenZeppelin imports, provide a friendly error
          return {
            error: `External library not found: ${importPath}. Make sure the correct OpenZeppelin version is used.`
          };
        }
        
        // Chainlink contracts
        if (importPath.startsWith('@chainlink/contracts/')) {
          return {
            error: `External library not found: ${importPath}. Make sure the correct Chainlink version is used.`
          };
        }
        
        // Handle missing imports with a clear error
        return {
          error: `Import not found: ${importPath}`
        };
      };
    }
    
    // Configure the compiler input
    const input = {
      language: 'Solidity',
      sources: Object.entries(compilationFiles).reduce((acc, [path, content]) => {
        acc[path] = { content: content as string };
        return acc;
      }, {} as Record<string, { content: string }>),
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata', 'userdoc', 'devdoc'],
          },
        },
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: 'london',
      },
    };
    
    // Compile the contracts with a timeout
    log(`Compiling ${Object.keys(compilationFiles).length} files...`);
    let output;
    
    try {
      // Wrap compilation in a timeout promise
      const compileWithTimeout = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Compilation timed out after ${SAFETY_LIMITS.COMPILE_TIMEOUT}ms`));
        }, SAFETY_LIMITS.COMPILE_TIMEOUT);
        
        try {
          const compileStart = Date.now();
          const result = JSON.parse(solc.compile(JSON.stringify(input), { import: createFinalImportResolver() }));
          clearTimeout(timeoutId);
          const compileEnd = Date.now();
          stats.compilationTime = compileEnd - compileStart;
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      
      output = await compileWithTimeout;
    } catch (error: any) {
      log(`Compilation error: ${error.message}`, 'error', error);
      return NextResponse.json(
        { error: `Compilation error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Check for compilation errors
    if (output.errors) {
      const errors = output.errors.filter((e: any) => e.severity === 'error');
      const warnings = output.errors.filter((e: any) => e.severity === 'warning');
      
      if (errors.length > 0) {
        log(`Compilation failed with ${errors.length} errors`, 'error');
        return NextResponse.json(
          { 
            errors,
            warnings, 
            message: 'Compilation failed with errors'
          },
          { status: 400 }
        );
      }
      
      // Log warnings but continue with compilation
      if (warnings.length > 0) {
        log(`Compilation succeeded with ${warnings.length} warnings`, 'warn');
      }
    }
    
    // Process the output
    if (!output.contracts) {
      log('Compilation did not produce any output', 'error');
      return NextResponse.json(
        { error: 'Compilation did not produce any output' },
        { status: 400 }
      );
    }
    
    // Extract the main contract from the output
    const mainFileContracts = output.contracts[mainFile];
    if (!mainFileContracts) {
      return NextResponse.json(
        { error: `Main file ${mainFile} was not found in compilation output` },
        { status: 400 }
      );
    }
    
    // Get the first contract from the main file, or try to find one by name
    const mainContractName = Object.keys(mainFileContracts)[0];
    if (!mainContractName) {
      return NextResponse.json(
        { error: 'No contracts found in main file' },
        { status: 400 }
      );
    }
    
    const mainContract = mainFileContracts[mainContractName];
    const rawBytecode = mainContract.evm.bytecode.object;
    
    // Calculate deployed bytecode size
    const deployedBytecodeSize = mainContract.evm.deployedBytecode.object.length / 2; // Convert hex to bytes
    
    // Log compilation stats
    const totalTime = Date.now() - startTime;
    log(`Compilation completed in ${totalTime}ms`, 'info', {
      ...stats,
      totalTime
    });
    
    // Return the compilation result
    return NextResponse.json({
      abi: mainContract.abi,
      bytecode: `0x${rawBytecode}`,
      contractName: mainContractName,
      compilerVersion: solc.version(),
      // Include the ABI of all contracts
      contracts: Object.entries(output.contracts).reduce((acc, [file, contracts]) => {
        Object.entries(contracts as any).forEach(([name, contract]: [string, any]) => {
          acc[name] = {
            abi: contract.abi,
            bytecode: `0x${contract.evm.bytecode.object}`,
          };
        });
        return acc;
      }, {} as Record<string, any>),
      // Include metadata about bytecode size and gas estimates
      deployedBytecodeSize,
      warnings: output.errors?.filter((e: any) => e.severity === 'warning') || [],
    });
  } catch (error) {
    console.error('Error compiling contracts:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error compiling contracts',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.stack
          : undefined
      },
      { status: 500 }
    );
  }
} 