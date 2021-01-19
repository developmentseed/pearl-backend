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