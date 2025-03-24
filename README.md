# SmartScope

<div align="center">
  <img src="public/images/logo.svg" alt="SmartScope Logo" width="200" height="auto" />
  <p><strong>A comprehensive toolkit for Hedera smart contract development</strong></p>
</div>

## 📋 Overview

SmartScope is an all-in-one platform for blockchain developers to build, analyze, deploy, and interact with smart contracts on the Hedera network. Our platform streamlines the development process from initial coding to production deployment, with a focus on security, usability, and efficiency.

### Key Features

- 🔍 **Smart Contract Analysis** - Instantly analyze Solidity code for insights and security vulnerabilities
- 🚀 **One-Click Deployment** - Deploy to Hedera Testnet without wallet configuration or manual gas settings
- 🔒 **Security-First Approach** - Automated security checks and optimization suggestions
- ⚡ **Real-time Interaction** - Call functions and view transaction results instantly
- 📚 **Sample Templates** - Pre-built contract templates for common use cases
- 🔌 **No External Dependencies** - Everything runs in-browser with no wallet requirements

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A Hedera testnet account for deployment functionality (optional)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/smartscope.git
   cd smartscope
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   
   Edit the `.env.local` file with your credentials:
   ```
   # Hedera Account (optional for deployments)
   HEDERA_OPERATOR_ID=0.0.YOUR_OPERATOR_ID
   HEDERA_OPERATOR_KEY=YOUR_OPERATOR_PRIVATE_KEY
   
   # API endpoints
   HASHIO_API_ENDPOINT=https://testnet.hashio.io/api
   MIRROR_NODE_TESTNET=https://testnet.mirrornode.hedera.com/api/v1
   MIRROR_NODE_MAINNET=https://mainnet-public.mirrornode.hedera.com/api/v1
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Application Workflow

SmartScope provides an end-to-end workflow for smart contract development:

1. **Create or Upload** - Write Solidity code in our editor or upload existing files
2. **Compile & Analyze** - Automated compilation and security analysis
3. **Deploy to Hedera** - One-click deployment to Hedera Testnet
4. **Interact & Verify** - Call functions and view results in real-time

## 📖 Usage Guide

### Creating a Smart Contract

1. Navigate to the "Create" page
2. Write your Solidity code in the editor or select a template
3. Save your contract when finished

### Analyzing a Contract

1. On the contract creation page, click "Analyze"
2. Review security insights and optimization suggestions
3. Make any necessary modifications based on recommendations

### Deploying a Contract

1. From the editor, click "Deploy"
2. Enter any constructor arguments if required
3. Click "Deploy to Testnet"
4. View deployment status and contract address when complete

### Interacting with Contracts

1. Navigate to the "Interact" page and enter your contract address
2. Select functions to call from the interface
3. For read functions, results will display immediately
4. For write functions, transaction details will be shown

## 🛠️ Project Structure

```
smartscope/
├── app/                  # Next.js app directory
│   ├── api/              # API routes for contract interactions
│   ├── components/       # Shared React components
│   ├── create/           # Contract creation pages
│   ├── deploy/           # Deployment pages
│   ├── interact/         # Contract interaction pages
│   ├── learn/            # Educational content
│   └── utils/            # Helper functions
├── components/           # Global components
├── public/               # Static assets
└── scripts/              # Utility scripts
```

## 🤝 Contributing

We welcome contributions to SmartScope! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and naming conventions
- Add appropriate comments for complex logic
- Write tests for new features
- Update documentation for changes

## 🧪 Testing

Run tests with:

```bash
npm test
# or
yarn test
```

## 📦 Building for Production

```bash
npm run build
# or
yarn build
```

To start the production server:

```bash
npm start
# or
yarn start
```

## 🚢 Deployment

For deploying to Vercel, follow the instructions in [DEPLOYMENT.md](DEPLOYMENT.md)

## 📄 License

This project is licensed under the [ISC License](LICENSE)

## 📚 Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🙏 Acknowledgements

- [Hedera](https://hedera.com/) for their blockchain technology
- [OpenZeppelin](https://openzeppelin.com/) for secure contract templates
- [ethers.js](https://docs.ethers.io/) for Ethereum interactions
- [shadcn/ui](https://ui.shadcn.com/) for UI components 