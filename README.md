# SmartScope

<div align="center">
  <img src="public/favicon.svg" alt="SmartScope Logo" width="150" height="auto" />
  <p><strong>Smart Contract Analyzer for Hedera Testnet</strong></p>
</div>

## 📋 Overview

SmartScope is an all-in-one platform for blockchain developers to build, analyze, deploy, and interact with smart contracts on the Hedera Testnet. Our platform streamlines the development process with zero setup required - no wallet configuration needed. SmartScope combines powerful development tools with an integrated AI assistant to guide you through the blockchain development journey.

### Key Features

- 🔍 **Smart Contract Analysis** - Instantly analyze Solidity code for insights and security considerations
- 🚀 **One-Click Deployment** - Deploy to Hedera Testnet without wallet configuration or manual gas settings
- 🔒 **Security-First Approach** - Automated security checks and best practice suggestions
- ⚡ **Real-time Interaction** - Call functions and view transaction results instantly
- 📚 **Learning Resources** - Comprehensive guides on smart contract development
- 🧠 **AI Assistant** - Get instant answers about blockchain concepts, Solidity, and Hedera
- 🔌 **No External Dependencies** - Everything runs in-browser with no wallet requirements

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

### Using the AI Assistant

1. Click the AI Assistant chat button in the bottom-right corner
2. Ask questions about blockchain concepts, Solidity, or how to use SmartScope
3. Get instant, contextual help while you develop

## 🛠️ Project Structure

```
smartscope/
├── app/                  # Next.js app directory
│   ├── api/              # API routes for contract interactions
│   ├── create/           # Contract creation pages
│   ├── interact/         # Contract interaction pages
│   ├── learn/            # Educational content
│   └── roadmap/          # Platform roadmap
├── components/           # Global components
│   ├── providers/        # Context providers
│   └── ui/               # UI components including AI Assistant
├── public/               # Static assets
└── lib/                  # Utility functions
```

## 🗺️ Roadmap

SmartScope is in active development with the following roadmap:

### Current Features
- Smart Contract Creation and Analysis
- Hedera Testnet Support
- Learning Resources
- SmartScope AI Assistant

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

The application is set up for easy deployment on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabdul-abdi%2Fsmartscope)

## 📄 License

This project is licensed under the [ISC License](LICENSE)

## 📚 Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)

## 🙏 Acknowledgements

- [Hedera](https://hedera.com/) for their blockchain technology
- [OpenZeppelin](https://openzeppelin.com/) for secure contract templates
- [ethers.js](https://docs.ethers.io/) for Ethereum interactions
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Google Gemini](https://gemini.google.com/) for AI assistance 
