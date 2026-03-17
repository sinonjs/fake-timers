"use strict";

/*
 * FIXME This is an interim hack to break a circular dependency between FakeTimers,
 * nise and sinon.
 *
 * 1. Load FakeTimers first, without defining global, verifying the ReferenceError is gone.
 */
const FakeTimers = require("../../src/fake-timers-src");

/*
 * 2. Load sinon with global defined.
 */
const assert = require("@sinonjs/referee-sinon").assert;
const refute = require("@sinonjs/referee-sinon").refute;
const sinon = require("@sinonjs/referee-sinon").sinon;

globalThis.FakeTimers = FakeTimers; // For testing eval

const GlobalDate = Date;

const NOOP = function NOOP() {
    return undefined;
};
const nextTickPresent =
    globalThis.process && typeof globalThis.process.nextTick === "function";
const queueMicrotaskPresent = typeof globalThis.queueMicrotask === "function";
const hrtimePresent =
    globalThis.process && typeof globalThis.process.hrtime === "function";
const hrtimeBigintPresent =
    hrtimePresent && typeof globalThis.process.hrtime.bigint === "function";
const performanceNowPresent =
    globalThis.performance && typeof globalThis.performance.now === "function";
const performanceMarkPresent =
    globalThis.performance && typeof globalThis.performance.mark === "function";
const setImmediatePresent =
    globalThis.setImmediate && typeof globalThis.setImmediate === "function";
const utilPromisify = globalThis.process && require("util").promisify;
const promisePresent = typeof globalThis.Promise !== "undefined";
const utilPromisifyAvailable = promisePresent && utilPromisify;
const timeoutResult = globalThis.setTimeout(NOOP, 0);
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
