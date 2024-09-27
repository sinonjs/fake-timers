/*
 * FIXME This is an interim hack to break a circular dependency between FakeTimers,
 * nise and sinon.
 *
 * 1. Load FakeTimers first, without defining global, verifying the ReferenceError is gone.
 */
import * as FakeTimersModule from "../../src/fake-timers-src.js";

export const FakeTimers = FakeTimersModule;

/*
 * 2. Define global, if missing.
 */
if (typeof global === "undefined") {
    window.global = window;
}

/*
 * 3. Load sinon with global defined.
 */
export { assert } from "@sinonjs/referee-sinon";
export { refute } from "@sinonjs/referee-sinon";
export { sinon } from "@sinonjs/referee-sinon";

export const globalObject = typeof global !== "undefined" ? global : window;
globalObject.FakeTimers = FakeTimers; // For testing eval

export const GlobalDate = Date;

export const NOOP = function NOOP() {
    return undefined;
};
export const nextTickPresent =
    global.process && typeof global.process.nextTick === "function";
export const queueMicrotaskPresent =
    typeof global.queueMicrotask === "function";
export const hrtimePresent =
    global.process && typeof global.process.hrtime === "function";
export const hrtimeBigintPresent =
    hrtimePresent && typeof global.process.hrtime.bigint === "function";
export const performanceNowPresent =
    global.performance && typeof global.performance.now === "function";
export const performanceMarkPresent =
    global.performance && typeof global.performance.mark === "function";
export const setImmediatePresent =
    global.setImmediate && typeof global.setImmediate === "function";
export const utilPromisify = global.process && (await import("util")).promisify;
export const promisePresent = typeof global.Promise !== "undefined";
export const utilPromisifyAvailable = promisePresent && utilPromisify;
export const timeoutResult = global.setTimeout(NOOP, 0);
export const addTimerReturnsObject = typeof timeoutResult === "object";
