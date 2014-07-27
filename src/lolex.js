/*jslint eqeqeq: false, plusplus: false, evil: true, onevar: false, browser: true, forin: false*/
/*global global*/
/**
 * @author Christian Johansen (christian@cjohansen.no) and contributors
 * @license BSD
 *
 * Copyright (c) 2010-2014 Christian Johansen
 */
"use strict";

var GLOBAL = typeof global != "undefined" && typeof global !== "function" ? global : this;

// node expects setTimeout/setInterval to return a fn object w/ .ref()/.unref()
// browsers, a number.
// see https://github.com/cjohansen/Sinon.JS/pull/436
var timeoutResult = setTimeout(function() {}, 0);
var addTimerReturnsObject = typeof timeoutResult === "object";
clearTimeout(timeoutResult);

var NativeDate = Date;
var id = 1;

/**
 * Parse strings like "01:10:00" (meaning 1 hour, 10 minutes, 0 seconds) into
 * number of milliseconds. This is used to support human-readable strings passed
 * to clock.tick()
 */
function parseTime(str) {
    if (!str) {
        return 0;
    }

    var strings = str.split(":");
    var l = strings.length, i = l;
    var ms = 0, parsed;

    if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
        throw new Error("tick only understands numbers and 'h:m:s'");
    }

    while (i--) {
        parsed = parseInt(strings[i], 10);

        if (parsed >= 60) {
            throw new Error("Invalid time " + str);
        }

        ms += parsed * Math.pow(60, (l - i - 1));
    }

    return ms * 1000;
}

/**
 * Used to grok the `now` parameter to createClock.
 */
function getEpoch(epoch) {
    if (!epoch) { return 0; }
    if (typeof epoch.getTime === "function") { return epoch.getTime(); }
    if (typeof epoch === "number") { return epoch; }
    throw new TypeError("now should be milliseconds since UNIX epoch");
}

function inRange(from, to, timer) {
    return timer && timer.callAt >= from && timer.callAt <= to;
}

function mirrorDateProperties(target, source) {
    if (source.now) {
        target.now = function now() {
            return target.clock.now;
        };
    } else {
        delete target.now;
    }

    if (source.toSource) {
        target.toSource = function toSource() {
            return source.toSource();
        };
    } else {
        delete target.toSource;
    }

    target.toString = function toString() {
        return source.toString();
    };

    target.prototype = source.prototype;
    target.parse = source.parse;
    target.UTC = source.UTC;
    target.prototype.toUTCString = source.prototype.toUTCString;

    for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
            target[prop] = source[prop];
        }
    }

    return target;
}

function createDate() {
    function ClockDate(year, month, date, hour, minute, second, ms) {
        // Defensive and verbose to avoid potential harm in passing
        // explicit undefined when user does not pass argument
        switch (arguments.length) {
        case 0:
            return new NativeDate(ClockDate.clock.now);
        case 1:
            return new NativeDate(year);
        case 2:
            return new NativeDate(year, month);
        case 3:
            return new NativeDate(year, month, date);
        case 4:
            return new NativeDate(year, month, date, hour);
        case 5:
            return new NativeDate(year, month, date, hour, minute);
        case 6:
            return new NativeDate(year, month, date, hour, minute, second);
        default:
            return new NativeDate(year, month, date, hour, minute, second, ms);
        }
    }

    return mirrorDateProperties(ClockDate, NativeDate);
}

function Clock(epoch) {
    this.now = getEpoch(epoch);
    this.timeouts = {};
    this.Date = createDate();
    this.Date.clock = this;
}

function addTimer(clock, args, opt) {
    if (args.length === 0) {
        throw new Error("Function requires at least 1 parameter");
    }

    if (typeof args[0] === "undefined") {
        throw new Error("Callback must be provided to timer calls");
    }

    var toId = id++;
    var delay = args[1] || 0;

    if (!clock.timeouts) {
        clock.timeouts = {};
    }

    clock.timeouts[toId] = {
        id: toId,
        func: args[0],
        callAt: clock.now + delay,
        invokeArgs: Array.prototype.slice.call(args, 2)
    };

    if (opt && opt.recurring) {
        clock.timeouts[toId].interval = delay;
    }

    if (addTimerReturnsObject) {
        return {
            id: toId,
            ref: function() {},
            unref: function() {}
        };
    }
    else {
        return toId;
    }
}

function firstTimerInRange(clock, from, to) {
    var timer, smallest = null, originalTimer;

    for (var id in clock.timeouts) {
        if (!inRange(from, to, clock.timeouts[id])) {
            continue;
        }

        if (smallest === null || clock.timeouts[id].callAt < smallest) {
            originalTimer = clock.timeouts[id];
            smallest = clock.timeouts[id].callAt;

            timer = {
                func: clock.timeouts[id].func,
                callAt: clock.timeouts[id].callAt,
                interval: clock.timeouts[id].interval,
                id: clock.timeouts[id].id,
                invokeArgs: clock.timeouts[id].invokeArgs
            };
        }
    }

    return timer || null;
}

function callTimer(clock, timer) {
    if (typeof timer.interval == "number") {
        clock.timeouts[timer.id].callAt += timer.interval;
    } else {
        delete clock.timeouts[timer.id];
    }

    try {
        if (typeof timer.func == "function") {
            timer.func.apply(null, timer.invokeArgs);
        } else {
            eval(timer.func);
        }
    } catch (e) {
        var exception = e;
    }

    if (!clock.timeouts[timer.id]) {
        if (exception) {
            throw exception;
        }
        return;
    }

    if (exception) {
        throw exception;
    }
}

Clock.prototype = {
    setTimeout: function setTimeout(callback, timeout) {
        return addTimer(this, arguments);
    },

    clearTimeout: function clearTimeout(timerId) {
        if (!timerId) {
            // null appears to be allowed in most browsers, and appears to be
            // relied upon by some libraries, like Bootstrap carousel
            return;
        }
        if (!this.timeouts) {
            this.timeouts = [];
        }
        // in Node, timerId is an object with .ref()/.unref(), and
        // its .id field is the actual timer id.
        if (typeof timerId === "object") {
            timerId = timerId.id
        }
        if (timerId in this.timeouts) {
            delete this.timeouts[timerId];
        }
    },

    setInterval: function setInterval(callback, timeout) {
        return addTimer(this, arguments, { recurring: true });
    },

    clearInterval: function clearInterval(timerId) {
        this.clearTimeout(timerId);
    },

    setImmediate: function setImmediate(callback) {
        var passThruArgs = Array.prototype.slice.call(arguments, 1);
        return addTimer(this, [callback, 0].concat(passThruArgs));
    },

    clearImmediate: function clearImmediate(timerId) {
        this.clearTimeout(timerId);
    },

    tick: function tick(ms) {
        ms = typeof ms == "number" ? ms : parseTime(ms);
        var tickFrom = this.now, tickTo = this.now + ms, previous = this.now;
        var timer = firstTimerInRange(this, tickFrom, tickTo);

        var firstException;
        while (timer && tickFrom <= tickTo) {
            if (this.timeouts[timer.id]) {
                tickFrom = this.now = timer.callAt;
                try {
                    callTimer(this, timer);
                } catch (e) {
                    firstException = firstException || e;
                }
            }

            timer = firstTimerInRange(this, previous, tickTo);
            previous = tickFrom;
        }

        this.now = tickTo;

        if (firstException) {
            throw firstException;
        }

        return this.now;
    },

    reset: function reset() {
        this.timeouts = {};
    }
};

function restore() {
    var method;

    for (var i = 0, l = this.methods.length; i < l; i++) {
        method = this.methods[i];

        if (global[method].hadOwnProperty) {
            global[method] = this["_" + method];
        } else {
            try {
                delete global[method];
            } catch (e) {}
        }
    }

    // Prevent multiple executions which will completely remove these props
    this.methods = [];
}

function stubGlobal(method, clock) {
    clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(global, method);
    clock["_" + method] = global[method];

    if (method == "Date") {
        var date = mirrorDateProperties(clock[method], global[method]);
        global[method] = date;
    } else {
        global[method] = function () {
            return clock[method].apply(clock, arguments);
        };

        for (var prop in clock[method]) {
            if (clock[method].hasOwnProperty(prop)) {
                global[method][prop] = clock[method][prop];
            }
        }
    }

    global[method].clock = clock;
}

var timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: (typeof setImmediate !== "undefined" ? setImmediate : undefined),
    clearImmediate: (typeof clearImmediate !== "undefined" ? clearImmediate: undefined),
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

var keys = Object.keys || function (obj) {
    var ks = [];
    for (var key in obj) {
        ks.push(key);
    }
    return ks;
};

module.exports.Clock = Clock;
module.exports.timers = timers;

module.exports.useFakeTimers = function useFakeTimers(now, toFake) {
    var clock = new Clock(now);
    clock.restore = restore;
    clock.methods = toFake || [];

    if (clock.methods.length === 0) {
        clock.methods = keys(timers);
    }

    for (var i = 0, l = clock.methods.length; i < l; i++) {
        stubGlobal(clock.methods[i], clock);
    }

    return clock;
};
