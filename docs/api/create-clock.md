---
    layout: default
    title: lolex
---
# `createClock([now[, loopLimit]])`

Creates a [clock](#clock-api) instance. The default
[epoch](https://en.wikipedia.org/wiki/Epoch_%28reference_date%29) is `0`.

The `now` argument may be a number (in milliseconds) or a
[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object.

The `loopLimit` argument sets the maximum number of timers that will be run when calling `runAll()` before assuming that we have an infinite loop and throwing an error. The default is `1000`.

