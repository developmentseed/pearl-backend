## Create an Azure Resource Group

```
az group create --name lulcStaging --location westeurope
```

## Create an Azure Container Registry

```
az acr create --resource-group lulcStaging --name lulcStagingAcr --sku Basic
```

## Create an Azure Kubernetes Service cluster

Create a cluster and attach the ACR to it.

```
az aks create -g lulcStaging -n lulcStagingAks --location westeurope --attach-acr lulcStagingAcr --generate-ssh-keys
```

## Create a Service Principal for CI

```
az ad sp create-for-rbac --sdk-auth
```

## Create a contributor scoped Service Principal for the Resource Group
```
az ad sp create-for-rbac --name lulc-frontend --role contributor --scopes /subscriptions/230383d9-08f3-4704-b6a5-d69e14bf02aa/resourceGroups/lulcStaging --sdk-auth
```
## Find ACR credentials for Helm ImagePullSecrets

* Resource Group > ACR > Access Keys > Enable Admin user
* Copy username and password into Github secrets
## Authorize and configure access to a cluster locally

```
az aks get-credentials --resource-group lulcStaging --name lulcStagingAks
```

## Create an Azure Database for PostgreSQL server

```
az postgres server create --resource-group lulcStaging --name lulcDb  --location westeurope --admin-user lulc --admin-password <server_admin_password> --sku-name GP_Gen5_2
```

## Add your IP to connect to the PostgreSQL server

```
az postgres server firewall-rule create --resource-group lulcStaging --server lulcDb --name AllowMyIP --start-ip-address <your ip address> --end-ip-address <your ip address>
```

## Get PostgreSQL connection information

```
az postgres server show --resource-group lulcStaging --name lulcDb
```

## Connect via PSQL
```
psql -h lulcdb.postgres.database.azure.com -U lulc@lulcdb -d postgres
```

## Create a database

```
createdb -h lulcdb.postgres.database.azure.com -O lulc lulc
```

# Create an Azure Storage Account
```
az storage account create \
    --name lulc \
    --resource-group lulcStaging \
    --location westeurope \
    --sku Standard_ZRS \
    --encryption-services blob
```

# Enable static website hosting from blob storage

```
az storage blob service-properties update --account-name lulc --static-website --404-document 404.html --index-document index.html
```

# Add a GPU nodepool to the cluster

```
az aks nodepool add \
    --resource-group lulcStaging \
    --cluster-name lulcStagingAks2 \
    --name gpunodepool \
    --node-count 1 \
    --node-vm-size Standard_NC6 \
    --no-wait
```
# Enable cluster autoscale
```
az aks nodepool update \
  --resource-group lulcStaging \
  --cluster-name lulcStagingAks2 \
  --name nodepool1 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 5
```
# Update cluster autoscale on an node pool (if needed to change min / max)
```
az aks nodepool update \
  --resource-group lulcStaging \
  --cluster-name lulcStagingAks2 \
  --name nodepool1 \
  --update-cluster-autoscaler \
  --min-count 3 \
  --max-count 5
```

# Add the AKS specialized GPU image support (one time)

```
az feature register --name GPUDedicatedVHDPreview --namespace Microsoft.ContainerService
```

## Check the status
```
az feature list -o table --query "[?contains(name, 'Microsoft.ContainerService/GPUDedicatedVHDPreview')].{Name:name,State:properties.state}"
```

## Refresh the registration
```
az provider register --namespace Microsoft.ContainerService
```

## Use the AKS specialized GPU image on a cluster
```
az aks nodepool add --name gpu --cluster-name lulcStagingAks2 --resource-group lulcStaging --node-vm-size Standard_NC6 --node-count 1 --aks-custom-headers UseGPUDedicatedVHD=true
```