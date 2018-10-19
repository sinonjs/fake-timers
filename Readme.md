# lolex [![Build Status](https://travis-ci.org/sinonjs/lolex.svg?branch=master)](https://travis-ci.org/sinonjs/lolex)

**lolex** can be used to simulate passing time in automated tests and other
situations where you want the scheduling semantics, but don't want to actually
wait.

* Implements global functions like `setTimeout`, `setInterval` and so on
* Provides a `Date` object

In addition in browser environment lolex provides a `performance` implementation that gets its time from the clock. In Node environments lolex provides a `nextTick` implementation that is synchronized with the clock - and a `process.hrtime` shim that works with the clock.


## Documentation

https://sinonjs.github.io/lolex/

## License

BSD 3-clause "New" or "Revised" License  (see LICENSE file)
