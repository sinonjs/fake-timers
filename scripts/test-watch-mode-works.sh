#!/bin/sh

out=$(mktemp)
# make silent background
npx mocha --watch 2>>$out.err 1>>$out &

PID=$!
#echo pid of mocha: $PID

echo "Round 1" >> out
touch src/fake-timers-src.js
sleep 3
echo "Round 2" >> out
touch src/fake-timers-src.js
sleep 2
echo "Cleanup" >> out

# Kill the process manually
kill $PID >/dev/null
kill -9 $PID >/dev/null

#cat $out.err
if grep failing $out; then
    echo "This means some tests do not clean up after themselves or otherwise do not work in Mocha's watch mode"
    echo "See $out for details or run $0 yourself"
    exit 1
fi
exit 0
