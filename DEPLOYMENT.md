# SmartScope Deployment Guide for Vercel

This guide will help you deploy the SmartScope application to Vercel's production environment.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- Node.js 18+ and npm installed locally
- A Hedera testnet or mainnet account with funds

## Preparing for Deployment

1. **Fix Configuration Issues**

   We've already updated the Next.js configuration to fix deprecated options:
   - Replaced `serverComponentsExternalPackages` with `serverExternalPackages`
   - Removed `swcMinify` as it's no longer needed

2. **Set Up Environment Variables**

   Create a `.env.production` file with your actual credentials:

   ```
   # Required Hedera account information
   HEDERA_OPERATOR_ID="0.0.YOUR_OPERATOR_ID"
   HEDERA_OPERATOR_KEY="YOUR_OPERATOR_PRIVATE_KEY"

   # API endpoints
   HASHIO_API_ENDPOINT="https://testnet.hashio.io/api"
   MIRROR_NODE_TESTNET="https://testnet.mirrornode.hedera.com/api/v1"
   MIRROR_NODE_MAINNET="https://mainnet-public.mirrornode.hedera.com/api/v1"

   # Optional variables
   HEDERA_TEST_ACCOUNT_ADDRESS="0xYOUR_TEST_ACCOUNT_ADDRESS"
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```

   > **IMPORTANT**: Never commit these credentials to your repository!

3. **Run the Preparation Script**

   We've created a helper script to validate your build and prepare for deployment:

   ```bash
   node scripts/prepare-vercel.js
   ```

   This script will:
   - Check for required environment variables
   - Create sample configuration files if needed
   - Validate the build process
   - Identify and fix common deployment issues

## Deployment Options

### Option 1: Deploy via Vercel CLI (Recommended for First Deployment)

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**

   ```bash
   vercel
   ```

   Follow the prompts to link your project to your Vercel account.

3. **Environment Variables Setup**

   When prompted, enter the environment variables from your `.env.production` file.

4. **Deploy to Production**

   After testing your preview deployment, deploy to production:

   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push Your Code to GitHub**

   Make sure your code is in a GitHub repository.

2. **Import Your Project**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Select your repository
   - Configure the project settings:
     - Framework Preset: Next.js
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables**

   In the project settings, add all the environment variables from your `.env.production` file.

4. **Deploy**

   Click "Deploy" and wait for the build to complete.

## Troubleshooting Common Issues

### Memory Limit Exceeded

If you encounter memory issues during deployment, add a `vercel.json` file:

```json
{
  "functions": {
    "api/**/*": {
      "memory": 1024
    }
  }
}
```

### Build Failures

1. **Large Dependencies**

   If you have build failures related to large dependencies like `solc`, ensure they're listed in the external packages config in `next.config.js`.

2. **Module Not Found Errors**

   Make sure all dependencies are listed in `package.json` and not just installed locally.

3. **API Routes Issues**

   If API routes fail, check that the HTTP methods match what's expected in the code.

## Post-Deployment

After successful deployment:

1. **Verify Environment Variables**

   Check that all environment variables are correctly set in Vercel.

2. **Test Critical Functionality**

   - Contract analysis
   - Contract deployment
   - Contract interaction

3. **Set Up Custom Domain (Optional)**

   - In the Vercel Dashboard, go to your project
   - Click "Settings" → "Domains"
   - Add your custom domain and follow the DNS configuration instructions

## Production Optimizations

For better production performance:

1. **Enable Caching**

   Consider adding caching headers to API responses that don't change frequently.

2. **Configure Edge Functions**

   Move suitable API routes to Edge Functions for faster global performance.

3. **Monitor Performance**

   Use Vercel Analytics to monitor and optimize application performance.

---

If you encounter any issues during deployment, please check the Vercel logs or open an issue in the project repository. 