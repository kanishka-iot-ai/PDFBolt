# AWS Deployment Guide for PDFBolt

## Readiness Assessment
✅ **Ready for Deployment**
The application is fully configured for production deployment on AWS.

## Configuration Highlights
- **Docker**: Multi-stage build (Node.js builder -> Nginx runner) optimizes image size.
- **Nginx**: Configured for SPA (Single Page App) routing, Gzip/Brotli compression, and security headers.
- **Vite**: manualChunks splitting for optimal caching.

## Option 1: Containerized Deployment (AWS App Runner / ECS)
**Recommended for**: Simplest setup, managed scaling.

1. **Build & Push Image**:
   ```bash
   aws ecr create-repository --repository-name pdfbolt
   docker build -t pdfbolt .
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
   docker tag pdfbolt:latest [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/pdfbolt:latest
   docker push [YOUR_AWS_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/pdfbolt:latest
   ```

2. **Deploy to App Runner**:
   - Go to AWS Console -> App Runner -> Create Service.
   - Source: Container Image (Select the ECR image pushed above).
   - Port: 80.
   - Env Vars: `GEMINI_API_KEY` (if using AI features).

## Option 2: Static Hosting (S3 + CloudFront)
**Recommended for**: Lowest cost, highest performance (Global Edge).

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync dist/ s3://[YOUR-BUCKET-NAME] --delete
   ```

3. **Configure CloudFront**:
   - Create Distribution pointing to S3 bucket.
   - **Important**: Set Error Page for 404 to `/index.html` (Status 200) to support React Router.

## Pre-Deployment Checklist
- [ ] Set `GEMINI_API_KEY` in your environment (Secrets Manager / Parameter Store).
- [ ] Ensure Domain DNS (Route53) points to your CloudFront distribution or App Runner service.
