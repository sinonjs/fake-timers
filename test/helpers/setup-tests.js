"use strict";

/*
 * FIXME This is an interim hack to break a circular dependency between FakeTimers,
 * nise and sinon.
 *
 * 1. Load FakeTimers first, without defining global, verifying the ReferenceError is gone.
 */
const FakeTimers = require("../../src/fake-timers-src");

/*
 * 2. Define global, if missing.
 */
if (typeof global === "undefined") {
    window.global = window;
}

/*
 * 3. Load sinon with global defined.
 */
const assert = require("@sinonjs/referee-sinon").assert;
const refute = require("@sinonjs/referee-sinon").refute;
const sinon = require("@sinonjs/referee-sinon").sinon;

const globalObject = typeof global !== "undefined" ? global : window;
globalObject.FakeTimers = FakeTimers; // For testing eval

const GlobalDate = Date;

const NOOP = function NOOP() {
    return undefined;
};
const nextTickPresent =
    global.process && typeof global.process.nextTick === "function";
const queueMicrotaskPresent = typeof global.queueMicrotask === "function";
const hrtimePresent =
    global.process && typeof global.process.hrtime === "function";
const hrtimeBigintPresent =
    hrtimePresent && typeof global.process.hrtime.bigint === "function";
const performanceNowPresent =
    global.performance && typeof global.performance.now === "function";
const performanceMarkPresent =
    global.performance && typeof global.performance.mark === "function";
const setImmediatePresent =
    global.setImmediate && typeof global.setImmediate === "function";
const utilPromisify = global.process && require("util").promisify;
const promisePresent = typeof global.Promise !== "undefined";
const utilPromisifyAvailable = promisePresent && utilPromisify;
const timeoutResult = global.setTimeout(NOOP, 0);
const addTimerReturnsObject = typeof timeoutResult === "object";

let hasV8StyleStackFormat;
try {
    throw new Error();
} catch (error) {
    hasV8StyleStackFormat = error.stack.includes("\n    at");
}

module.exports = {
    FakeTimers,
    assert,
    refute,
    sinon,
    globalObject,
    GlobalDate,
    NOOP,
    nextTickPresent,
    queueMicrotaskPresent,
    hrtimePresent,
    hrtimeBigintPresent,
    performanceNowPresent,
    performanceMarkPresent,
    setImmediatePresent,
    utilPromisify,
    promisePresent,
    utilPromisifyAvailable,
    timeoutResult,
    addTimerReturnsObject,
    hasV8StyleStackFormat,
};
