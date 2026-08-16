# PDFBolt AWS Decoupling Inventory

Comprehensive audit of all AWS services, SDKs, configurations, environment variables, and domain references identified across the PDFBolt repository.

---

## 1. AWS Packages & Dependencies

| Ecosystem | File | Package / Reference | Replacement |
|---|---|---|---|
| **Node.js (Frontend)** | `package.json` | `@aws-sdk/client-cloudfront` | Removed (Static CDN / Direct origin) |
| **Node.js (Frontend)** | `package.json` | `@aws-sdk/client-s3` | Removed (Server-side GCS / Render API) |
| **Node.js (Frontend)** | `package.json` | `@aws-sdk/s3-request-presigner` | Removed (Server-side GCS signed URLs) |
| **TypeScript Types** | `src/declarations.d.ts` | `declare module '@aws-sdk/client-s3'` | Removed |
| **TypeScript Types** | `src/declarations.d.ts` | `declare module '@aws-sdk/s3-request-presigner'` | Removed |
| **Python (Backend)** | `requirements.txt` | `boto3>=1.34.0,<2.0.0` | `google-cloud-storage`, `google-cloud-pubsub` |
| **Python (Backend)** | `backend/requirements.txt` | `boto3>=1.34.0,<2.0.0` | `google-cloud-storage`, `google-cloud-pubsub` |

---

## 2. AWS Infrastructure & Scripts

| Location | File / Directory | Description | Action |
|---|---|---|---|
| **Root** | `amplify.yml` | AWS Amplify frontend CI/CD & SPA routing configuration | **DELETE** |
| **Scripts** | `.agent/skills/cloudfront_check.ts` | Script to list CloudFront distributions | **DELETE** |
| **Scripts** | `.agent/skills/s3_policy_check.ts` | Script to check S3 bucket policies | **DELETE** |
| **Skills** | `.agent/skills/s3_status_check/` | Skill folder with S3 connectivity check | **DELETE** |

---

## 3. Storage Provider & Backend Code References

| File | Component / Line | Description | Remediation |
|---|---|---|---|
| `backend/app/services/storage_provider.py` | `class S3StorageProvider` | AWS S3 storage implementation | **REMOVE** S3 class; enforce GCS and LocalStorage |
| `backend/app/services/storage_provider.py` | `get_storage_provider()` | Factory method checking `provider == 's3'` | **REMOVE** `'s3'` branch; default to Local / GCS |
| `backend/app/config.py` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_ENDPOINT_URL` | AWS environment variables in Pydantic settings | **PURGE** AWS fields; add GCS & Pub/Sub fields |
| `backend/app/services/cleanup_service.py` | Header comments & docstrings | References to AWS S3 storage | **UPDATE** to Google Cloud Storage (GCS) |
| `src/services/storageService.ts` | Header comments | References to AWS | **UPDATE** to backend Render API & GCS |

---

## 4. Environment & Secrets Inventory

| Environment File | Variable Key | Status / Finding | Action |
|---|---|---|---|
| `.env` | `VITE_AWS_ACCESS_KEY_ID` | Present | **PURGE** |
| `.env` | `VITE_AWS_SECRET_ACCESS_KEY` | Present | **PURGE** |
| `.env` | `VITE_AWS_REGION` | Present | **PURGE** |
| `.env` | `VITE_AWS_BUCKET_NAME` | Present | **PURGE** |
| `.env.local` | `VITE_AWS_ACCESS_KEY_ID` | Present | **PURGE** |
| `.env.local` | `VITE_AWS_SECRET_ACCESS_KEY` | Present | **PURGE** |
| `.env.local` | `VITE_AWS_REGION` | Present | **PURGE** |
| `.env.local` | `VITE_AWS_BUCKET_NAME` | Present | **PURGE** |
| `.env.example` | `VITE_AWS_*`, `AWS/GCS` comments | Present | **CLEAN** |
| `backend/.env.example` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_ENDPOINT_URL` | Present | **PURGE** & replace with GCS/PubSub config |

---

## 5. Domain References (`pdfbolt.in` -> `pdfbolt.com`)

| File | Occurrence Details |
|---|---|
| `index.html` | Canonical URL, OpenGraph tags, Twitter tags, WebApplication/WebSite/Organization schema |
| `public/robots.txt` | Header comment, `Sitemap: https://pdfbolt.com/sitemap.xml` |
| `public/sitemap.xml` | Sitemap index URLs |
| `public/sitemap-tools.xml` | All 32 tool URLs |
| `public/sitemap-guides.xml` | All guide URLs |
| `public/sitemap-encyclopedia.xml` | All encyclopedia article URLs |
| `public/sitemap-workflows.xml` | All persona & workflow URLs |
| `src/App.tsx` | `baseUrl = 'https://pdfbolt.com'` |
| `src/components/SEOLandingPage.tsx` | `baseUrl = 'https://pdfbolt.com'` |
| `src/pages/EncyclopediaDetailPage.tsx` | `baseUrl = 'https://pdfbolt.com'` |
| `src/pages/GuideDetailPage.tsx` | `baseUrl = 'https://pdfbolt.com'` |
| `src/pages/StaticPages.tsx` | `support@pdfbolt.com` |
| `backend/app/config.py` | `CORS_ORIGINS` (`https://pdfbolt.com`) |
| `backend/app/services/qr_share_manager.py` | `share_url = f"https://pdfbolt.com/s/{share_id}"` |
| `backend/tests/test_seo_validation.py` | Assertions validating canonical URLs against `https://pdfbolt.com` |
| `backend/tests/test_qr_share.py` | Assertions validating `share_url` contains `https://pdfbolt.com/s/` |
