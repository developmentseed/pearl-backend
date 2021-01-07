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
test api/
test gpu/
