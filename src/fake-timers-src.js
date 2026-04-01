"use strict";

const globalObject = require("@sinonjs/commons").global;
let timersModule, timersPromisesModule;
if (typeof require === "function" && typeof module === "object") {
    try {
        timersModule = require("timers");
    } catch (e) {
        // ignored
    }
    try {
        timersPromisesModule = require("timers/promises");
    } catch (e) {
        // ignored
    }
}

/**
 * @typedef {"nextAsync" | "manual" | "interval"} TickMode
 */

/**
 * @typedef {object} NextAsyncTickMode
 * @property {"nextAsync"} mode - runs timers one macrotask at a time
 */

/**
 * @typedef {object} ManualTickMode
 * @property {"manual"} mode - advances only when the caller explicitly ticks
 */

/**
 * @typedef {object} IntervalTickMode
 * @property {"interval"} mode - advances automatically on a native interval
 * @property {number} [delta] - interval duration in milliseconds
 */

/**
 * @typedef {IntervalTickMode | NextAsyncTickMode | ManualTickMode} TimerTickMode
 */

/**
 * @typedef {object} IdleDeadline
 * @property {boolean} didTimeout - whether or not the callback was called before reaching the optional timeout
 * @property {function():number} timeRemaining - a floating-point value providing an estimate of the number of milliseconds remaining in the current idle period
 */

/**
 * @callback RequestIdleCallbackCallback
 * @param {IdleDeadline} deadline
 */

/**
 * Queues a function to be called during a browser's idle periods
 * @callback RequestIdleCallback
 * @param {RequestIdleCallbackCallback} callback
 * @param {{timeout: number}} [options] - an options object
 * @returns {number} the id
 */

/**
 * @callback NextTick
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {...*} args - optional arguments to call the callback with
 * @returns {void}
 */

/**
 * @callback SetImmediate
 * @param {VoidVarArgsFunc} callback - the callback to run
 * @param {...*} args - optional arguments to call the callback with
 * @returns {NodeImmediate}
 */

/**
 * @callback VoidVarArgsFunc
 * @param {...*} callback - the callback to run
 * @returns {void}
 */

/**
 * @typedef RequestAnimationFrame
 * @property {function(number):void} requestAnimationFrame - schedules a frame callback
 * @returns {number} - the request id
 */

/**
 * @typedef Performance
 * @property {function(): number} now - returns the current high-resolution time
 */

/* eslint-disable jsdoc/require-property-description */
/**
 * @typedef {object} Clock
 * @property {number} now - current mocked time in milliseconds
 * @property {Date} Date - fake Date constructor bound to this clock
 * @property {number} loopLimit - maximum number of timers before assuming an infinite loop
 * @property {RequestIdleCallback} requestIdleCallback - schedules an idle callback
 * @property {function(number):void} cancelIdleCallback - cancels a scheduled idle callback
 * @property {setTimeout} setTimeout - faked `setTimeout`
 * @property {clearTimeout} clearTimeout - faked `clearTimeout`
 * @property {NextTick} nextTick - faked `process.nextTick`
 * @property {queueMicrotask} queueMicrotask - faked `queueMicrotask`
 * @property {setInterval} setInterval - faked `setInterval`
 * @property {clearInterval} clearInterval - faked `clearInterval`
 * @property {SetImmediate} setImmediate - faked `setImmediate`
 * @property {function(NodeImmediate):void} clearImmediate - faked `clearImmediate`
 * @property {function():number} countTimers - counts scheduled timers
 * @property {RequestAnimationFrame} requestAnimationFrame - schedules a frame callback
 * @property {function(number):void} cancelAnimationFrame - cancels a frame callback
 * @property {function():void} runMicrotasks - drains microtasks
 * @property {function(string | number): number} tick - advances fake time synchronously
 * @property {function(string | number): Promise<number>} tickAsync - advances fake time asynchronously
 * @property {function(): number} next - runs the next scheduled timer
 * @property {function(): Promise<number>} nextAsync - runs the next scheduled timer asynchronously
 * @property {function(): number} runAll - runs all scheduled timers
 * @property {function(): number} runToFrame - runs timers up to the next animation frame
 * @property {function(): Promise<number>} runAllAsync - runs all scheduled timers asynchronously
 * @property {function(): number} runToLast - runs timers up to the last scheduled timer
 * @property {function(): Promise<number>} runToLastAsync - runs timers up to the last scheduled timer asynchronously
 * @property {function(): void} reset - clears all timers and resets the clock
 * @property {function(number | Date): void} setSystemTime - sets the clock to a specific wall-clock time
 * @property {function(number): number} jump - advances time and returns the new `now`
 * @property {Performance} performance - fake performance object
 * @property {function(number[]): number[]} hrtime - faked `process.hrtime`
 * @property {function(): void} uninstall - restores native timers
 * @property {Function[]} methods - names of faked methods
 * @property {boolean} [shouldClearNativeTimers] - inherited from config
 * @property {{methodName:string, original:any}[] | undefined} timersModuleMethods - saved Node timers module methods
 * @property {{methodName:string, original:any}[] | undefined} timersPromisesModuleMethods - saved Node timers/promises methods
 * @property {Map<function(): void, AbortSignal>} abortListenerMap - active abort listeners
 * @property {function(TimerTickMode): void} setTickMode - switches the auto-tick mode
 */
/* eslint-enable jsdoc/require-property-description */

/**
 * Configuration object for the `install` method.
 * @typedef {object} Config
 * @property {number|Date} [now] initial mocked time, as milliseconds since epoch or a Date
 * @property {string[]} [toFake] method names that should be faked
 * @property {string[]} [toNotFake] method names that should remain native
 * @property {number} [loopLimit] maximum number of timers run before aborting with an infinite-loop error
 * @property {boolean} [shouldAdvanceTime] automatically increments mocked time while the clock is installed
 * @property {number} [advanceTimeDelta] interval in milliseconds used when `shouldAdvanceTime` is enabled
 * @property {boolean} [shouldClearNativeTimers] forwards clear calls to native methods when the timer is not fake
 * @property {boolean} [ignoreMissingTimers] suppresses errors when a requested timer is missing from the global object
 */

/* eslint-disable jsdoc/require-property-description */
/**
 * The internal structure to describe a scheduled fake timer
 * @typedef {object} Timer
 * @property {Function} func - callback or string to execute
 * @property {*[]} args - arguments passed to the callback
 * @property {'Timeout' | 'Interval' | 'Immediate' | 'AnimationFrame' | 'IdleCallback'} type - timer kind
 * @property {number} delay - requested delay in milliseconds
 * @property {number} callAt - scheduled execution time
 * @property {number} createdAt - time at which the timer was created
 * @property {boolean} immediate - whether this timer should run before non-immediate timers at the same time
 * @property {number} id - unique timer identifier
 * @property {Error} [error] - captured stack for loop diagnostics
 */

/**
 * A Node timer
 * @typedef {object} NodeImmediate
 * @property {function(): boolean} hasRef - reports whether the timer keeps the event loop alive
 * @property {function(): NodeImmediate} ref - marks the timer as referenced
 * @property {function(): NodeImmediate} unref - marks the timer as unreferenced
 */
/* eslint-enable jsdoc/require-property-description */

/* eslint-disable complexity */

/**
 * Mocks available features in the specified global namespace.
 * @param {*} _global Namespace to mock (e.g. `window`)
 * @returns {FakeTimers}
 */
function withGlobal(_global) {
    const maxTimeout = Math.pow(2, 31) - 1; //see https://heycam.github.io/webidl/#abstract-opdef-converttoint
    const idCounterStart = 1e12; // arbitrarily large number to avoid collisions with native timer IDs
    const NOOP = function () {
        return undefined;
    };
    const NOOP_ARRAY = function () {
        return [];
    };
    const isPresent = {};
    let timeoutResult,
        addTimerReturnsObject = false;

    if (_global.setTimeout) {
        isPresent.setTimeout = true;
        timeoutResult = _global.setTimeout(NOOP, 0);
        addTimerReturnsObject = typeof timeoutResult === "object";
    }
    isPresent.clearTimeout = Boolean(_global.clearTimeout);
    isPresent.setInterval = Boolean(_global.setInterval);
    isPresent.clearInterval = Boolean(_global.clearInterval);
    isPresent.hrtime =
        _global.process && typeof _global.process.hrtime === "function";
    isPresent.hrtimeBigint =
        isPresent.hrtime && typeof _global.process.hrtime.bigint === "function";
    isPresent.nextTick =
        _global.process && typeof _global.process.nextTick === "function";
    const utilPromisify = _global.process && require("util").promisify;
    isPresent.performance =
        _global.performance && typeof _global.performance.now === "function";
    const hasPerformancePrototype =
        _global.Performance &&
        (typeof _global.Performance).match(/^(function|object)$/);
    const hasPerformanceConstructorPrototype =
        _global.performance &&
        _global.performance.constructor &&
        _global.performance.constructor.prototype;
    isPresent.queueMicrotask = Object.prototype.hasOwnProperty.call(
        _global,
        "queueMicrotask",
    );
    isPresent.requestAnimationFrame =
        _global.requestAnimationFrame &&
        typeof _global.requestAnimationFrame === "function";
    isPresent.cancelAnimationFrame =
        _global.cancelAnimationFrame &&
        typeof _global.cancelAnimationFrame === "function";
    isPresent.requestIdleCallback =
        _global.requestIdleCallback &&
        typeof _global.requestIdleCallback === "function";
    isPresent.cancelIdleCallback =
        _global.cancelIdleCallback &&
        typeof _global.cancelIdleCallback === "function";
    isPresent.setImmediate =
        _global.setImmediate && typeof _global.setImmediate === "function";
    isPresent.clearImmediate =
        _global.clearImmediate && typeof _global.clearImmediate === "function";
    isPresent.Intl = _global.Intl && typeof _global.Intl === "object";

    if (_global.clearTimeout) {
        _global.clearTimeout(timeoutResult);
    }

    const NativeDate = _global.Date;
    const NativeIntl = isPresent.Intl
        ? Object.defineProperties(
              Object.create(null),
              Object.getOwnPropertyDescriptors(_global.Intl),
          )
        : undefined;
    let uniqueTimerId = idCounterStart;
    let uniqueTimerOrder = 0;

    if (NativeDate === undefined) {
        throw new Error(
            "The global scope doesn't have a `Date` object" +
                " (see https://github.com/sinonjs/sinon/issues/1852#issuecomment-419622780)",
        );
    }
    isPresent.Date = true;

    /**
     * The PerformanceEntry object encapsulates a single performance metric
     * that is part of the browser's performance timeline.
     *
     * This is an object returned by the `mark` and `measure` methods on the Performance prototype
     */
    class FakePerformanceEntry {
        constructor(name, entryType, startTime, duration) {
            this.name = name;
            this.entryType = entryType;
            this.startTime = startTime;
            this.duration = duration;
        }

        toJSON() {
            return JSON.stringify({ ...this });
        }
    }

    /**
     * @param {number} num
     * @returns {boolean}
     */
    function isNumberFinite(num) {
        if (Number.isFinite) {
            return Number.isFinite(num);
        }

        return isFinite(num);
    }

    let isNearInfiniteLimit = false;

    /**
     * @param {Clock} clock
     * @param {number} i
     */
    function checkIsNearInfiniteLimit(clock, i) {
        if (clock.loopLimit && i === clock.loopLimit - 1) {
            isNearInfiniteLimit = true;
        }
    }

    /**
     *
     */
    function resetIsNearInfiniteLimit() {
        isNearInfiniteLimit = false;
    }

    /**
     * Parse strings like "01:10:00" (meaning 1 hour, 10 minutes, 0 seconds) into
     * number of milliseconds. This is used to support human-readable strings passed
     * to clock.tick()
     * @param {string} str
     * @returns {number}
     */
    function parseTime(str) {
        if (!str) {
            return 0;
        }

        const strings = str.split(":");
        const l = strings.length;
        let i = l;
        let ms = 0;
        let parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error(
                "tick only understands numbers, 'm:s' and 'h:m:s'. Each part must be two digits",
            );
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error(`Invalid time ${str}`);
            }

            ms += parsed * Math.pow(60, l - i - 1);
        }

        return ms * 1000;
    }

    /**
     * Get the decimal part of the millisecond value as nanoseconds
     * @param {number} msFloat the number of milliseconds
     * @returns {number} an integer number of nanoseconds in the range [0,1e6)
     *
     * Example: nanoRemainer(123.456789) -> 456789
     */
    function nanoRemainder(msFloat) {
        const modulo = 1e6;
        const remainder = (msFloat * 1e6) % modulo;
        const positiveRemainder =
            remainder < 0 ? remainder + modulo : remainder;

        return Math.floor(positiveRemainder);
    }

    /**
     * Used to grok the `now` parameter to createClock.
     * @param {Date|number} epoch the system time
     * @returns {number}
     */
    function getEpoch(epoch) {
        if (!epoch) {
            return 0;
        }
        if (typeof epoch.getTime === "function") {
            return epoch.getTime();
        }
        if (typeof epoch === "number") {
            return epoch;
        }
        throw new TypeError("now should be milliseconds since UNIX epoch");
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {Timer} timer
     * @returns {boolean}
     */
    function inRange(from, to, timer) {
        return timer && timer.callAt >= from && timer.callAt <= to;
    }

    /**
     * @param {Clock} clock
     * @param {Timer} job
     * @returns {Error}
     */
    function getInfiniteLoopError(clock, job) {
        const infiniteLoopError = new Error(
            `Aborting after running ${clock.loopLimit} timers, assuming an infinite loop!`,
        );

        if (!job.error) {
            return infiniteLoopError;
        }

        // pattern never matched in Node
        const computedTargetPattern = /target\.*[<|(|[].*?[>|\]|)]\s*/;
        let clockMethodPattern = new RegExp(
            String(Object.keys(clock).join("|")),
        );

        if (addTimerReturnsObject) {
            // node.js environment
            clockMethodPattern = new RegExp(
                `\\s+at (Object\\.)?(?:${Object.keys(clock).join("|")})\\s+`,
            );
        }

        let matchedLineIndex = -1;
        job.error.stack.split("\n").some(function (line, i) {
            // If we've matched a computed target line (e.g. setTimeout) then we
            // don't need to look any further. Return true to stop iterating.
            const matchedComputedTarget = line.match(computedTargetPattern);
            /* istanbul ignore if */
            if (matchedComputedTarget) {
                matchedLineIndex = i;
                return true;
            }

            // If we've matched a clock method line, then there may still be
            // others further down the trace. Return false to keep iterating.
            const matchedClockMethod = line.match(clockMethodPattern);
            if (matchedClockMethod) {
                matchedLineIndex = i;
                return false;
            }

            // If we haven't matched anything on this line, but we matched
            // previously and set the matched line index, then we can stop.
            // If we haven't matched previously, then we should keep iterating.
            return matchedLineIndex >= 0;
        });

        const stack = `${infiniteLoopError}\n${job.type || "Microtask"} - ${
            job.func.name || "anonymous"
        }\n${job.error.stack
            .split("\n")
            .slice(matchedLineIndex + 1)
            .join("\n")}`;

        try {
            Object.defineProperty(infiniteLoopError, "stack", {
                value: stack,
            });
        } catch (e) {
            // noop
        }

        return infiniteLoopError;
    }

    //eslint-disable-next-line jsdoc/require-jsdoc
    function createDate() {
        class ClockDate extends NativeDate {
            /**
             * @param {number} year
             * @param {number} month
             * @param {number} date
             * @param {number} hour
             * @param {number} minute
             * @param {number} second
             * @param {number} ms
             */
            // eslint-disable-next-line no-unused-vars
            constructor(year, month, date, hour, minute, second, ms) {
                // Defensive and verbose to avoid potential harm in passing
                // explicit undefined when user does not pass argument
                if (arguments.length === 0) {
                    super(ClockDate.clock.now);
                } else {
                    super(...arguments);
                }

                // ensures identity checks using the constructor prop still works
                // this should have no other functional effect
                Object.defineProperty(this, "constructor", {
                    value: NativeDate,
                    enumerable: false,
                });
            }

            static [Symbol.hasInstance](instance) {
                return instance instanceof NativeDate;
            }
        }

        ClockDate.isFake = true;

        if (NativeDate.now) {
            ClockDate.now = function now() {
                return ClockDate.clock.now;
            };
        }

        if (NativeDate.toSource) {
            ClockDate.toSource = function toSource() {
                return NativeDate.toSource();
            };
        }

        ClockDate.toString = function toString() {
            return NativeDate.toString();
        };

        // noinspection UnnecessaryLocalVariableJS
        /**
         * A normal Class constructor cannot be called without `new`, but Date can, so we need
         * to wrap it in a Proxy in order to ensure this functionality of Date is kept intact
         * @type {Function}
         */
        const ClockDateProxy = new Proxy(ClockDate, {
            // handler for [[Call]] invocations (i.e. not using `new`)
            apply() {
                // the Date constructor called as a function, ref Ecma-262 Edition 5.1, section 15.9.2.
                // This remains so in the 10th edition of 2019 as well.
                if (this instanceof ClockDate) {
                    throw new TypeError(
                        "A Proxy should only capture `new` calls with the `construct` handler. This is not supposed to be possible, so check the logic.",
                    );
                }

                return new NativeDate(ClockDate.clock.now).toString();
            },
        });

        return ClockDateProxy;
    }

    /**
     * Mirror Intl by default on our fake implementation
     *
     * Most of the properties are the original native ones,
     * but we need to take control of those that have a
     * dependency on the current clock.
     * @returns {object} the partly fake Intl implementation
     */
    function createIntl() {
        const ClockIntl = {};
        /*
         * All properties of Intl are non-enumerable, so we need
         * to do a bit of work to get them out.
         */
        Object.getOwnPropertyNames(NativeIntl).forEach(
            (property) => (ClockIntl[property] = NativeIntl[property]),
        );

        ClockIntl.DateTimeFormat = function (...args) {
            const realFormatter = new NativeIntl.DateTimeFormat(...args);
            const formatter = {};

            ["formatRange", "formatRangeToParts", "resolvedOptions"].forEach(
                (method) => {
                    formatter[method] =
                        realFormatter[method].bind(realFormatter);
                },
            );

            ["format", "formatToParts"].forEach((method) => {
                formatter[method] = function (date) {
                    return realFormatter[method](date || ClockIntl.clock.now);
                };
            });

            return formatter;
        };

        ClockIntl.DateTimeFormat.prototype = Object.create(
            NativeIntl.DateTimeFormat.prototype,
        );

        ClockIntl.DateTimeFormat.supportedLocalesOf =
            NativeIntl.DateTimeFormat.supportedLocalesOf;

        return ClockIntl;
    }

    //eslint-disable-next-line jsdoc/require-jsdoc
    function enqueueJob(clock, job) {
        // enqueues a microtick-deferred task - ecma262/#sec-enqueuejob
        if (!clock.jobs) {
            clock.jobs = [];
        }
        clock.jobs.push(job);
    }

    //eslint-disable-next-line jsdoc/require-jsdoc
    function runJobs(clock) {
        // runs all microtick-deferred tasks - ecma262/#sec-runjobs
        if (!clock.jobs) {
            return;
        }
        for (let i = 0; i < clock.jobs.length; i++) {
            const job = clock.jobs[i];
            job.func.apply(null, job.args);

            checkIsNearInfiniteLimit(clock, i);
            if (clock.loopLimit && i > clock.loopLimit) {
                throw getInfiniteLoopError(clock, job);
            }
        }
        resetIsNearInfiniteLimit();
        clock.jobs = [];
    }

    /**
     * A compact "soonest timer first" container.
     *
     * Think of this as a waiting room for scheduled callbacks where the next
     * callback to run is always kept at the front of the list. The internal
     * array is arranged so we can find, add, remove, and reorder timers
     * efficiently without sorting the whole list every time something changes.
     *
     * The important idea is not the data structure name, but the behavior:
     * the timer that should run next stays near the front, and when one timer
     * moves, the rest are shifted just enough to keep that promise true.
     */
    class TimerHeap {
        constructor() {
            this.timers = [];
        }

        /**
         * Look at the next timer without removing it.
         * This is the timer the clock would run first if time advanced now.
         * @returns {Timer}
         */
        peek() {
            return this.timers[0];
        }

        /**
         * Add a timer to the waiting room, then move it upward until it is in
         * the right place relative to the timers it should run before and after.
         * @param {Timer} timer
         */
        push(timer) {
            this.timers.push(timer);
            this.bubbleUp(this.timers.length - 1);
        }

        /**
         * Remove and return the next timer to run.
         *
         * We pull the front timer out, move the last timer into the empty spot,
         * and then shift that replacement down until the ordering is correct
         * again. That avoids rebuilding the whole list from scratch.
         * @returns {Timer|undefined}
         */
        pop() {
            if (this.timers.length === 0) {
                return undefined;
            }
            const first = this.timers[0];
            const last = this.timers.pop();
            if (this.timers.length > 0) {
                this.timers[0] = last;
                last.heapIndex = 0;
                this.bubbleDown(0);
            }
            delete first.heapIndex;
            return first;
        }

        /**
         * Remove a specific timer from the waiting room.
         *
         * The heap stores timers in a shape that lets us jump directly to the
         * timer's current position, replace it with the last timer, and then
         * move that replacement up or down until the ordering is correct again.
         * @param {Timer} timer
         * @returns {boolean}
         */
        remove(timer) {
            const index = timer.heapIndex;
            if (index === undefined || this.timers[index] !== timer) {
                return false;
            }
            const last = this.timers.pop();
            if (timer !== last) {
                this.timers[index] = last;
                last.heapIndex = index;
                if (compareTimers(last, timer) < 0) {
                    this.bubbleUp(index);
                } else {
                    this.bubbleDown(index);
                }
            }
            delete timer.heapIndex;
            return true;
        }

        /**
         * Move a timer toward the front until it is no longer "earlier" than
         * the timer above it.
         *
         * Conceptually, this is what happens when something newly scheduled
         * turns out to belong ahead of its parent in the waiting room. We keep
         * swapping it upward until it is no longer out of place.
         * @param {number} index
         */
        bubbleUp(index) {
            const timer = this.timers[index];
            let currentIndex = index;
            while (currentIndex > 0) {
                const parentIndex = Math.floor((currentIndex - 1) / 2);
                const parent = this.timers[parentIndex];
                if (compareTimers(timer, parent) < 0) {
                    this.timers[currentIndex] = parent;
                    parent.heapIndex = currentIndex;
                    currentIndex = parentIndex;
                } else {
                    break;
                }
            }
            this.timers[currentIndex] = timer;
            timer.heapIndex = currentIndex;
        }

        /**
         * Move a timer away from the front until the timer below it is no
         * longer supposed to run after it.
         *
         * This is the opposite of `bubbleUp`: when a timer at the front is
         * removed or moved, the replacement may be too far ahead, so we
         * repeatedly swap it downward with the best child until the waiting
         * room is ordered again.
         * @param {number} index
         */
        bubbleDown(index) {
            const timer = this.timers[index];
            let currentIndex = index;
            const halfLength = Math.floor(this.timers.length / 2);
            while (currentIndex < halfLength) {
                const leftIndex = currentIndex * 2 + 1;
                const rightIndex = leftIndex + 1;
                let bestChildIndex = leftIndex;
                let bestChild = this.timers[leftIndex];

                if (
                    rightIndex < this.timers.length &&
                    compareTimers(this.timers[rightIndex], bestChild) < 0
                ) {
                    bestChildIndex = rightIndex;
                    bestChild = this.timers[rightIndex];
                }

                if (compareTimers(bestChild, timer) < 0) {
                    this.timers[currentIndex] = bestChild;
                    bestChild.heapIndex = currentIndex;
                    currentIndex = bestChildIndex;
                } else {
                    break;
                }
            }
            this.timers[currentIndex] = timer;
            timer.heapIndex = currentIndex;
        }
    }

    /**
     * Ensure timer storage and heap stay in sync even if a clear path touches
     * timer state before anything has been scheduled.
     *
     * Why do we need two data structures to keep tabs on timers?
     * 1. Fast ID Lookup (clock.timers): This is a simple object mapping timer IDs to their respective timer objects. It allows clearTimeout(id) and
     * clearInterval(id) to be $O(1)$ operations. Without this map, finding a specific timer in the heap to remove it would require a linear
     * $O(n)$ search, which would significantly degrade performance as the number of active timers grows.
     * 2. Efficient Scheduling (clock.timerHeap): This is a priority queue (min-heap) that keeps timers ordered by their execution time (callAt). It
     * allows the library to instantly find the next timer to run (peek() in $O(1)$) and efficiently update the schedule when timers are added or
     * removed ($O(\log n)$).
     *
     * In short: clock.timers provides fast access by ID, while clock.timerHeap provides fast access by Time. Removing either one would make common
     * operations (like clearing or finding the next timer) much slower.
     * @param {Clock} clock
     */
    function ensureTimerState(clock) {
        if (!clock.timers) {
            clock.timers = {};
        }

        if (!clock.timerHeap) {
            clock.timerHeap = new TimerHeap();
            for (const timer of Object.values(clock.timers)) {
                clock.timerHeap.push(timer);
            }
        }
    }

    /**
     * @param {Clock} clock
     * @param {Timer} timer
     * @returns {number} id of the created timer
     */
    function addTimer(clock, timer) {
        if (timer.func === undefined) {
            throw new Error("Callback must be provided to timer calls");
        }

        if (typeof timer.func !== "function") {
            throw new TypeError(
                `[ERR_INVALID_CALLBACK]: Callback must be a function. Received ${
                    timer.func
                } of type ${typeof timer.func}`,
            );
        }

        if (isNearInfiniteLimit) {
            timer.error = new Error();
        }

        timer.type = timer.immediate ? "Immediate" : "Timeout";

        if (Object.prototype.hasOwnProperty.call(timer, "delay")) {
            if (typeof timer.delay !== "number") {
                timer.delay = parseInt(timer.delay, 10);
            }

            if (!isNumberFinite(timer.delay)) {
                timer.delay = 0;
            }
            timer.delay = timer.delay > maxTimeout ? 1 : timer.delay;
            timer.delay = Math.max(0, timer.delay);
        }

        if (Object.prototype.hasOwnProperty.call(timer, "interval")) {
            timer.type = "Interval";
            timer.interval = timer.interval > maxTimeout ? 1 : timer.interval;
        }

        if (Object.prototype.hasOwnProperty.call(timer, "animation")) {
            timer.type = "AnimationFrame";
            timer.animation = true;
        }

        if (
            Object.prototype.hasOwnProperty.call(timer, "requestIdleCallback")
        ) {
            // mark timer as IdleCallback type if it has no delay, otherwise it'd be of type timeout
            // this way we are able to sort such that the timer only gets called when there's truly no pending task to run
            if (!timer.delay) {
                timer.type = "IdleCallback";
            }
            timer.requestIdleCallback = true;
        }

        ensureTimerState(clock);

        while (clock.timers && clock.timers[uniqueTimerId]) {
            uniqueTimerId++;
            if (uniqueTimerId >= Number.MAX_SAFE_INTEGER) {
                uniqueTimerId = idCounterStart;
            }
        }

        timer.id = uniqueTimerId++;
        if (uniqueTimerId >= Number.MAX_SAFE_INTEGER) {
            uniqueTimerId = idCounterStart;
        }

        timer.order = uniqueTimerOrder++;
        timer.createdAt = clock.now;
        timer.callAt =
            clock.now + (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));

        clock.timers[timer.id] = timer;
        clock.timerHeap.push(timer);

        if (addTimerReturnsObject) {
            const res = {
                refed: true,
                ref: function () {
                    this.refed = true;
                    return this;
                },
                unref: function () {
                    this.refed = false;
                    return this;
                },
                hasRef: function () {
                    return this.refed;
                },
                refresh: function () {
                    timer.callAt =
                        clock.now +
                        (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));

                    clock.timerHeap.remove(timer);
                    timer.order = uniqueTimerOrder++;
                    clock.timers[timer.id] = timer;
                    clock.timerHeap.push(timer);

                    return this;
                },
                [Symbol.toPrimitive]: function () {
                    return timer.id;
                },
            };
            return res;
        }

        return timer.id;
    }

    /* eslint consistent-return: "off" */
    /**
     * Timer comparator
     * @param {Timer} a
     * @param {Timer} b
     * @returns {number}
     */
    function compareTimers(a, b) {
        // Sort IdleCallback timers to the bottom when scheduled for the same time
        if (a.type === "IdleCallback" && b.type !== "IdleCallback") {
            return 1;
        }
        if (a.type !== "IdleCallback" && b.type === "IdleCallback") {
            return -1;
        }

        // Sort first by absolute timing
        if (a.callAt < b.callAt) {
            return -1;
        }
        if (a.callAt > b.callAt) {
            return 1;
        }

        // Sort next by immediate, immediate timers take precedence
        if (a.immediate && !b.immediate) {
            return -1;
        }
        if (!a.immediate && b.immediate) {
            return 1;
        }

        if (a.order < b.order) {
            return -1;
        }
        if (a.order > b.order) {
            return 1;
        }

        // Sort next by creation time, earlier-created timers take precedence
        if (a.createdAt < b.createdAt) {
            return -1;
        }
        if (a.createdAt > b.createdAt) {
            return 1;
        }

        // Sort next by id, lower-id timers take precedence
        if (a.id < b.id) {
            return -1;
        }
        if (a.id > b.id) {
            return 1;
        }

        // As timer ids are unique, no fallback `0` is necessary
        return 0;
    }

    /**
     * @param {Clock} clock
     * @param {number} from
     * @param {number} to
     * @returns {Timer}
     */
    function firstTimerInRange(clock, from, to) {
        if (!clock.timerHeap) {
            return null;
        }

        const timers = clock.timerHeap.timers;
        if (timers.length === 1 && timers[0].requestIdleCallback) {
            return timers[0];
        }

        const first = clock.timerHeap.peek();
        if (first && inRange(from, to, first)) {
            return first;
        }

        /**
         * @type {?Timer}
         */
        let timer = null;

        for (let i = 0; i < timers.length; i++) {
            if (
                inRange(from, to, timers[i]) &&
                (!timer || compareTimers(timer, timers[i]) === 1)
            ) {
                timer = timers[i];
            }
        }

        return timer;
    }

    /**
     * @param {Clock} clock
     * @returns {Timer}
     */
    function firstTimer(clock) {
        if (!clock.timerHeap) {
            return null;
        }
        return clock.timerHeap.peek() || null;
    }

    /**
     * @param {Clock} clock
     * @returns {Timer}
     */
    function lastTimer(clock) {
        if (!clock.timerHeap) {
            return null;
        }
        const timers = clock.timerHeap.timers;
        let timer = null;

        for (let i = 0; i < timers.length; i++) {
            if (!timer || compareTimers(timer, timers[i]) === -1) {
                timer = timers[i];
            }
        }

        return timer;
    }

    /**
     * @param {Clock} clock
     * @param {Timer} timer
     */
    function callTimer(clock, timer) {
        if (typeof timer.interval === "number") {
            clock.timerHeap.remove(timer);
            timer.callAt += timer.interval;
            timer.order = uniqueTimerOrder++;
            clock.timerHeap.push(timer);
        } else {
            delete clock.timers[timer.id];
            clock.timerHeap.remove(timer);
        }

        if (typeof timer.func === "function") {
            timer.func.apply(null, timer.args);
        }
    }

    /**
     * Gets clear handler name for a given timer type
     * @param {string} ttype
     * @returns {string}
     */
    function getClearHandler(ttype) {
        if (ttype === "IdleCallback" || ttype === "AnimationFrame") {
            return `cancel${ttype}`;
        }
        return `clear${ttype}`;
    }

    /**
     * Gets schedule handler name for a given timer type
     * @param {string} ttype
     * @returns {string}
     */
    function getScheduleHandler(ttype) {
        if (ttype === "IdleCallback" || ttype === "AnimationFrame") {
            return `request${ttype}`;
        }
        return `set${ttype}`;
    }

    /**
     * Creates an anonymous function to warn only once
     * @returns {(msg: string) => void}
     */
    function createWarnOnce() {
        let calls = 0;
        return function (msg) {
            // eslint-disable-next-line
            !calls++ && console.warn(msg);
        };
    }
    const warnOnce = createWarnOnce();

    /**
     * @param {Clock} clock
     * @param {number} timerId
     * @param {string} ttype
     * @returns {*}
     */
    function clearTimer(clock, timerId, ttype) {
        if (!timerId) {
            // null appears to be allowed in most browsers, and appears to be
            // relied upon by some libraries, like Bootstrap carousel
            return;
        }

        ensureTimerState(clock);

        // in Node, the ID is stored as the primitive value for `Timeout` objects
        // for `Immediate` objects, no ID exists, so it gets coerced to NaN
        const id = Number(timerId);

        if (Number.isNaN(id) || id < idCounterStart) {
            const handlerName = getClearHandler(ttype);

            if (clock.shouldClearNativeTimers === true) {
                const nativeHandler = clock[`_${handlerName}`];
                return typeof nativeHandler === "function"
                    ? nativeHandler(timerId)
                    : undefined;
            }

            // Include the stacktrace, excluding the 'error' line
            const stackTrace = new Error().stack
                .split("\n")
                .slice(1)
                .join("\n");

            warnOnce(
                `FakeTimers: ${handlerName} was invoked to clear a native timer instead of one created by this library.` +
                    "\nTo automatically clean-up native timers, use `shouldClearNativeTimers`." +
                    `\n${stackTrace}`,
            );
        }

        if (Object.prototype.hasOwnProperty.call(clock.timers, id)) {
            // check that the ID matches a timer of the correct type
            const timer = clock.timers[id];
            if (
                timer.type === ttype ||
                (timer.type === "Timeout" && ttype === "Interval") ||
                (timer.type === "Interval" && ttype === "Timeout")
            ) {
                delete clock.timers[id];
                clock.timerHeap.remove(timer);
            } else {
                const clear = getClearHandler(ttype);
                const schedule = getScheduleHandler(timer.type);
                throw new Error(
                    `Cannot clear timer: timer created with ${schedule}() but cleared with ${clear}()`,
                );
            }
        }
    }

    /**
     * @param {Clock} clock
     * @returns {Timer[]}
     */
    function uninstall(clock) {
        let method, i, l;
        const installedHrTime = "_hrtime";
        const installedNextTick = "_nextTick";

        for (i = 0, l = clock.methods.length; i < l; i++) {
            method = clock.methods[i];
            if (method === "hrtime" && _global.process) {
                _global.process.hrtime = clock[installedHrTime];
            } else if (method === "nextTick" && _global.process) {
                _global.process.nextTick = clock[installedNextTick];
            } else if (method === "performance") {
                const originalPerfDescriptor = Object.getOwnPropertyDescriptor(
                    clock,
                    `_${method}`,
                );
                if (
                    originalPerfDescriptor &&
                    originalPerfDescriptor.get &&
                    !originalPerfDescriptor.set
                ) {
                    Object.defineProperty(
                        _global,
                        method,
                        originalPerfDescriptor,
                    );
                } else if (originalPerfDescriptor.configurable) {
                    _global[method] = clock[`_${method}`];
                }
            } else {
                if (clock[method] && clock[method].hasOwnProperty) {
                    _global[method] = clock[`_${method}`];
                } else {
                    try {
                        delete _global[method];
                    } catch (ignore) {
                        /* eslint no-empty: "off" */
                    }
                }
            }
            if (clock.timersModuleMethods !== undefined) {
                for (let j = 0; j < clock.timersModuleMethods.length; j++) {
                    const entry = clock.timersModuleMethods[j];
                    timersModule[entry.methodName] = entry.original;
                }
            }
            if (clock.timersPromisesModuleMethods !== undefined) {
                for (
                    let j = 0;
                    j < clock.timersPromisesModuleMethods.length;
                    j++
                ) {
                    const entry = clock.timersPromisesModuleMethods[j];
                    timersPromisesModule[entry.methodName] = entry.original;
                }
            }
        }

        clock.setTickMode("manual");

        // Prevent multiple executions which will completely remove these props
        clock.methods = [];

        for (const [listener, signal] of clock.abortListenerMap.entries()) {
            signal.removeEventListener("abort", listener);
            clock.abortListenerMap.delete(listener);
        }

        // return pending timers, to enable checking what timers remained on uninstall
        if (!clock.timerHeap) {
            return [];
        }
        return clock.timerHeap.timers.slice();
    }

    /**
     * @param {object} target the target containing the method to replace
     * @param {string} method the keyname of the method on the target
     * @param {Clock} clock
     */
    function hijackMethod(target, method, clock) {
        clock[method].hasOwnProperty = Object.prototype.hasOwnProperty.call(
            target,
            method,
        );
        clock[`_${method}`] = target[method];

        if (method === "Date") {
            target[method] = clock[method];
        } else if (method === "Intl") {
            target[method] = clock[method];
        } else if (method === "performance") {
            const originalPerfDescriptor = Object.getOwnPropertyDescriptor(
                target,
                method,
            );
            // JSDOM has a read only performance field so we have to save/copy it differently
            if (
                originalPerfDescriptor &&
                originalPerfDescriptor.get &&
                !originalPerfDescriptor.set
            ) {
                Object.defineProperty(
                    clock,
                    `_${method}`,
                    originalPerfDescriptor,
                );

                const perfDescriptor = Object.getOwnPropertyDescriptor(
                    clock,
                    method,
                );
                Object.defineProperty(target, method, perfDescriptor);
            } else {
                target[method] = clock[method];
            }
        } else {
            target[method] = function () {
                return clock[method].apply(clock, arguments);
            };

            Object.defineProperties(
                target[method],
                Object.getOwnPropertyDescriptors(clock[method]),
            );
        }

        target[method].clock = clock;
    }

    /**
     * @param {Clock} clock
     * @param {number} advanceTimeDelta
     */
    function doIntervalTick(clock, advanceTimeDelta) {
        clock.tick(advanceTimeDelta);
    }

    /**
     * @typedef {object} Timers
     * @property {setTimeout} setTimeout - native `setTimeout`
     * @property {clearTimeout} clearTimeout - native `clearTimeout`
     * @property {setInterval} setInterval - native `setInterval`
     * @property {clearInterval} clearInterval - native `clearInterval`
     * @property {Date} Date - native `Date`
     * @property {Intl} Intl - native `Intl`
     * @property {SetImmediate=} setImmediate - native `setImmediate`, if available
     * @property {function(NodeImmediate): void=} clearImmediate - native `clearImmediate`, if available
     * @property {function(number[]):number[]=} hrtime - native `process.hrtime`, if available
     * @property {NextTick=} nextTick - native `process.nextTick`, if available
     * @property {Performance=} performance - native `performance`, if available
     * @property {RequestAnimationFrame=} requestAnimationFrame - native `requestAnimationFrame`, if available
     * @property {boolean=} queueMicrotask - whether `queueMicrotask` exists
     * @property {function(number): void=} cancelAnimationFrame - native `cancelAnimationFrame`, if available
     * @property {RequestIdleCallback=} requestIdleCallback - native `requestIdleCallback`, if available
     * @property {function(number): void=} cancelIdleCallback - native `cancelIdleCallback`, if available
     */

    /** @type {Timers} */
    const timers = {
        setTimeout: _global.setTimeout,
        clearTimeout: _global.clearTimeout,
        setInterval: _global.setInterval,
        clearInterval: _global.clearInterval,
        Date: _global.Date,
    };

    if (isPresent.setImmediate) {
        timers.setImmediate = _global.setImmediate;
    }

    if (isPresent.clearImmediate) {
        timers.clearImmediate = _global.clearImmediate;
    }

    if (isPresent.hrtime) {
        timers.hrtime = _global.process.hrtime;
    }

    if (isPresent.nextTick) {
        timers.nextTick = _global.process.nextTick;
    }

    if (isPresent.performance) {
        timers.performance = _global.performance;
    }

    if (isPresent.requestAnimationFrame) {
        timers.requestAnimationFrame = _global.requestAnimationFrame;
    }

    if (isPresent.queueMicrotask) {
        timers.queueMicrotask = _global.queueMicrotask;
    }

    if (isPresent.cancelAnimationFrame) {
        timers.cancelAnimationFrame = _global.cancelAnimationFrame;
    }

    if (isPresent.requestIdleCallback) {
        timers.requestIdleCallback = _global.requestIdleCallback;
    }

    if (isPresent.cancelIdleCallback) {
        timers.cancelIdleCallback = _global.cancelIdleCallback;
    }

    if (isPresent.Intl) {
        timers.Intl = NativeIntl;
    }

    const originalSetTimeout = _global.setImmediate || _global.setTimeout;
    const originalClearInterval = _global.clearInterval;
    const originalSetInterval = _global.setInterval;

    /**
     * @param {Date|number} [start] the system time - non-integer values are floored
     * @param {number} [loopLimit] maximum number of timers that will be run when calling runAll()
     * @returns {Clock}
     */
    function createClock(start, loopLimit) {
        // eslint-disable-next-line no-param-reassign
        start = Math.floor(getEpoch(start));
        // eslint-disable-next-line no-param-reassign
        loopLimit = loopLimit || 1000;
        let nanos = 0;
        const adjustedSystemTime = [0, 0]; // [millis, nanoremainder]

        const clock = {
            now: start,
            Date: createDate(),
            loopLimit: loopLimit,
            tickMode: { mode: "manual", counter: 0, delta: undefined },
        };

        clock.Date.clock = clock;

        //eslint-disable-next-line jsdoc/require-jsdoc
        function getTimeToNextFrame() {
            return 16 - ((clock.now - start) % 16);
        }

        //eslint-disable-next-line jsdoc/require-jsdoc
        function hrtime(prev) {
            const millisSinceStart = clock.now - adjustedSystemTime[0] - start;
            const secsSinceStart = Math.floor(millisSinceStart / 1000);
            const remainderInNanos =
                (millisSinceStart - secsSinceStart * 1e3) * 1e6 +
                nanos -
                adjustedSystemTime[1];

            if (Array.isArray(prev)) {
                if (prev[1] > 1e9) {
                    throw new TypeError(
                        "Number of nanoseconds can't exceed a billion",
                    );
                }

                const oldSecs = prev[0];
                let nanoDiff = remainderInNanos - prev[1];
                let secDiff = secsSinceStart - oldSecs;

                if (nanoDiff < 0) {
                    nanoDiff += 1e9;
                    secDiff -= 1;
                }

                return [secDiff, nanoDiff];
            }
            return [secsSinceStart, remainderInNanos];
        }

        /**
         * A high resolution timestamp in milliseconds.
         * @typedef {number} DOMHighResTimeStamp
         */

        /**
         * performance.now()
         * @returns {DOMHighResTimeStamp}
         */
        function fakePerformanceNow() {
            const hrt = hrtime();
            const millis = hrt[0] * 1000 + hrt[1] / 1e6;
            return millis;
        }

        if (isPresent.hrtimeBigint) {
            hrtime.bigint = function () {
                const parts = hrtime();
                return BigInt(parts[0]) * BigInt(1e9) + BigInt(parts[1]); // eslint-disable-line
            };
        }

        if (isPresent.Intl) {
            clock.Intl = createIntl();
            clock.Intl.clock = clock;
        }

        /**
         * @param {TimerTickMode} tickModeConfig - The new configuration for how the clock should tick.
         */
        clock.setTickMode = function (tickModeConfig) {
            const { mode: newMode, delta: newDelta } = tickModeConfig;
            const { mode: oldMode, delta: oldDelta } = clock.tickMode;
            if (newMode === oldMode && newDelta === oldDelta) {
                return;
            }

            if (oldMode === "interval") {
                originalClearInterval(clock.attachedInterval);
            }

            clock.tickMode = {
                counter: clock.tickMode.counter + 1,
                mode: newMode,
                delta: newDelta,
            };

            if (newMode === "nextAsync") {
                advanceUntilModeChanges();
            } else if (newMode === "interval") {
                createIntervalTick(clock, newDelta || 20);
            }
        };

        /**
         * Keeps advancing the native event loop until the tick mode changes.
         * @returns {Promise<void>}
         */
        async function advanceUntilModeChanges() {
            /**
             * Waits for one native macrotask and then one microtask turn.
             * @returns {Promise<void>}
             */
            async function newMacrotask() {
                // MessageChannel ensures that setTimeout is not throttled to 4ms.
                // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#reasons_for_delays_longer_than_specified
                // https://stackblitz.com/edit/stackblitz-starters-qtlpcc
                const channel = new MessageChannel();
                await new Promise((resolve) => {
                    channel.port1.onmessage = () => {
                        resolve();
                        channel.port1.close();
                    };
                    channel.port2.postMessage(undefined);
                });
                channel.port1.close();
                channel.port2.close();
                // setTimeout ensures microtask queue is emptied
                await new Promise((resolve) => {
                    originalSetTimeout(resolve);
                });
            }

            const { counter } = clock.tickMode;
            while (clock.tickMode.counter === counter) {
                await newMacrotask();
                if (clock.tickMode.counter !== counter) {
                    return;
                }
                clock.next();
            }
        }

        /**
         * Temporarily pauses nextAsync auto-ticking while an async operation runs.
         * @param {Promise<*>} promise
         * @returns {Promise<*>}
         */
        function pauseAutoTickUntilFinished(promise) {
            if (clock.tickMode.mode !== "nextAsync") {
                return promise;
            }
            clock.setTickMode({ mode: "manual" });
            return promise.finally(() => {
                clock.setTickMode({ mode: "nextAsync" });
            });
        }

        /**
         * Returns the remaining time in the current idle window.
         * @returns {number}
         */
        function getTimeToNextIdlePeriod() {
            let timeToNextIdlePeriod = 0;

            if (clock.countTimers() > 0) {
                timeToNextIdlePeriod = 50; // const for now
            }

            return timeToNextIdlePeriod;
        }

        clock.requestIdleCallback = function requestIdleCallback(
            func,
            { timeout } = {},
        ) {
            /**
             * @type {IdleDeadline}
             */
            const idleDeadline = {
                didTimeout: true,
                timeRemaining: getTimeToNextIdlePeriod,
            };

            const result = addTimer(clock, {
                func: func,
                args: [idleDeadline],
                delay: timeout,
                requestIdleCallback: true,
            });

            return Number(result);
        };

        clock.cancelIdleCallback = function cancelIdleCallback(timerId) {
            return clearTimer(clock, timerId, "IdleCallback");
        };

        clock.setTimeout = function setTimeout(func, timeout) {
            return addTimer(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 2),
                delay: timeout,
            });
        };
        if (typeof _global.Promise !== "undefined" && utilPromisify) {
            clock.setTimeout[utilPromisify.custom] =
                function promisifiedSetTimeout(timeout, arg) {
                    return new _global.Promise(function setTimeoutExecutor(
                        resolve,
                    ) {
                        addTimer(clock, {
                            func: resolve,
                            args: [arg],
                            delay: timeout,
                        });
                    });
                };
        }

        clock.clearTimeout = function clearTimeout(timerId) {
            return clearTimer(clock, timerId, "Timeout");
        };

        clock.nextTick = function nextTick(func) {
            return enqueueJob(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 1),
                error: isNearInfiniteLimit ? new Error() : null,
            });
        };

        clock.queueMicrotask = function queueMicrotask(func) {
            return clock.nextTick(func); // explicitly drop additional arguments
        };

        clock.setInterval = function setInterval(func, timeout) {
            // eslint-disable-next-line no-param-reassign
            timeout = parseInt(timeout, 10);
            return addTimer(clock, {
                func: func,
                args: Array.prototype.slice.call(arguments, 2),
                delay: timeout,
                interval: timeout,
            });
        };

        clock.clearInterval = function clearInterval(timerId) {
            return clearTimer(clock, timerId, "Interval");
        };

        if (isPresent.setImmediate) {
            clock.setImmediate = function setImmediate(func) {
                return addTimer(clock, {
                    func: func,
                    args: Array.prototype.slice.call(arguments, 1),
                    immediate: true,
                });
            };

            if (typeof _global.Promise !== "undefined" && utilPromisify) {
                clock.setImmediate[utilPromisify.custom] =
                    function promisifiedSetImmediate(arg) {
                        return new _global.Promise(
                            function setImmediateExecutor(resolve) {
                                addTimer(clock, {
                                    func: resolve,
                                    args: [arg],
                                    immediate: true,
                                });
                            },
                        );
                    };
            }

            clock.clearImmediate = function clearImmediate(timerId) {
                return clearTimer(clock, timerId, "Immediate");
            };
        }

        clock.countTimers = function countTimers() {
            return (
                (clock.timerHeap ? clock.timerHeap.timers.length : 0) +
                (clock.jobs || []).length
            );
        };

        clock.requestAnimationFrame = function requestAnimationFrame(func) {
            const result = addTimer(clock, {
                func: func,
                delay: getTimeToNextFrame(),
                get args() {
                    return [fakePerformanceNow()];
                },
                animation: true,
            });

            return Number(result);
        };

        clock.cancelAnimationFrame = function cancelAnimationFrame(timerId) {
            return clearTimer(clock, timerId, "AnimationFrame");
        };

        clock.runMicrotasks = function runMicrotasks() {
            runJobs(clock);
        };

        /**
         * @param {number|string} tickValue milliseconds or a string parseable by parseTime
         * @param {boolean} isAsync
         * @param {Function} resolve
         * @param {Function} reject
         * @returns {number|undefined} will return the new `now` value or nothing for async
         */
        function doTick(tickValue, isAsync, resolve, reject) {
            const msFloat =
                typeof tickValue === "number"
                    ? tickValue
                    : parseTime(tickValue);
            const ms = Math.floor(msFloat);
            const remainder = nanoRemainder(msFloat);
            let nanosTotal = nanos + remainder;
            let tickTo = clock.now + ms;

            if (msFloat < 0) {
                throw new TypeError("Negative ticks are not supported");
            }

            // adjust for positive overflow
            if (nanosTotal >= 1e6) {
                tickTo += 1;
                nanosTotal -= 1e6;
            }

            nanos = nanosTotal;
            let tickFrom = clock.now;
            let previous = clock.now;
            // ESLint fails to detect this correctly
            /* eslint-disable prefer-const */
            let timer,
                firstException,
                oldNow,
                nextPromiseTick,
                compensationCheck,
                postTimerCall;
            /* eslint-enable prefer-const */

            clock.duringTick = true;

            // perform microtasks
            oldNow = clock.now;
            runJobs(clock);
            if (oldNow !== clock.now) {
                // compensate for any setSystemTime() call during microtask callback
                tickFrom += clock.now - oldNow;
                tickTo += clock.now - oldNow;
            }

            //eslint-disable-next-line jsdoc/require-jsdoc
            function doTickInner() {
                // perform each timer in the requested range
                timer = firstTimerInRange(clock, tickFrom, tickTo);
                // eslint-disable-next-line no-unmodified-loop-condition
                while (timer && tickFrom <= tickTo) {
                    if (clock.timers[timer.id]) {
                        tickFrom = timer.callAt;
                        clock.now = timer.callAt;
                        oldNow = clock.now;
                        try {
                            runJobs(clock);
                            callTimer(clock, timer);
                        } catch (e) {
                            firstException = firstException || e;
                        }

                        if (isAsync) {
                            // finish up after native setImmediate callback to allow
                            // all native es6 promises to process their callbacks after
                            // each timer fires.
                            originalSetTimeout(nextPromiseTick);
                            return;
                        }

                        compensationCheck();
                    }

                    postTimerCall();
                }

                // perform process.nextTick()s again
                oldNow = clock.now;
                runJobs(clock);
                if (oldNow !== clock.now) {
                    // compensate for any setSystemTime() call during process.nextTick() callback
                    tickFrom += clock.now - oldNow;
                    tickTo += clock.now - oldNow;
                }
                clock.duringTick = false;

                // corner case: during runJobs new timers were scheduled which could be in the range [clock.now, tickTo]
                timer = firstTimerInRange(clock, tickFrom, tickTo);
                if (timer) {
                    try {
                        clock.tick(tickTo - clock.now); // do it all again - for the remainder of the requested range
                    } catch (e) {
                        firstException = firstException || e;
                    }
                } else {
                    // no timers remaining in the requested range: move the clock all the way to the end
                    clock.now = tickTo;

                    // update nanos
                    nanos = nanosTotal;
                }
                if (firstException) {
                    throw firstException;
                }

                if (isAsync) {
                    resolve(clock.now);
                } else {
                    return clock.now;
                }
            }

            nextPromiseTick =
                isAsync &&
                function () {
                    try {
                        compensationCheck();
                        postTimerCall();
                        doTickInner();
                    } catch (e) {
                        reject(e);
                    }
                };

            compensationCheck = function () {
                // compensate for any setSystemTime() call during timer callback
                if (oldNow !== clock.now) {
                    tickFrom += clock.now - oldNow;
                    tickTo += clock.now - oldNow;
                    previous += clock.now - oldNow;
                }
            };

            postTimerCall = function () {
                timer = firstTimerInRange(clock, previous, tickTo);
                previous = tickFrom;
            };

            return doTickInner();
        }

        /**
         * @param {string|number} tickValue number of milliseconds or a human-readable value like "01:11:15"
         * @returns {number} will return the new `now` value
         */
        clock.tick = function tick(tickValue) {
            return doTick(tickValue, false);
        };

        if (typeof _global.Promise !== "undefined") {
            /**
             * @param {string|number} tickValue number of milliseconds or a human-readable value like "01:11:15"
             * @returns {Promise}
             */
            clock.tickAsync = function tickAsync(tickValue) {
                return pauseAutoTickUntilFinished(
                    new _global.Promise(function (resolve, reject) {
                        originalSetTimeout(function () {
                            try {
                                doTick(tickValue, true, resolve, reject);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }),
                );
            };
        }

        clock.next = function next() {
            runJobs(clock);
            const timer = firstTimer(clock);
            if (!timer) {
                return clock.now;
            }

            clock.duringTick = true;
            try {
                clock.now = timer.callAt;
                callTimer(clock, timer);
                runJobs(clock);
                return clock.now;
            } finally {
                clock.duringTick = false;
            }
        };

        if (typeof _global.Promise !== "undefined") {
            clock.nextAsync = function nextAsync() {
                return pauseAutoTickUntilFinished(
                    new _global.Promise(function (resolve, reject) {
                        originalSetTimeout(function () {
                            try {
                                const timer = firstTimer(clock);
                                if (!timer) {
                                    resolve(clock.now);
                                    return;
                                }

                                let err;
                                clock.duringTick = true;
                                clock.now = timer.callAt;
                                try {
                                    callTimer(clock, timer);
                                } catch (e) {
                                    err = e;
                                }
                                clock.duringTick = false;

                                originalSetTimeout(function () {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(clock.now);
                                    }
                                });
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }),
                );
            };
        }

        clock.runAll = function runAll() {
            let numTimers, i;
            runJobs(clock);
            for (i = 0; i < clock.loopLimit; i++) {
                if (!clock.timers) {
                    resetIsNearInfiniteLimit();
                    return clock.now;
                }

                numTimers = clock.timerHeap.timers.length;
                if (numTimers === 0) {
                    resetIsNearInfiniteLimit();
                    return clock.now;
                }

                clock.next();
                checkIsNearInfiniteLimit(clock, i);
            }

            const excessJob = firstTimer(clock);
            throw getInfiniteLoopError(clock, excessJob);
        };

        clock.runToFrame = function runToFrame() {
            return clock.tick(getTimeToNextFrame());
        };

        if (typeof _global.Promise !== "undefined") {
            clock.runAllAsync = function runAllAsync() {
                return pauseAutoTickUntilFinished(
                    new _global.Promise(function (resolve, reject) {
                        let i = 0;
                        /**
                         *
                         */
                        function doRun() {
                            originalSetTimeout(function () {
                                try {
                                    runJobs(clock);

                                    let numTimers;
                                    if (i < clock.loopLimit) {
                                        if (!clock.timerHeap) {
                                            resetIsNearInfiniteLimit();
                                            resolve(clock.now);
                                            return;
                                        }

                                        numTimers =
                                            clock.timerHeap.timers.length;
                                        if (numTimers === 0) {
                                            resetIsNearInfiniteLimit();
                                            resolve(clock.now);
                                            return;
                                        }

                                        clock.next();

                                        i++;

                                        doRun();
                                        checkIsNearInfiniteLimit(clock, i);
                                        return;
                                    }

                                    const excessJob = firstTimer(clock);
                                    reject(
                                        getInfiniteLoopError(clock, excessJob),
                                    );
                                } catch (e) {
                                    reject(e);
                                }
                            });
                        }
                        doRun();
                    }),
                );
            };
        }

        clock.runToLast = function runToLast() {
            const timer = lastTimer(clock);
            if (!timer) {
                runJobs(clock);
                return clock.now;
            }

            return clock.tick(timer.callAt - clock.now);
        };

        if (typeof _global.Promise !== "undefined") {
            clock.runToLastAsync = function runToLastAsync() {
                return pauseAutoTickUntilFinished(
                    new _global.Promise(function (resolve, reject) {
                        originalSetTimeout(function () {
                            try {
                                const timer = lastTimer(clock);
                                if (!timer) {
                                    runJobs(clock);
                                    resolve(clock.now);
                                }

                                resolve(
                                    clock.tickAsync(timer.callAt - clock.now),
                                );
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }),
                );
            };
        }

        clock.reset = function reset() {
            nanos = 0;
            clock.timers = {};
            clock.timerHeap = new TimerHeap();
            clock.jobs = [];
            clock.now = start;
        };

        clock.setSystemTime = function setSystemTime(systemTime) {
            // determine time difference
            const newNow = getEpoch(systemTime);
            const difference = newNow - clock.now;
            let id, timer;

            adjustedSystemTime[0] = adjustedSystemTime[0] + difference;
            adjustedSystemTime[1] = adjustedSystemTime[1] + nanos;
            // update 'system clock'
            clock.now = newNow;
            nanos = 0;

            // update timers and intervals to keep them stable
            for (id in clock.timers) {
                if (Object.prototype.hasOwnProperty.call(clock.timers, id)) {
                    timer = clock.timers[id];
                    timer.createdAt += difference;
                    timer.callAt += difference;
                }
            }
        };

        /**
         * @param {string|number} tickValue number of milliseconds or a human-readable value like "01:11:15"
         * @returns {number} the new `now` value
         */
        clock.jump = function jump(tickValue) {
            const msFloat =
                typeof tickValue === "number"
                    ? tickValue
                    : parseTime(tickValue);
            const ms = Math.floor(msFloat);

            if (clock.timers) {
                for (const timer of Object.values(clock.timers)) {
                    if (clock.now + ms > timer.callAt) {
                        timer.callAt = clock.now + ms;
                    }
                }
                // Rebuild heap as order might have changed
                clock.timerHeap = new TimerHeap();
                for (const timer of Object.values(clock.timers)) {
                    clock.timerHeap.push(timer);
                }
            }
            clock.tick(ms);
            return clock.now;
        };

        if (isPresent.performance) {
            clock.performance = Object.create(null);
            clock.performance.now = fakePerformanceNow;
        }

        if (isPresent.hrtime) {
            clock.hrtime = hrtime;
        }

        return clock;
    }

    /**
     * Starts the interval used to advance the clock automatically.
     * @param {Clock} clock
     * @param {number} delta
     */
    function createIntervalTick(clock, delta) {
        const intervalTick = doIntervalTick.bind(null, clock, delta);
        const intervalId = originalSetInterval(intervalTick, delta);
        clock.attachedInterval = intervalId;
    }

    /* eslint-disable complexity */

    /**
     * @param {Config=} [config] Optional config
     * @returns {Clock}
     */
    function install(config) {
        if (
            arguments.length > 1 ||
            config instanceof Date ||
            Array.isArray(config) ||
            typeof config === "number"
        ) {
            throw new TypeError(
                `FakeTimers.install called with ${String(
                    config,
                )} install requires an object parameter`,
            );
        }

        if (_global.Date.isFake === true) {
            // Timers are already faked; this is a problem.
            // Make the user reset timers before continuing.
            throw new TypeError(
                "Can't install fake timers twice on the same global object.",
            );
        }

        // eslint-disable-next-line no-param-reassign
        config = typeof config !== "undefined" ? config : {};
        config.shouldAdvanceTime = config.shouldAdvanceTime || false;
        config.advanceTimeDelta = config.advanceTimeDelta || 20;
        config.shouldClearNativeTimers =
            config.shouldClearNativeTimers || false;

        const hasToFake = Object.prototype.hasOwnProperty.call(
            config,
            "toFake",
        );
        const hasToNotFake = Object.prototype.hasOwnProperty.call(
            config,
            "toNotFake",
        );

        if (hasToFake && hasToNotFake) {
            throw new TypeError(
                "config.toFake and config.toNotFake cannot be used together",
            );
        }

        if (config.target) {
            throw new TypeError(
                "config.target is no longer supported. Use `withGlobal(target)` instead.",
            );
        }

        /**
         * Handles a missing timer or API name during installation.
         * @param {string} timer - the name of the missing timer or object
         */
        function handleMissingTimer(timer) {
            if (config.ignoreMissingTimers) {
                return;
            }

            throw new ReferenceError(
                `non-existent timers and/or objects cannot be faked: '${timer}'`,
            );
        }

        let i, l;
        const clock = createClock(config.now, config.loopLimit);
        clock.shouldClearNativeTimers = config.shouldClearNativeTimers;

        clock.uninstall = function () {
            return uninstall(clock);
        };

        clock.abortListenerMap = new Map();

        if (hasToFake) {
            clock.methods = config.toFake || [];
            if (clock.methods.length === 0) {
                clock.methods = Object.keys(timers);
            }
        } else if (hasToNotFake) {
            const methodsToNotFake = config.toNotFake || [];
            clock.methods = Object.keys(timers).filter(
                (method) => !methodsToNotFake.includes(method),
            );
        } else {
            clock.methods = Object.keys(timers);
        }

        if (config.shouldAdvanceTime === true) {
            clock.setTickMode({
                mode: "interval",
                delta: config.advanceTimeDelta,
            });
        }

        if (clock.methods.includes("performance")) {
            const proto = (() => {
                if (hasPerformanceConstructorPrototype) {
                    return _global.performance.constructor.prototype;
                }
                if (hasPerformancePrototype) {
                    return _global.Performance.prototype;
                }
            })();
            if (proto) {
                Object.getOwnPropertyNames(proto).forEach(function (name) {
                    if (name !== "now") {
                        clock.performance[name] =
                            name.indexOf("getEntries") === 0
                                ? NOOP_ARRAY
                                : NOOP;
                    }
                });
                // ensure `mark` returns a value that is valid
                clock.performance.mark = (name) =>
                    new FakePerformanceEntry(name, "mark", 0, 0);
                clock.performance.measure = (name) =>
                    new FakePerformanceEntry(name, "measure", 0, 100);
                // `timeOrigin` should return the time of when the Window session started
                // (or the Worker was installed)
                clock.performance.timeOrigin = getEpoch(config.now);
            } else if ((config.toFake || []).includes("performance")) {
                return handleMissingTimer("performance");
            }
        }
        if (_global === globalObject && timersModule) {
            clock.timersModuleMethods = [];
        }
        if (_global === globalObject && timersPromisesModule) {
            clock.timersPromisesModuleMethods = [];
        }
        for (i = 0, l = clock.methods.length; i < l; i++) {
            const nameOfMethodToReplace = clock.methods[i];

            if (!isPresent[nameOfMethodToReplace]) {
                handleMissingTimer(nameOfMethodToReplace);
                // eslint-disable-next-line
                continue;
            }

            if (nameOfMethodToReplace === "hrtime") {
                if (
                    _global.process &&
                    typeof _global.process.hrtime === "function"
                ) {
                    hijackMethod(_global.process, nameOfMethodToReplace, clock);
                }
            } else if (nameOfMethodToReplace === "nextTick") {
                if (
                    _global.process &&
                    typeof _global.process.nextTick === "function"
                ) {
                    hijackMethod(_global.process, nameOfMethodToReplace, clock);
                }
            } else {
                hijackMethod(_global, nameOfMethodToReplace, clock);
            }
            if (
                clock.timersModuleMethods !== undefined &&
                timersModule[nameOfMethodToReplace]
            ) {
                const original = timersModule[nameOfMethodToReplace];
                clock.timersModuleMethods.push({
                    methodName: nameOfMethodToReplace,
                    original: original,
                });
                timersModule[nameOfMethodToReplace] =
                    _global[nameOfMethodToReplace];
            }
            if (clock.timersPromisesModuleMethods !== undefined) {
                if (nameOfMethodToReplace === "setTimeout") {
                    clock.timersPromisesModuleMethods.push({
                        methodName: "setTimeout",
                        original: timersPromisesModule.setTimeout,
                    });

                    timersPromisesModule.setTimeout = (
                        delay,
                        value,
                        options = {},
                    ) =>
                        new Promise((resolve, reject) => {
                            const abort = () => {
                                options.signal.removeEventListener(
                                    "abort",
                                    abort,
                                );
                                clock.abortListenerMap.delete(abort);

                                // This is safe, there is no code path that leads to this function
                                // being invoked before handle has been assigned.
                                // eslint-disable-next-line no-use-before-define
                                clock.clearTimeout(handle);
                                reject(options.signal.reason);
                            };

                            const handle = clock.setTimeout(() => {
                                if (options.signal) {
                                    options.signal.removeEventListener(
                                        "abort",
                                        abort,
                                    );
                                    clock.abortListenerMap.delete(abort);
                                }

                                resolve(value);
                            }, delay);

                            if (options.signal) {
                                if (options.signal.aborted) {
                                    abort();
                                } else {
                                    options.signal.addEventListener(
                                        "abort",
                                        abort,
                                    );
                                    clock.abortListenerMap.set(
                                        abort,
                                        options.signal,
                                    );
                                }
                            }
                        });
                } else if (nameOfMethodToReplace === "setImmediate") {
                    clock.timersPromisesModuleMethods.push({
                        methodName: "setImmediate",
                        original: timersPromisesModule.setImmediate,
                    });

                    timersPromisesModule.setImmediate = (value, options = {}) =>
                        new Promise((resolve, reject) => {
                            const abort = () => {
                                options.signal.removeEventListener(
                                    "abort",
                                    abort,
                                );
                                clock.abortListenerMap.delete(abort);

                                // This is safe, there is no code path that leads to this function
                                // being invoked before handle has been assigned.
                                // eslint-disable-next-line no-use-before-define
                                clock.clearImmediate(handle);
                                reject(options.signal.reason);
                            };

                            const handle = clock.setImmediate(() => {
                                if (options.signal) {
                                    options.signal.removeEventListener(
                                        "abort",
                                        abort,
                                    );
                                    clock.abortListenerMap.delete(abort);
                                }

                                resolve(value);
                            });

                            if (options.signal) {
                                if (options.signal.aborted) {
                                    abort();
                                } else {
                                    options.signal.addEventListener(
                                        "abort",
                                        abort,
                                    );
                                    clock.abortListenerMap.set(
                                        abort,
                                        options.signal,
                                    );
                                }
                            }
                        });
                } else if (nameOfMethodToReplace === "setInterval") {
                    clock.timersPromisesModuleMethods.push({
                        methodName: "setInterval",
                        original: timersPromisesModule.setInterval,
                    });

                    timersPromisesModule.setInterval = (
                        delay,
                        value,
                        options = {},
                    ) => ({
                        [Symbol.asyncIterator]: () => {
                            const createResolvable = () => {
                                let resolve, reject;
                                const promise = new Promise((res, rej) => {
                                    resolve = res;
                                    reject = rej;
                                });
                                promise.resolve = resolve;
                                promise.reject = reject;
                                return promise;
                            };

                            let done = false;
                            let hasThrown = false;
                            let returnCall;
                            let nextAvailable = 0;
                            const nextQueue = [];

                            const handle = clock.setInterval(() => {
                                if (nextQueue.length > 0) {
                                    nextQueue.shift().resolve();
                                } else {
                                    nextAvailable++;
                                }
                            }, delay);

                            const abort = () => {
                                options.signal.removeEventListener(
                                    "abort",
                                    abort,
                                );
                                clock.abortListenerMap.delete(abort);

                                clock.clearInterval(handle);
                                done = true;
                                for (const resolvable of nextQueue) {
                                    resolvable.resolve();
                                }
                            };

                            if (options.signal) {
                                if (options.signal.aborted) {
                                    done = true;
                                } else {
                                    options.signal.addEventListener(
                                        "abort",
                                        abort,
                                    );
                                    clock.abortListenerMap.set(
                                        abort,
                                        options.signal,
                                    );
                                }
                            }

                            return {
                                next: async () => {
                                    if (options.signal?.aborted && !hasThrown) {
                                        hasThrown = true;
                                        throw options.signal.reason;
                                    }

                                    if (done) {
                                        return { done: true, value: undefined };
                                    }

                                    if (nextAvailable > 0) {
                                        nextAvailable--;
                                        return { done: false, value: value };
                                    }

                                    const resolvable = createResolvable();
                                    nextQueue.push(resolvable);

                                    await resolvable;

                                    if (returnCall && nextQueue.length === 0) {
                                        returnCall.resolve();
                                    }

                                    if (options.signal?.aborted && !hasThrown) {
                                        hasThrown = true;
                                        throw options.signal.reason;
                                    }

                                    if (done) {
                                        return { done: true, value: undefined };
                                    }

                                    return { done: false, value: value };
                                },
                                return: async () => {
                                    if (done) {
                                        return { done: true, value: undefined };
                                    }

                                    if (nextQueue.length > 0) {
                                        returnCall = createResolvable();
                                        await returnCall;
                                    }

                                    clock.clearInterval(handle);
                                    done = true;

                                    if (options.signal) {
                                        options.signal.removeEventListener(
                                            "abort",
                                            abort,
                                        );
                                        clock.abortListenerMap.delete(abort);
                                    }

                                    return { done: true, value: undefined };
                                },
                            };
                        },
                    });
                }
            }
        }

        return clock;
    }

    /* eslint-enable complexity */

    return {
        timers: timers,
        createClock: createClock,
        install: install,
        withGlobal: withGlobal,
    };
}

/**
 * @typedef {object} FakeTimers
 * @property {Timers} timers - the native timer APIs saved for later restoration
 * @property {createClock} createClock - creates a new fake clock
 * @property {Function} install - installs the fake timers onto the default global object
 * @property {withGlobal} withGlobal - creates a fake-timers instance for a provided global object
 */

/* eslint-enable complexity */

/** @type {FakeTimers} */
const defaultImplementation = withGlobal(globalObject);

exports.timers = defaultImplementation.timers;
exports.createClock = defaultImplementation.createClock;
exports.install = defaultImplementation.install;
exports.withGlobal = withGlobal;
