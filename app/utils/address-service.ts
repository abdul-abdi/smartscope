import { ethers } from 'ethers';

// Mirror Node API endpoints
const MIRROR_NODE_TESTNET = 'https://testnet.mirrornode.hedera.com/api/v1';

// Cache for contract ID to EVM address mappings to avoid repeated API calls
const addressCache = new Map<string, {
  evmAddress: string;
  hederaAddress: string;
  timestamp: number;
}>();

// Cache TTL in milliseconds (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Comprehensive address service for handling Hedera contract addresses
 * Supports all formats: EVM (0x...), Hedera (0.0.X), and numeric (X)
 */
export class AddressService {
  /**
   * Resolve any address format to standardized formats
   * @param address Contract address in any format
   * @returns Object with evmAddress, hederaAddress, and originalFormat
   */
  static async resolveAddress(address: string): Promise<{
    evmAddress: string;
    hederaAddress: string;
    originalFormat: 'evm' | 'hedera' | 'numeric';
    isValid: boolean;
  }> {
    // Normalize input
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
      throw new Error('Empty address provided');
    }

    // Check cache first
    const cachedResult = this.getCachedAddress(normalizedAddress);
    if (cachedResult) {
      return {
        ...cachedResult,
        originalFormat: this.detectAddressFormat(normalizedAddress)
      };
    }

    // Detect format
    const format = this.detectAddressFormat(normalizedAddress);
    
    try {
      let evmAddress: string;
      let hederaAddress: string;
      
      switch (format) {
        case 'evm':
          evmAddress = this.normalizeEvmAddress(normalizedAddress);
          hederaAddress = await this.evmToHederaAddress(evmAddress);
          break;
          
        case 'hedera':
          hederaAddress = normalizedAddress;
          evmAddress = await this.hederaToEvmAddress(hederaAddress);
          break;
          
        case 'numeric':
          // Convert to Hedera format first
          hederaAddress = `0.0.${normalizedAddress}`;
          evmAddress = await this.hederaToEvmAddress(hederaAddress);
          break;
          
        default:
          throw new Error(`Unsupported address format: ${normalizedAddress}`);
      }
      
      // Cache the result
      this.cacheAddress(normalizedAddress, evmAddress, hederaAddress);
      
      return {
        evmAddress,
        hederaAddress,
        originalFormat: format,
        isValid: true
      };
    } catch (error: any) {
      console.error(`Error resolving address ${normalizedAddress}:`, error);
      
      // Return best-effort result even on error
      return {
        evmAddress: format === 'evm' ? this.normalizeEvmAddress(normalizedAddress) : this.fallbackHederaToEvmAddress(format === 'hedera' ? normalizedAddress : `0.0.${normalizedAddress}`),
        hederaAddress: format === 'hedera' ? normalizedAddress : format === 'numeric' ? `0.0.${normalizedAddress}` : this.fallbackEvmToHederaAddress(normalizedAddress),
        originalFormat: format,
        isValid: false
      };
    }
  }
  
  /**
   * Detect the format of an address
   * @param address Address to detect format for
   * @returns Format type: 'evm', 'hedera', or 'numeric'
   */
  static detectAddressFormat(address: string): 'evm' | 'hedera' | 'numeric' {
    if (address.startsWith('0x')) {
      return 'evm';
    } else if (/^\d+\.\d+\.\d+$/.test(address)) {
      return 'hedera';
    } else if (/^\d+$/.test(address)) {
      return 'numeric';
    }
    
    // Default to EVM if we can't determine
    return 'evm';
  }
  
  /**
   * Normalize an EVM address to proper format
   * @param address EVM address
   * @returns Normalized EVM address
   */
  static normalizeEvmAddress(address: string): string {
    // Ensure 0x prefix
    let normalized = address.startsWith('0x') ? address : `0x${address}`;
    
    // Remove duplicate 0x prefix if present
    if (normalized.startsWith('0x0x')) {
      normalized = `0x${normalized.substring(4)}`;
    }
    
    // Ensure proper length (0x + 40 chars)
    if (normalized.length < 42) {
      normalized = `0x${normalized.substring(2).padStart(40, '0')}`;
    }
    
    return normalized.toLowerCase();
  }
  
  /**
   * Convert Hedera address to EVM format using Mirror Node
   * @param hederaAddress Hedera address (0.0.X)
   * @returns EVM address
   */
  static async hederaToEvmAddress(hederaAddress: string): Promise<string> {
    try {
      const mirrorNodeUrl = `${MIRROR_NODE_TESTNET}/contracts/${hederaAddress}`;
      const response = await fetch(mirrorNodeUrl);
      
      if (!response.ok) {
        throw new Error(`Mirror Node request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.evm_address) {
        return data.evm_address.startsWith('0x') 
          ? data.evm_address.toLowerCase()
          : `0x${data.evm_address}`.toLowerCase();
      }
      
      throw new Error(`No EVM address found for Hedera address ${hederaAddress}`);
    } catch (error) {
      console.error(`Error converting Hedera to EVM address:`, error);
      return this.fallbackHederaToEvmAddress(hederaAddress);
    }
  }
  
  /**
   * Convert EVM address to Hedera format using Mirror Node
   * @param evmAddress EVM address
   * @returns Hedera address
   */
  static async evmToHederaAddress(evmAddress: string): Promise<string> {
    try {
      // Remove 0x prefix for Mirror Node API
      const formattedAddress = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress;
      const mirrorNodeUrl = `${MIRROR_NODE_TESTNET}/contracts/${formattedAddress}`;
      
      const response = await fetch(mirrorNodeUrl);
      
      if (!response.ok) {
        throw new Error(`Mirror Node request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.contract_id) {
        return data.contract_id;
      }
      
      throw new Error(`No Hedera address found for EVM address ${evmAddress}`);
    } catch (error) {
      console.error(`Error converting EVM to Hedera address:`, error);
      return this.fallbackEvmToHederaAddress(evmAddress);
    }
  }
  
  /**
   * Fallback conversion from Hedera to EVM address without API call
   * @param hederaAddress Hedera address (0.0.X)
   * @returns EVM address
   */
  static fallbackHederaToEvmAddress(hederaAddress: string): string {
    try {
      const parts = hederaAddress.split('.');
      if (parts.length !== 3) {
        throw new Error(`Invalid Hedera address format: ${hederaAddress}`);
      }
      
      const contractNum = parseInt(parts[2], 10);
      return `0x${contractNum.toString(16).padStart(40, '0')}`.toLowerCase();
    } catch (error) {
      console.error(`Fallback Hedera to EVM conversion failed:`, error);
      return '0x0000000000000000000000000000000000000000';
    }
  }
  
  /**
   * Fallback conversion from EVM to Hedera address without API call
   * @param evmAddress EVM address
   * @returns Hedera address
   */
  static fallbackEvmToHederaAddress(evmAddress: string): string {
    try {
      // Remove 0x prefix if present
      const cleanAddress = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress;
      
      // Remove leading zeros
      const significantPart = cleanAddress.replace(/^0+/, '');
      
      if (significantPart.length === 0) {
        return '0.0.0';
      }
      
      // Convert hex to decimal
      const contractNum = parseInt(significantPart, 16);
      return `0.0.${contractNum}`;
    } catch (error) {
      console.error(`Fallback EVM to Hedera conversion failed:`, error);
      return '0.0.0';
    }
  }
  
  /**
   * Get cached address information
   * @param address Address in any format
   * @returns Cached address info or null if not in cache or expired
   */
  private static getCachedAddress(address: string): { evmAddress: string; hederaAddress: string; isValid: boolean } | null {
    const normalizedAddress = address.trim();
    const cached = addressCache.get(normalizedAddress);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return {
        evmAddress: cached.evmAddress,
        hederaAddress: cached.hederaAddress,
        isValid: true
      };
    }
    
    return null;
  }
  
  /**
   * Cache address information
   * @param originalAddress Original address used for lookup
   * @param evmAddress Resolved EVM address
   * @param hederaAddress Resolved Hedera address
   */
  private static cacheAddress(originalAddress: string, evmAddress: string, hederaAddress: string): void {
    addressCache.set(originalAddress, {
      evmAddress,
      hederaAddress,
      timestamp: Date.now()
    });
    
    // Also cache by resolved addresses for faster lookups
    addressCache.set(evmAddress, {
      evmAddress,
      hederaAddress,
      timestamp: Date.now()
    });
    
    addressCache.set(hederaAddress, {
      evmAddress,
      hederaAddress,
      timestamp: Date.now()
    });
  }
  
  /**
   * Format address for display with ellipsis
   * @param address Address to format
   * @param prefixLength Number of characters to show at start
   * @param suffixLength Number of characters to show at end
   * @returns Formatted address with ellipsis
   */
  static formatAddressForDisplay(address: string, prefixLength = 6, suffixLength = 4): string {
    if (!address || address.length <= prefixLength + suffixLength) {
      return address;
    }
    
    const prefix = address.substring(0, prefixLength);
    const suffix = address.substring(address.length - suffixLength);
    
    return `${prefix}...${suffix}`;
  }
  
  /**
   * Check if an address is valid
   * @param address Address to validate
   * @returns Promise resolving to boolean indicating validity
   */
  static async isValidAddress(address: string): Promise<boolean> {
    try {
      const resolved = await this.resolveAddress(address);
      return resolved.isValid;
    } catch (error) {
      return false;
    }
  }
}
