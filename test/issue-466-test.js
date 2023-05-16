"use strict";

const { FakeTimers, assert, refute } = require("./helpers/setup-tests");
const { sinon } = require("@sinonjs/referee-sinon");
var timersModule;

if (typeof require === "function" && typeof module === "object") {
    try {
        timersModule = require("timers");
    } catch (e) {
        // ignored
    }
}
if (!timersModule) {
    // eslint-disable-next-line no-console
    console.warn("timers module is not supported in the current environment.");
    return;
}

describe("issue #466", function () {
    afterEach(function () {
        if (this.clock) {
            this.clock.uninstall();
            delete this.clock;
        }
    });

    it("should install and uninstall all timers from on timers module", function () {
        const timersModulePropertyNames =
            Object.getOwnPropertyNames(timersModule);
        const fakeTimersPropertyNames = Object.getOwnPropertyNames(
            FakeTimers.timers
        );
        this.clock = FakeTimers.install();

        for (const fakeProperty of fakeTimersPropertyNames) {
            refute.same(
                timersModule[fakeProperty],
                FakeTimers.timers[fakeProperty]
            );
        }

        this.clock.uninstall();
        for (const fakeProperty of fakeTimersPropertyNames) {
            assert.same(
                timersModule[fakeProperty],
                timersModulePropertyNames.indexOf(fakeProperty) === -1
                    ? undefined
                    : FakeTimers.timers[fakeProperty]
            );
        }
    });

    it("should have synchronized clocks on global and timers module", function () {
        this.clock = FakeTimers.install();

        const globalStub = sinon.stub();
        const timersStub = sinon.stub();

        timersModule.setTimeout(timersStub, 5);
        setTimeout(globalStub, 5);
        this.clock.tick(5);
        assert(globalStub.calledOnce);
        assert(timersStub.calledOnce);
    });

    it("fakes provided methods on timers module", function () {
        this.clock = FakeTimers.install({
            now: 0,
            toFake: ["setTimeout", "Date"],
        });

        refute.same(timersModule.setTimeout, FakeTimers.timers.setTimeout);
        refute.same(timersModule.Date, FakeTimers.timers.Date);
    });

    it("resets faked methods on timers module", function () {
        this.clock = FakeTimers.install({
            now: 0,
            toFake: ["setTimeout", "Date"],
        });
        this.clock.uninstall();

        assert.same(timersModule.setTimeout, FakeTimers.timers.setTimeout);
        assert.same(timersModule.Date, undefined);
    });

    it("does not fake methods not provided on timers module", function () {
        this.clock = FakeTimers.install({
            now: 0,
            toFake: ["setTimeout", "Date"],
        });

        assert.same(timersModule.clearTimeout, FakeTimers.timers.clearTimeout);
        assert.same(timersModule.setInterval, FakeTimers.timers.setInterval);
        assert.same(
            timersModule.clearInterval,
            FakeTimers.timers.clearInterval
        );
    });

    it("does not fake timers module on custom global object", function () {
        this.clock = FakeTimers.withGlobal({}).install();
        assert.same(timersModule.setTimeout, FakeTimers.timers.setTimeout);
    });
});
