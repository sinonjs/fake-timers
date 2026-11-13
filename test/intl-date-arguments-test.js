"use strict";

const { assert, FakeTimers } = require("./helpers/setup-tests");

["format", "formatToParts"].forEach(function (method) {
    describe(`Intl date arguments: ${method}`, function () {
        let clock;
        let nativeFormatter;
        let fakeFormatter;

        beforeEach(function () {
            const options = { timeZone: "UTC" };
            nativeFormatter = new Intl.DateTimeFormat("en-GB", options);
            clock = FakeTimers.createClock(Date.UTC(2024, 0, 2));
            fakeFormatter = new clock.Intl.DateTimeFormat("en-GB", options);
        });

        it("uses the current clock for omitted and undefined dates", function () {
            assert.equals(
                fakeFormatter[method](),
                nativeFormatter[method](clock.now),
            );
            assert.equals(
                fakeFormatter[method](undefined),
                nativeFormatter[method](clock.now),
            );

            clock.tick(86400000);

            assert.equals(
                fakeFormatter[method](),
                nativeFormatter[method](clock.now),
            );
            assert.equals(
                fakeFormatter[method](undefined),
                nativeFormatter[method](clock.now),
            );
        });

        it("preserves explicit falsy timestamps", function () {
            [0, -0, null, false, ""].forEach(function (value) {
                assert.equals(
                    fakeFormatter[method](value),
                    nativeFormatter[method](value),
                );
            });
        });

        it("preserves explicit positive and negative timestamps", function () {
            [86400000, -86400000].forEach(function (value) {
                assert.equals(
                    fakeFormatter[method](value),
                    nativeFormatter[method](value),
                );
            });
        });

        it("rejects invalid dates like the native formatter", function () {
            [NaN, new Date(NaN)].forEach(function (value) {
                assert.exception(
                    function () {
                        nativeFormatter[method](value);
                    },
                    { name: "RangeError" },
                );
                assert.exception(
                    function () {
                        fakeFormatter[method](value);
                    },
                    { name: "RangeError" },
                );
            });
        });

        it("rejects BigInt and Symbol dates like the native formatter", function () {
            [0n, Symbol("date")].forEach(function (value) {
                assert.exception(
                    function () {
                        nativeFormatter[method](value);
                    },
                    { name: "TypeError" },
                );
                assert.exception(
                    function () {
                        fakeFormatter[method](value);
                    },
                    { name: "TypeError" },
                );
            });
        });
    });
});
