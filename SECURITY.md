# Security Policy

## Supported Versions

SmartScope is still in active development. The following versions are currently being maintained with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SmartScope seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Email us at security@smartscope.dev** with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggestions for mitigation

## What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will provide an initial assessment within 7 days
- We aim to release a fix within 30 days, depending on complexity
- We will keep you updated on our progress

## Security Best Practices for SmartScope Users

### API Key Security

- Never share your Gemini API key or include it in client-side code
- Store your `.env.local` file securely and never commit it to public repositories
- Regularly rotate your API keys

### Smart Contract Development

- Always review the security analysis provided by SmartScope before deployment
- Test contracts thoroughly on testnet before considering mainnet deployment
- Follow standard smart contract security best practices:
  - Check for reentrancy vulnerabilities
  - Validate all inputs
  - Handle edge cases in arithmetic operations
  - Implement proper access controls

### Platform Usage

- Keep your browser updated to the latest version
- Be cautious when interacting with third-party contracts
- Always verify contract addresses before interaction

## SmartScope Security Features

SmartScope includes several security features to protect users:

1. **Contract Analysis**: Automated security checks for common vulnerabilities
2. **Testnet-Only Operations**: All deployments are limited to Hedera Testnet
3. **No Wallet Requirements**: No private keys are required from users
4. **Server-Side Signing**: All blockchain transactions are signed server-side

## Security Roadmap

We are continuously improving our security practices:

- Enhanced security analysis integration (Q2 2025)
- Advanced vulnerability detection for complex contract patterns
- Integration with industry security standards 