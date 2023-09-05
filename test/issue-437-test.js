"use strict";

const { FakeTimers, assert } = require("./helpers/setup-tests");

describe("issue #437", function () {
    it("should save methods of children instance", function () {
        const clock = FakeTimers.install();

        class DateTime extends Date {
            constructor() {
                super();

                this.bar = "bar";
            }

            foo() {
                return "Lorem ipsum";
            }
        }

        const dateTime = new DateTime();

        // this would throw an error before issue #437 was fixed
        assert.equals(dateTime.foo(), "Lorem ipsum");
        assert.equals(dateTime.bar, "bar");

        clock.uninstall();
    });
});
