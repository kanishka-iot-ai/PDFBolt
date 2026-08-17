# PDFBolt — Microsoft Azure Production Deployment Guide

This guide provides step-by-step instructions for deploying the **PDFBolt** frontend and processing engine to **Microsoft Azure**.

---

## Architecture Overview

* **Frontend**: **Azure Static Web Apps (SWA)** — Global edge CDN hosting the React 18/Vite 6 SPA with automatic client-side routing fallback (`staticwebapp.config.json`).
* **Backend Processing Engine**: **Azure Container Apps (ACA)** — Serverless Linux container hosting the FastAPI PDF engine (`Dockerfile.api`).
* **Storage & Persistence**: **Azure Blob Storage** — Private container `pdfbolt-documents` with 15-minute SAS download tokens and automated 1-day lifecycle purge.

---

## Method 1: 1-Click Azure CLI Deployment (Recommended)

### Prerequisites
1. Install [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli).
2. Log in to your Azure account:
   ```bash
   az login
   ```

### Step 1 — Create Resource Group
```bash
az group create --name rg-pdfbolt-prod --location eastus
```

### Step 2 — Deploy Infrastructure via Bicep
Run the provided Bicep template located in `azure/main.bicep`:
```bash
az deployment group create \
  --resource-group rg-pdfbolt-prod \
  --template-file azure/main.bicep \
  --parameters customDomain="pdfbolt.com"
```

The output will display:
* `backendApiUrl`: `https://pdfbolt-api.<unique-hash>.eastus.azurecontainerapps.io`
* `staticWebAppUrl`: `https://<unique-name>.azurestaticapps.net`
* `storageAccountName`: `pdfbolt<unique-suffix>`

---

## Method 2: Azure Portal Deployment (Step-by-Step UI)

### Part A: Deploy Frontend to Azure Static Web Apps
1. Navigate to **Azure Portal** ➔ **Create a resource** ➔ Search **Static Web App**.
2. **Basics**:
   * **Subscription**: Select your subscription.
   * **Resource Group**: `rg-pdfbolt-prod`.
   * **Name**: `pdfbolt-web`.
   * **Plan type**: `Free` (or Standard for custom SLA).
   * **Region**: `East US 2` (or nearest global region).
   * **Source**: `GitHub`.
3. **GitHub Authorization**:
   * Sign in with GitHub.
   * **Organization**: `kanishka-iot-ai`.
   * **Repository**: `PDFBolt`.
   * **Branch**: `main`.
4. **Build Details**:
   * **Build Presets**: `Custom`.
   * **App location**: `/`.
   * **Api location**: *(Leave empty)*.
   * **Output location**: `dist`.
5. Click **Review + Create** ➔ **Create**.
   * Azure will automatically generate `.github/workflows/azure-static-web-apps.yml` and trigger your frontend build!

---

### Part B: Deploy Backend to Azure Container Apps
1. In Azure Portal, search **Container Apps** ➔ **Create**.
2. **Basics**:
   * **Container App Name**: `pdfbolt-api`.
   * **Container Apps Environment**: Create new `cae-pdfbolt-prod`.
3. **App Settings / Container**:
   * **Image source**: Docker Hub, GitHub Container Registry (`ghcr.io/kanishka-iot-ai/pdfbolt-api:latest`), or Azure Container Registry (ACR).
   * **CPU**: `0.5 cores`, **Memory**: `1.0 GiB`.
4. **Ingress**:
   * **Ingress**: `Enabled`.
   * **Target Port**: `8000`.
   * **Accepting traffic from anywhere**: `Enabled` (External).
5. **Environment Variables**:
   | Key | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `DEBUG` | `false` |
   | `STORAGE_BACKEND` | `azure` |
   | `AZURE_STORAGE_CONNECTION_STRING` | *`<Your Storage Connection String>`* |
   | `AZURE_STORAGE_CONTAINER_NAME` | `pdfbolt-documents` |
   | `CORS_ORIGINS` | `["https://pdfbolt.com","https://www.pdfbolt.com","https://<your-swa>.azurestaticapps.net"]` |
   | `PROCESSING_FILE_TTL_SECONDS` | `900` |
   | `HARD_SAFETY_TTL_SECONDS` | `1200` |
   | `CLEANUP_INTERVAL_SECONDS` | `300` |
6. Click **Create**.

---

### Part C: Create Azure Blob Storage (For Document Jobs & QR Shares)
1. In Azure Portal, search **Storage Accounts** ➔ **Create**.
   * **Name**: `pdfboltstorage` *(must be unique)*.
   * **Performance**: Standard, **Redundancy**: Locally-redundant storage (LRS).
2. Once created, go to **Containers** ➔ **+ Container**:
   * **Name**: `pdfbolt-documents`.
   * **Public access level**: `Private (no anonymous access)`.
3. Go to **Access Keys** ➔ Copy **Connection string**.
4. In your Container App `pdfbolt-api`, add the copied connection string to `AZURE_STORAGE_CONNECTION_STRING`.

---

## Verification & Health Check

### 1. Test Backend Health:
```bash
curl https://pdfbolt-api.<app-fqdn>.azurecontainerapps.io/health
# Response: {"status":"healthy","app":"PDFBolt Processing Engine","version":"1.0.0"}
```

### 2. Test Frontend SPA Routes:
Open any deep-link in your browser:
* `https://<your-swa>.azurestaticapps.net/pdf-to-word`
* `https://<your-swa>.azurestaticapps.net/compress-pdf`
* `https://<your-swa>.azurestaticapps.net/scan-handwriting-to-pdf`

---

## Custom Domain Setup (`pdfbolt.com`)

1. In Azure Static Web App (`pdfbolt-web`), go to **Custom domains** ➔ **+ Add**.
2. Select **Custom domain on other DNS**.
3. Enter `pdfbolt.com` and `www.pdfbolt.com`.
4. Update your DNS provider (Cloudflare / Namecheap / GoDaddy) with the CNAME or ALIAS/TXT records provided by Azure.
5. Azure will automatically provision a free managed SSL/TLS certificate!
