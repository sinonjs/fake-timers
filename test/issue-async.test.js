"use strict";

const FakeTimers = require("../src/fake-timers-src");
const sinon = require("sinon");
const assert = require("assert");

/**
 *
 * @param cb
 */
function myFn(cb) {
    queueMicrotask(() => cb());
}

describe("bug", function () {
    let clock;
    const timers = ["runAll", "runToLast", "runAllAsync", "runToLastAsync"];

    afterEach(function () {
        clock.uninstall();
    });

    beforeEach(function setup() {
        clock = FakeTimers.install({ toFake: ["queueMicrotask"] });
    });

    timers.forEach((fastForward) => {
        it(`should advance past queued microtasks using ${fastForward}`, async function () {
            const cb = sinon.fake();
            myFn(cb);
            myFn(cb);
            myFn(cb);
            await clock[fastForward]();
            assert.equal(cb.callCount, 3);
        });
    });
});

//it.each([
//() => jest.advanceTimersToNextTimer(),
//() => jest.advanceTimersByTime(1),
//() => jest.runAllTimers(),
//() => jest.runAllTicks(),
//() => jest.runOnlyPendingTimers(),
//])("should advance past queued microtasks using %s", (syncFastForward) => {
//jest.useFakeTimers();
//const cb = jest.fn();
//myFn(cb);
//syncFastForward();
//expect(cb).toHaveBeenCalled();
//});
