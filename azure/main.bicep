// =============================================================================
// PDFBolt — Microsoft Azure Bicep Infrastructure Deployment Template
// Deploys:
//  - Azure Storage Account (pdfboltstorage) + Blob Container (pdfbolt-documents)
//  - Azure Log Analytics Workspace & Container Apps Environment
//  - Azure Container App (pdfbolt-api) running FastAPI Docker Engine
//  - Azure Static Web App (pdfbolt-web) running React / Vite SPA
// =============================================================================

@description('Primary Azure location for backend and storage resources')
param location string = resourceGroup().location

@description('Environment name suffix')
param environmentName string = 'prod'

@description('Unique storage account prefix (must be lowercase alphanumeric 3-24 chars)')
param storageAccountPrefix string = 'pdfbolt'

@description('Backend container image tag')
param containerImage string = 'ghcr.io/kanishka-iot-ai/pdfbolt-api:latest'

@description('Custom domain name for production')
param customDomain string = 'pdfbolt.in'

// Suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id)
var storageAccountName = take('${storageAccountPrefix}${uniqueSuffix}', 24)
var logAnalyticsName = 'log-pdfbolt-${environmentName}'
var containerAppEnvName = 'cae-pdfbolt-${environmentName}'
var containerAppName = 'pdfbolt-api'
var staticWebAppName = 'pdfbolt-web'

// -----------------------------------------------------------------------------
// 1. Azure Blob Storage Account & Container
// -----------------------------------------------------------------------------
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    encryption: {
      services: {
        blob: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: false
    }
  }
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'pdfbolt-documents'
  properties: {
    publicAccess: 'None'
  }
}

// Storage Account Lifecycle Rule (1-Day safety net purge)
resource storageLifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'PurgeTemporaryDocumentsAfter1Day'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: [
                'blockBlob'
              ]
              prefixMatch: [
                'pdfbolt-documents/jobs/'
              ]
            }
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 1
                }
              }
            }
          }
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// 2. Log Analytics & Azure Container Apps Environment
// -----------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Azure Container App (Backend FastAPI Engine)
// -----------------------------------------------------------------------------
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: [
            'https://${customDomain}'
            'https://www.${customDomain}'
            'https://pdfbolt.onrender.com'
            'http://localhost:5173'
          ]
          allowedMethods: [
            'GET'
            'POST'
            'OPTIONS'
            'DELETE'
          ]
          allowedHeaders: [
            '*'
          ]
          maxAge: 3600
        }
      }
      secrets: [
        {
          name: 'storage-connection-string'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'pdfbolt-api'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'APP_ENV'
              value: 'production'
            },
            {
              name: 'DEBUG'
              value: 'false'
            },
            {
              name: 'STORAGE_BACKEND'
              value: 'azure'
            },
            {
              name: 'AZURE_STORAGE_CONNECTION_STRING'
              secretRef: 'storage-connection-string'
            },
            {
              name: 'AZURE_STORAGE_CONTAINER_NAME'
              value: 'pdfbolt-documents'
            },
            {
              name: 'PROCESSING_FILE_TTL_SECONDS'
              value: '900'
            },
            {
              name: 'HARD_SAFETY_TTL_SECONDS'
              value: '1200'
            },
            {
              name: 'CLEANUP_INTERVAL_SECONDS'
              value: '300'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '30'
              }
            }
          }
        ]
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 4. Azure Static Web App (Frontend React / Vite SPA)
// -----------------------------------------------------------------------------
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: 'eastus2' // Global SWA resource location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------
output backendApiFqdn string = containerApp.properties.configuration.ingress.fqdn
output backendApiUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output storageAccountName string = storageAccount.name
