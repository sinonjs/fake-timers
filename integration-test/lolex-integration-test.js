"use strict";

var jsdom;

if (typeof require === "function" && typeof module === "object") {
    try {
        jsdom = require("jsdom");
    } catch (e) {
        // ignored
    }
}

if (!jsdom) {
    // eslint-disable-next-line no-console
    console.warn("JSDOM is not supported in the current environment.");

    return;
}

var assert = require("@sinonjs/referee-sinon").assert;
var lolex = require("../src/lolex-src");
var sinon = require("@sinonjs/referee-sinon").sinon;

describe("withGlobal", function () {
    var jsdomGlobal, withGlobal, timers;

    beforeEach(function () {
        var dom = new jsdom.JSDOM("", {runScripts: "dangerously" });
        jsdomGlobal = dom.window;

        withGlobal = lolex.withGlobal(jsdomGlobal);
        timers = Object.keys(withGlobal.timers);
    });

    it("matches the normal lolex API", function () {
        assert.equals(Object.keys(withGlobal), Object.keys(lolex));
    });

    it("should support basic setTimeout", function () {
        var clock = withGlobal.install({target: jsdomGlobal, toFake: timers});
        var stub = sinon.stub();

        jsdomGlobal.setTimeout(stub, 5);
        clock.tick(5);
        assert(stub.calledOnce);

        clock.uninstall();
    });

    it("Date is instanceof itself", function () {
        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        var clock = withGlobal.install({target: jsdomGlobal, toFake: timers});

        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        clock.uninstall();
    });
});
