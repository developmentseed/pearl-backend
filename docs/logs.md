We use [loki-stack](https://grafana.github.io/loki/charts/) on our cluster to collect, store, and query logs.

To access the browser interface to visualize and query logs:

## Open Grafana
First, ensure you have `kubectl` setup and talking to the cluster. Then:

    kubectl port-forward --namespace loki-stack service/loki-stack-grafana 3000:80

This will make the Grafana UI accessible at http://localhost:3000 in your browser.
    

## Login to Grafana
Get auth token to login with:

    kubectl get secret --namespace loki-stack loki-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo

Then login with username `admin` and password as the auth token obtained above.

## View logs Dashboard

![image](https://user-images.githubusercontent.com/371666/136784322-1ad0fd8f-f420-46f8-a185-45d4970d583f.png)

Visit the corresponding link from below to see logs of API, GPU, Socket and Tiles. You can adjust the time to fetch the logs on the top right corner.
### Dev Stack
Visit http://localhost:3000/d/-cAOM_Dnk/lulc-dev-logs?orgId=1

### Staging
Visit http://localhost:3000/d/mHHOh_vnz/lulc-staging-logs?orgId=1

### Production