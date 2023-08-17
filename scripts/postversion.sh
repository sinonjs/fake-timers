#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR > /dev/null
set -e

# check that that origin points to the sinonjs/fake-timers repo
UPSTREAM=$(git config branch.main.remote)
git config "remote.$UPSTREAM.url" | grep '.*sinonjs/fake-timers' > /dev/null

if [[ $? != 0 ]]; then
    echo "'$UPSTREAM' doesn't point to the sinonjs/fake-timers repo. Fix tag push manually!"
    exit 1
fi

git push --follow-tags $UPSTREAM

cd ..  # to root dir
npm publish
