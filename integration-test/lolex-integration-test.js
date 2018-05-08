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

var referee = require("referee");
var lolex = require("../src/lolex-src");
var sinon = require("sinon");

var assert = referee.assert;

describe("withGlobal", function () {
    var jsdomGlobal, withGlobal;

    beforeEach(function () {
        var dom = new jsdom.JSDOM("", {runScripts: "dangerously" });
        jsdomGlobal = dom.window;

        withGlobal = lolex.withGlobal(jsdomGlobal);
    });

    it("matches the normal lolex API", function () {
        assert.equals(Object.keys(withGlobal), Object.keys(lolex));
    });

    it("should support basic setTimeout", function () {
        var clock = withGlobal.install({target: jsdomGlobal});
        var stub = sinon.stub();

        jsdomGlobal.setTimeout(stub, 5);
        clock.tick(5);
        assert(stub.calledOnce);

        clock.uninstall();
    });
});
