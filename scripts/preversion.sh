#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR > /dev/null

export SAUCE_USERNAME=sinonjs

if [ -z $SAUCE_ACCESS_KEY ]; then
    echo 'SAUCE_ACCESS_KEY has not been exported and made available for test `test-cloud` script!'
    exit 1
fi

npm test # lints and tests

npm run test-cloud # should not take more than approx 25 seconds
