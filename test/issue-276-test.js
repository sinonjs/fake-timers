"use strict";

import { FakeTimers, assert } from "./helpers/setup-tests.js";

describe("#276 - remove config.target", function () {
    it("should throw on using `config.target`", function () {
        assert.exception(function () {
            FakeTimers.install({ target: {} });
        }, /config.target is no longer supported/);
    });
});
