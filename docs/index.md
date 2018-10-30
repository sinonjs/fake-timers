# lolex

**lolex** is a JavaScript package within [Sinon.JS](https://github.com/sinonjs/sinon.js)
that uses timing related web APIs.

For example, use **lolex** to simulate a system clock in your testing environment to control
the flow of time when your testing scenario requires scheduling semantics.

**lolex** implemnts the following methods:

* [`setTimeout`](#settimeoutcallback-timeout-args)
* [`clearTimeout`](#cleartimeoutid)
* [`setImmediate`](#setimmediatecallback-args)
* [`clearImmediate`](#clearimmediateid)
* [`setInterval`](#setintervalcallback-timeout-args)
* [`clearInterval`](#clearintervalid)
* [`requestAnimationFrame`](#requestanimationframecallback)
* [`cancelAnimationFrame`](#cancelanimationframeid)
* [`Date`](#date)
* [`nextTick`](#nexttickcallback-args)
* [`queueMicrotask`](#queuemicrotaskcallback)
* [`performance.now`](#performancenow)


## Installation

To install **lolex**, enter the following into the command line:

```shell
npm install lolex --save-dev
```

Alternately, you can [build the package yourself](https://github.com/sinonjs/lolex/blob/master/package.json#L22).


## Usage

**lolex** can be used in both Node.js and browser environments.

In addition in browser environment **lolex** provides a [`performance`](#performancenow) implementation that gets its time from the clock.
In Node.js environments **lolex** provides a [`nextTick`](#nexttick) implementation that is synchronized with the clock - and a [`process.hrtime`](#hrtimeprevtime) shim that works with the clock.

If you want to use **lolex** in a browser you can use
[the pre-built version](https://github.com/sinonjs/lolex/blob/master/lolex.js)
available in the repo and the npm package.

Using npm you only need to reference **lolex** in your `<script>` tags.

```html
<script type="text/javascript" src="https://unpkg.com/lolex@1.4.0/src/lolex.js">
...
</script>
```

The following code sample creates a new clock, schedules an event with the
[`setTimeout` ](#setTimeout) function, and moves the clock ahead using the
[`tick`](#tick) method:

```js
// In the browser distribution, a global lolex is already available
var lolex = require("lolex");

var clock = lolex.createClock();

clock.setTimeout(function () {
    console.log("The poblano is a mild chili pepper originating in the state of Puebla, Mexico.");
}, 15);

// ...

clock.tick(15);
```

**NOTE:**  In the browser distribution, a global **lolex** clock is available by default.

After the last line is executed, an interesting fact about the [Poblano](http://en.wikipedia.org/wiki/Poblano)
pepper is displayed on the screen.
If you want to simulate asynchronous behavior, you have to use your imagination when calling the various functions.

In addition to the [`tick`](#tick) method, the [`next`](#next), [`runAll`](#runall), [`runToFrame`](#runtoframe),
and [`runToLast`](#runtolast) methods are available to advance the clock.
See the [`clock API Reference`](#clock-api) for more details.


### Faking native timers

When using **lolex** to test timers, you will most likely want to replace the native
timers such that calling `setTimeout` actually schedules a callback with your
clock instance, not the browser's internals.

Calling [`install`](#installconfig) with no arguments achieves this. You can call `uninstall`
later to restore things as they were again.

```js
// In the browser distribution, a global lolex is already available
var lolex = require("lolex");

var clock = lolex.install();
// Equivalent to
// var clock = lolex.install(typeof global !== "undefined" ? global : window);

setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.tick(15); // fn is called

clock.uninstall();
// setTimeout is restored to the native implementation
```

To hijack timers in another context pass it to the `install` method.

```js
var lolex = require("lolex");

var context = {
    setTimeout: setTimeout // By default context.setTimeout uses the global setTimeout
}
var clock = lolex.install({target: context});

context.setTimeout(fn, 15); // Schedules with clock.setTimeout

clock.uninstall();
// context.setTimeout is restored to the original implementation
```

Usually you want to install the timers onto the global object, so call [`install`](#installconfig)
without arguments.

#### Automatically incrementing mocked time

Since version 2.0 **lolex** supports the possibility to attach fake timers
to any change in the real system time. This basically means you no longer need
to `tick()` the clock in a situation where you won't know **when** to call `tick()`.

Please note that this is achieved using the original `setImmediate()` API at a certain
configurable interval `config.advanceTimeDelta` (default: 20ms). Meaning time would
be incremented every 20ms, not in real time.

An example would be:

```js
var lolex = require("lolex");

var clock = lolex.install({shouldAdvanceTime: true, advanceTimeDelta: 40});

setTimeout(() => {
    console.log('this just timed out'); //executed after 40ms
}, 30);

setImmediate(() => {
    console.log('not so immediate'); //executed after 40ms
});

setTimeout(() => {
    console.log('this timed out after'); //executed after 80ms
    clock.uninstall();
}, 50);
```

## lolex API

### `createClock([now[, loopLimit]])`

Creates a [clock](#clock-api) instance. The default
[epoch](https://en.wikipedia.org/wiki/Epoch_%28reference_date%29) is `0`.

The `now` argument may be a number (in milliseconds) or a
[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object.

The `loopLimit` argument sets the maximum number of timers that will be run when calling `runAll()` before assuming that we have an infinite loop and throwing an error. The default is `1000`.

### `install([config])`

Installs **lolex** using the specified config (otherwise with epoch `0` on the global scope). The following configuration options are available

Parameter | Type | Default | Description
--------- | ---- | ------- | ------------
`config.target`| Object | global | installs **lolex** onto the specified target context
`config.now` | Number/Date | 0 | installs **lolex** with the specified unix epoch
`config.toFake` | String[] | ["setTimeout", "clearTimeout", "setImmediate", "clearImmediate","setInterval", "clearInterval", "Date", "requestAnimationFrame", "cancelAnimationFrame", "hrtime"] | an array with explicit function names to hijack. *When not set, **lolex** will automatically fake all methods **except** `nextTick`* e.g., `lolex.install({ toFake: ["setTimeout","nextTick"]})` will fake only `setTimeout` and `nextTick`
`config.loopLimit` | Number | 1000 | the maximum number of timers that will be run when calling runAll()
`config.shouldAdvanceTime` | Boolean | false | tells **lolex** to increment mocked time automatically based on the real system time shift (e.g. the mocked time will be incremented by 20ms for every 20ms change in the real system time)
`config.advanceTimeDelta` | Number | 20 | relevant only when using with `shouldAdvanceTime: true`. increment mocked time by `advanceTimeDelta` ms every `advanceTimeDelta` ms change in the real system time.

### `withGlobal(global)`

In order to support creating clocks based on separate or sandboxed environments (such as JSDOM), **lolex** exports a factory method which takes single argument `global`, which it inspects to figure out what to mock and what features to support. When invoking this function with a global, you will get back an object with `timers`, `createClock` and `install` - same as the regular **lolex** exports only based on the passed in global instead of the global environment.

## Clock API

### `setTimeout(callback, timeout[, args])`

Schedules the callback to be fired once `timeout` milliseconds have ticked by.

In Node.js [`setTimeout`](https://nodejs.org/api/timers.html#timers_settimeout_callback_delay_args) returns a timer object. **lolex** will do the same, however
its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clearTimeout(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setTimeout`.

### `setInterval(callback, timeout[, args])`

Schedules the callback to be fired every time `timeout` milliseconds have ticked
by.

In Node.js `setInterval` returns a timer object. **lolex** will do the same, however
its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clearInterval(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setInterval`.

### `setImmediate(callback[, args])`

Schedules the callback to be fired once `0` milliseconds have ticked by. Note
that you'll still have to call `clock.tick()` for the callback to fire. If
called during a tick the callback won't fire until `1` millisecond has ticked
by.

In Node.js `setImmediate` returns a timer object. **lolex** will do the same,
however its `ref()` and `unref()` methods have no effect.

In browsers a timer ID is returned.

### `clearImmediate(id)`

Clears the timer given the ID or timer object, as long as it was created using
`setImmediate`.

### `requestAnimationFrame(callback)`

Schedules the callback to be fired on the next animation frame, which runs every
16 ticks. Returns an `id` which can be used to cancel the callback. This is
available in both browser & node environments.

### `cancelAnimationFrame(id)`

Cancels the callback scheduled by the provided id.

### `countTimers()`

Returns the number of waiting timers. This can be used to assert that a test
finishes without leaking any timers.

### `hrtime([prevTime])`
Mimicks [`process.hrtime()`](https://nodejs.org/api/process.html#process_process_hrtime_time).
Only available in Node.js.

### `nextTick(callback[, args])`

Mimics [`process.nextTick`](https://nodejs.org/api/process.html#process_process_nexttick_callback_args) to enable completely synchronous testing flows.
Only available in Node.js.

### `performance.now()`

Implements the [`now`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) method of the [`Performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) object but using the clock to provide the correct time.
Only available in environments that support the Performance object (browsers mostly).

### `queueMicrotask(callback)`

This is essentially a [`nextTick`] that drops arguments which we already support.


### `tick(time)`

Advance the clock, firing callbacks if necessary. `time` may be the number of
milliseconds to advance the clock by or a human-readable string. Valid string
formats are `"08"` for eight seconds, `"01:00"` for one minute and `"02:34:10"`
for two hours, 34 minutes and ten seconds.

### `next()`

Advances the clock to the the moment of the first scheduled timer, firing it.

### `reset()`

Removes all timers and ticks without firing them, and sets `now` to `config.now`
that was provided to `lolex.install` or to `0` if `config.now` was not provided.
Useful to reset the state of the clock without having to `uninstall` and `install` it.

### `runAll()`

This runs all pending timers until there are none remaining. If new timers are added while it is executing they will be run as well.

This makes it easier to run asynchronous tests to completion without worrying about the number of timers they use, or the delays in those timers.

It runs a maximum of `loopLimit` times after which it assumes there is an infinite loop of timers and throws an error.

### `runMicrotasks()`

This runs all pending microtasks scheduled with `nextTick` but none of the timers and is mostly useful for libraries using **lolex** underneath and for running `nextTick` items without any timers.

### `runToFrame()`

Advances the clock to the next frame, firing all scheduled animation frame callbacks,
if any, for that frame as well as any other timers scheduled along the way.

### `runToLast()`

This takes note of the last scheduled timer when it is run, and advances the
clock to that time firing callbacks as necessary.

If new timers are added while it is executing they will be run only if they
would occur before this time.

This is useful when you want to run a test to completion, but the test recursively
sets timers that would cause `runAll` to trigger an infinite loop warning.

### `setSystemTime([now])`

This simulates a user changing the system clock while your program is running.
It affects the current time but it does not in itself cause e.g. timers to fire;
they will fire exactly as they would have done without the call to
setSystemTime().

### `uninstall()`

Restores the original methods on the `target` that was passed to
`lolex.install`, or the native timers if no `target` was given.

### `Date`

Implements the
[`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
object but using the clock to provide the correct time.
