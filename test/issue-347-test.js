"use strict";

import {
    FakeTimers,
    assert,
    utilPromisifyAvailable,
    utilPromisify,
    setImmediatePresent,
} from "./helpers/setup-tests.js";

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
        utilPromisify(global.setTimeout)(100).then(function () {
            resolved = true;
        });

        return this.clock.tickAsync(100).then(function () {
            assert.isTrue(resolved);
        });
    });

    it("setImmediate", function () {
        if (!setImmediatePresent) {
            this.skip();
        }

        let resolved = false;
        utilPromisify(global.setImmediate)().then(function () {
            resolved = true;
        });

        return this.clock.tickAsync(0).then(function () {
            assert.isTrue(resolved);
        });
    });
});
