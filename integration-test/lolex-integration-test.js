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

describe("withGlobal", function() {
    var jsdomGlobal, withGlobal, timers;

    beforeEach(function() {
        var dom = new jsdom.JSDOM("", { runScripts: "dangerously" });
        jsdomGlobal = dom.window;

        withGlobal = lolex.withGlobal(jsdomGlobal);
        timers = Object.keys(withGlobal.timers);
    });

    it("matches the normal lolex API", function() {
        assert.equals(Object.keys(withGlobal), Object.keys(lolex));
    });

    it("should support basic setTimeout", function() {
        var clock = withGlobal.install({ target: jsdomGlobal, toFake: timers });
        var stub = sinon.stub();

        jsdomGlobal.setTimeout(stub, 5);
        clock.tick(5);
        assert(stub.calledOnce);

        clock.uninstall();
    });

    it("Date is instanceof itself", function() {
        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        var clock = withGlobal.install({ target: jsdomGlobal, toFake: timers });

        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        clock.uninstall();
    });
});

describe("globally configured browser objects", function() {
    var withGlobal, originalDescriptors;

    // We use a set up function instead of beforeEach to avoid Mocha's check leaks detector
    function setUpGlobal() {
        // Configuration taken from from here https://github.com/airbnb/enzyme/blob/master/docs/guides/jsdom.md
        var dom = new jsdom.JSDOM("<!doctype html><html><body></body></html>");
        var window = dom.window;

        function copyProps(src, target) {
            originalDescriptors = Object.getOwnPropertyDescriptors(target);
            Object.defineProperties(
                target,
                Object.getOwnPropertyDescriptors(src)
            );
            Object.defineProperties(target, originalDescriptors);
        }

        global.window = window;
        global.document = window.document;
        global.navigator = {
            userAgent: "node.js"
        };
        global.requestAnimationFrame = function(callback) {
            return setTimeout(callback, 0);
        };
        global.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
        copyProps(window, global);

        withGlobal = lolex.withGlobal(global);
    }

    function tearDownGlobal() {
        var originalDescriptorNames = Object.keys(originalDescriptors);
        var windowDescriptorNames = Object.getOwnPropertyNames(global.window);
        windowDescriptorNames.forEach(function(descriptorName) {
            if (!originalDescriptorNames.includes(descriptorName)) {
                delete global[descriptorName];
            }
        });

        delete global.window;
        delete global.document;
        delete global.navigator;
        delete global.requestAnimationFrame;
        delete global.cancelAnimationFrame;
    }

    it("correctly instantiates and tears down", function() {
        setUpGlobal();

        try {
            var mockNow = new Date("1990-1-1");
            var clock = withGlobal.install({
                now: mockNow
            });

            assert.equals(new Date(Date.now()), mockNow);
            assert.equals(new Date(), mockNow);

            clock.uninstall();

            assert(new Date().valueOf() !== mockNow.valueOf());
        } finally {
            tearDownGlobal();
        }
    });
});
