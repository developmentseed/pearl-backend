We use [loki-stack](https://grafana.github.io/loki/charts/) on our cluster to collect, store, and query logs.

To access the browser interface to visualize and query logs:

First, ensure you have `kubectl` setup and talking to the cluster. Then:

    kubectl port-forward --namespace loki-stack service/loki-stack-grafana 3000:80

This will make the Grafana UI accessible at http://localhost:3000 in your browser.
    
Get auth token to login with:

    kubectl get secret --namespace loki-stack loki-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d ; echo

Then login with username `admin` and password as the auth token obtained above.

