#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR > /dev/null

# check that that origin points to the sinonjs/lolex repo
git remote -v | grep 'origin.*sinonjs/lolex.*push' > /dev/null

if [[ $? != 0 ]]; then
    echo "'origin' doesn't point to the sinonjs/lolex repo. Fix tag push manually!"
    exit 1
fi

git push --follow-tags origin
