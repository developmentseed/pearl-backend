#! /bin/bash

set -euo pipefail

test() {
    cd $1
    npm install
    npm run lint
    npm run cov || npm test
    cd -
}

test .
test services/api/
test services/gpu/
