"use strict";

const FakeTimers = require("../src/fake-timers-src");
const sinon = require("sinon");
const assert = require("assert");

function myFn(cb) {
    queueMicrotask(() => cb());
}

describe("async time skippers should run microtasks", function () {
    let clock;
    const timers = ["runAllAsync", "runToLastAsync"];

    afterEach(function () {
        clock.uninstall();
    });

    beforeEach(function setup() {
        clock = FakeTimers.install({ toFake: ["queueMicrotask"] });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
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
