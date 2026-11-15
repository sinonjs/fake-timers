"use strict";

const {
    FakeTimers,
    assert,
    utilPromisifyAvailable,
    utilPromisify,
    setImmediatePresent,
} = require("./helpers/setup-tests");

describe("#347 - Support util.promisify once installed", function () {
    before(function () {
        if (!utilPromisifyAvailable) {
            this.skip();
        }
    });

    beforeEach(function () {
        this.clock = FakeTimers.install();
    });

    afterEach(function () {
        this.clock.uninstall();
    });

    it("setTimeout", function () {
        let resolved = false;
        utilPromisify(globalThis.setTimeout)(100).then(() => {
            resolved = true;
        });

        return this.clock.tickAsync(100).then(() => {
            assert.isTrue(resolved);
        });
    });

    it("setImmediate", function () {
        if (!setImmediatePresent) {
            this.skip();
        }

        let resolved = false;
        utilPromisify(globalThis.setImmediate)().then(() => {
            resolved = true;
        });

        return this.clock.tickAsync(0).then(() => {
            assert.isTrue(resolved);
        });
    });
});
