"use strict";

const vm = require("vm");
const { FakeTimers, assert, refute } = require("./helpers/setup-tests");

describe("issue #561 - cross-realm Date passed to setSystemTime", function () {
    let clock;

    before(function () {
        if (typeof vm.runInNewContext !== "function") {
            this.skip();
        }
    });

    afterEach(function () {
        if (clock) {
            clock.uninstall();
            clock = undefined;
        }
    });

    it("accepts a Date from another realm", function () {
        clock = FakeTimers.install();
        const crossRealmDate = vm.runInNewContext(
            "new Date('2026-04-02T00:00:00.000Z')",
        );

        refute.exception(function () {
            clock.setSystemTime(crossRealmDate);
        });

        assert.same(clock.now, crossRealmDate.getTime());
        assert.same(new Date().getTime(), crossRealmDate.getTime());
    });
});
