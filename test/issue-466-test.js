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

/**
 * Returns elements that are present in both lists.
 *
 * @function
 * @template E
 * @param {E[]} [list1]
 * @param {E[]} [list2]
 * @return {E[]}
 */
function getIntersection(list1, list2) {
    return list1.filter((value) => list2.indexOf(value) !== -1);
}

/**
 * Get property names and original values from timers module.
 *
 * @function
 * @param {string[]} [toFake]
 * @return {{propertyName: string, originalValue: any}[]}
 */
function getOriginals(toFake) {
    return toFake.map((propertyName) => ({
        propertyName,
        originalValue: timersModule[propertyName],
    }));
}

describe("issue #466", function () {
    afterEach(function () {
        if (this.clock) {
            this.clock.uninstall();
            delete this.clock;
        }
    });

    it("should install all timers on timers module", function () {
        const toFake = getIntersection(
            Object.getOwnPropertyNames(timersModule),
            Object.getOwnPropertyNames(FakeTimers.timers)
        );
        const originals = getOriginals(toFake);

        this.clock = FakeTimers.install();

        for (const { propertyName, originalValue } of originals) {
            refute.same(timersModule[propertyName], originalValue);
        }
    });

    it("should uninstall all timers on timers module", function () {
        const toFake = getIntersection(
            Object.getOwnPropertyNames(timersModule),
            Object.getOwnPropertyNames(FakeTimers.timers)
        );
        const originals = getOriginals(toFake);

        this.clock = FakeTimers.install();
        this.clock.uninstall();

        for (const { propertyName, originalValue } of originals) {
            assert.same(timersModule[propertyName], originalValue);
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

    it("fakes and resets provided methods on timers module", function () {
        const toFake = ["setTimeout", "Date"];
        const originals = getOriginals(toFake);
        this.clock = FakeTimers.install({ toFake });

        for (const { propertyName, originalValue } of originals) {
            if (originalValue === undefined) {
                assert.same(timersModule[propertyName], originalValue);
            } else {
                refute.same(timersModule[propertyName], originalValue);
            }
        }
    });

    it("resets faked methods on timers module", function () {
        const toFake = ["setTimeout", "Date"];
        const originals = getOriginals(toFake);

        this.clock = FakeTimers.install({ toFake });
        this.clock.uninstall();

        for (const { propertyName, originalValue } of originals) {
            assert.same(timersModule[propertyName], originalValue);
        }
    });

    it("does not fake methods not provided on timers module", function () {
        const toFake = ["setTimeout", "Date"];
        const notToFake = ["clearTimeout", "setInterval", "clearInterval"];
        const originals = getOriginals(notToFake);

        this.clock = FakeTimers.install({ toFake });

        for (const { propertyName, originalValue } of originals) {
            assert.same(timersModule[propertyName], originalValue);
        }
    });

    it("does not fake timers module on custom global object", function () {
        const original = timersModule.setTimeout;
        this.clock = FakeTimers.withGlobal({
            Date: Date,
            setTimeout: sinon.fake(),
            clearTimeout: sinon.fake(),
        }).install();
        assert.same(timersModule.setTimeout, original);
    });
});
