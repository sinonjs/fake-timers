"use strict";

const { assert, FakeTimers } = require("../test/helpers/setup-tests");
const { performance } = require("perf_hooks");

describe("Node perf_hooks performance.now", function () {
    beforeEach(function () {
        this.originalDescriptor = Object.getOwnPropertyDescriptor(
            performance,
            "now",
        );
    });
    afterEach(function () {
        if (this.clock) {
            this.clock.uninstall();
        }
        if (this.originalDescriptor) {
            Object.defineProperty(performance, "now", this.originalDescriptor);
        } else {
            delete performance.now;
        }
    });

    it("advances with the fake clock for CommonJS and ESM consumers", async function () {
        const esm = await import("node:perf_hooks");
        this.clock = FakeTimers.install({ toFake: ["performance"] });

        assert.same(performance.now(), 0);
        assert.same(esm.performance.now(), 0);
        this.clock.tick(12.5);
        assert.same(performance.now(), 12.5);
        assert.same(esm.performance.now(), 12.5);
    });

    it("restores the original method and own property descriptor", function () {
        const original = performance.now;
        const descriptor = Object.getOwnPropertyDescriptor(performance, "now");
        this.clock = FakeTimers.install({ toFake: ["performance"] });
        assert.same(performance.now, this.clock.performance.now);

        this.clock.uninstall();
        this.clock.uninstall();
        assert.same(performance.now, original);
        assert.equals(
            [Object.getOwnPropertyDescriptor(performance, "now")],
            [descriptor],
        );
    });

    it("restores an existing own property descriptor", function () {
        const descriptor = {
            configurable: true,
            enumerable: true,
            writable: false,
            value: () => 42,
        };
        Object.defineProperty(performance, "now", descriptor);
        this.clock = FakeTimers.install({ toFake: ["performance"] });
        this.clock.tick(8);
        assert.same(performance.now(), 8);
        this.clock.uninstall();
        assert.equals(
            Object.getOwnPropertyDescriptor(performance, "now"),
            descriptor,
        );
    });

    it("leaves performance.now unchanged when performance is excluded", function () {
        const original = performance.now;
        this.clock = FakeTimers.install({ toNotFake: ["performance"] });
        assert.same(performance.now, original);
    });

    it("does not affect perf_hooks when installing on a custom global", function () {
        const original = performance.now;
        this.clock = FakeTimers.withGlobal({ Date, performance }).install({
            toFake: ["performance"],
        });
        assert.same(performance.now, original);
        this.clock.uninstall();
        assert.same(performance.now, original);
    });
});
