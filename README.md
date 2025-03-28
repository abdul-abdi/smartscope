# SmartScope

<div align="center">
  <img src="public/favicon.svg" alt="SmartScope Logo" width="150" height="auto" />
  <p><strong>Smart Contract Analyzer for Hedera Testnet</strong></p>
  <div>
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-application-workflow">Workflow</a> •
    <a href="#-usage-guide">Usage</a> •
    <a href="#-documentation">Documentation</a>
  </div>
</div>

## 📋 Overview

SmartScope is an all-in-one platform for blockchain developers to build, analyze, deploy, and interact with smart contracts on the Hedera Testnet. Our platform streamlines the development process with zero setup required - no wallet configuration needed. SmartScope combines powerful development tools with an integrated AI assistant to guide you through the blockchain development journey.

## 🔑 Key Features

- 🔍 **Smart Contract Analysis** - Instantly analyze Solidity code for insights and security considerations
- 🚀 **One-Click Deployment** - Deploy to Hedera Testnet without wallet configuration or manual gas settings
- 🔒 **Security-First Approach** - Automated security checks and best practice suggestions
- ⚡ **Universal Contract Interaction** - Dynamically interact with any contract type using intelligent interface detection
- 🔮 **Advanced ABI Discovery** - Accurate function detection through bytecode analysis for any smart contract
- 📊 **Live State Visualization** - Real-time view of contract state variables and storage
- 📚 **Learning Resources** - Comprehensive guides on smart contract development
- 🧠 **AI Assistant** - Get instant answers about blockchain concepts, Solidity, and Hedera
- 🔌 **No External Dependencies** - Everything runs in-browser with no wallet requirements
- 📂 **Multi-File IDE** - Develop complex contract systems with multiple files and dependencies
- 📦 **External Library Support** - Seamless integration with popular libraries like OpenZeppelin
- 🔄 **Dependency Management** - Automatic resolution of imports and dependencies between files
- 🏗️ **Rich Template Library** - Categorized, ready-to-use contract templates with detailed documentation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- A Gemini API key for the AI Assistant functionality (optional)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/abdul-abdi/smartscope.git
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
   # AI Assistant (optional)
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   
   # API endpoints
   HASHIO_API_ENDPOINT=https://testnet.hashio.io/api
   MIRROR_NODE_TESTNET=https://testnet.mirrornode.hedera.com/api/v1
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
4. **Interact & Verify** - Call functions and view results in real-time with our universal interface

## 📖 Usage Guide

### Creating a Smart Contract

1. Navigate to the "Create" page
2. Choose between Simple Editor and Advanced IDE modes:
   - **Simple Editor**: Write a single Solidity file or choose from templates
   - **Advanced IDE**: Develop multi-file projects with dependencies
3. Save your contract when finished

### Using the Advanced Multi-File IDE

1. Click "Switch to Advanced IDE" from the Create page
2. Create files and folders with the "New" button
3. Organize your project structure:
   - Create contract interfaces in separate files
   - Import libraries and dependencies
   - Manage project organization with folders
4. External libraries like OpenZeppelin are automatically detected and linked
5. Files with dependencies are compiled together

### Using Contract Templates

1. Navigate to the "Templates" page
2. Browse templates by category (Tokens, NFTs, DeFi, Governance, Utility)
3. Click on a template card to:
   - View detailed description
   - See use cases and technical specifications
   - Examine the implementation code
4. Use the "View Details" button to access comprehensive information about any template
5. Click "Use Template" to load it directly into the editor
6. Templates are loaded into the custom contract editor for immediate customization

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
2. Our system automatically detects available functions through bytecode analysis
3. View live contract state and storage values through our dynamic interface
4. Select functions to call from the interface
5. For read functions, results will display immediately
6. For write functions, transaction details will be shown

### Using the AI Assistant

1. Click the AI Assistant chat button in the bottom-right corner
2. Ask questions about blockchain concepts, Solidity, or how to use SmartScope
3. Get instant, contextual help while you develop

## 📚 Documentation

Comprehensive documentation is available in the following files:

- [API.md](API.md) - API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](SECURITY.md) - Security policy and best practices
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

## 🏗️ Project Structure

```
smartscope/
├── app/                  # Next.js app directory
│   ├── api/              # API routes for contract interactions
│   ├── create/           # Contract creation pages and Multi-File IDE
│   ├── interact/         # Contract interaction pages
│   ├── learn/            # Educational content
│   ├── templates/        # Contract templates library
│   ├── community/        # Community features (upcoming)
│   └── roadmap/          # Platform roadmap
├── components/           # Global components
│   ├── providers/        # Context providers including FileSystem
│   └── ui/               # UI components including AI Assistant
├── public/               # Static assets
└── lib/                  # Utility functions
```

## 🗺️ Roadmap

SmartScope is in active development with the following roadmap:

### Current Features
- Smart Contract Creation and Analysis
- Multi-File IDE with dependency management
- External library support (OpenZeppelin, etc.)
- Dynamic Contract Interaction (supports any contract type)
- Advanced ABI Discovery through bytecode analysis
- Live Contract State Visualization
- Hedera Testnet Support
- Learning Resources
- SmartScope AI Assistant
- Comprehensive Template System with categories and detailed documentation
- Community and Learning Pages with integrated navigation

### In Progress (Q2 2025)
- Enhanced Security Analysis with integration with security standards
- Performance Optimization and AI-assisted code improvements
- Community Features with code sharing and collaborative development

### Future Plans (Q3 2025)
- Cross-Chain Support (Ethereum integration Q3 2025)
- Advanced Analytics with deeper insights into contract performance
- Advanced AI Features with integration into workflow and personalized recommendations

## 🧠 AI Assistant Setup

The SmartScope AI Assistant requires a Gemini API key to function:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env.local` file:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Restart your development server

## 🤝 Contributing

We welcome contributions to SmartScope! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

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

For deployment instructions, please refer to our [Deployment Guide](DEPLOYMENT.md).

The application is set up for easy deployment on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabdul-abdi%2Fsmartscope)

## 📄 License

This project is licensed under the [ISC License](LICENSE)

## 📚 Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [OpenZeppelin Documentation](https://docs.openzeppelin.com/) - For library integration

## 🙏 Acknowledgements

- [Hedera](https://hedera.com/) for their blockchain technology
- [OpenZeppelin](https://openzeppelin.com/) for secure contract templates
- [ethers.js](https://docs.ethers.io/) for Ethereum interactions
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Google Gemini](https://gemini.google.com/) for AI assistance 
