"use strict";

let jsdom;

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

const assert = require("@sinonjs/referee-sinon").assert;
const FakeTimers = require("../src/fake-timers-src");
const sinon = require("@sinonjs/referee-sinon").sinon;

describe("withGlobal", function () {
    let jsdomGlobal, withGlobal, timers;

    beforeEach(function () {
        const dom = new jsdom.JSDOM("", { runScripts: "dangerously" });
        jsdomGlobal = dom.window;

        withGlobal = FakeTimers.withGlobal(jsdomGlobal);
        timers = Object.keys(withGlobal.timers);
    });

    it("matches the normal FakeTimers API", function () {
        assert.equals(Object.keys(withGlobal), Object.keys(FakeTimers));
    });

    it("should support basic setTimeout", function () {
        const clock = withGlobal.install({ toFake: timers });
        const stub = sinon.stub();

        jsdomGlobal.setTimeout(stub, 5);
        clock.tick(5);
        assert(stub.calledOnce);

        clock.uninstall();
    });

    it("Date is instanceof itself", function () {
        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        const clock = withGlobal.install({ toFake: timers });

        assert(new jsdomGlobal.Date() instanceof jsdomGlobal.Date);

        clock.uninstall();
    });
});

describe("globally configured browser objects", function () {
    let withGlobal, originalDescriptors, originalNavigatorDescriptor;

    // We use a set up function instead of beforeEach to avoid Mocha's check leaks detector
    function setUpGlobal() {
        // Configuration taken from from here https://github.com/airbnb/enzyme/blob/master/docs/guides/jsdom.md
        const dom = new jsdom.JSDOM(
            "<!doctype html><html><body></body></html>",
        );
        const window = dom.window;

        originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
            globalThis,
            "navigator",
        );

        function makeMutable(descriptor) {
            descriptor.configurable = true;
        }

        function copyProps(src, target) {
            originalDescriptors = Object.getOwnPropertyDescriptors(target);
            const srcDescriptors = Object.getOwnPropertyDescriptors(src);
            Object.keys(srcDescriptors).forEach((key) =>
                // This is required to make it possible to remove/delete them afterwards
                makeMutable(srcDescriptors[key]),
            );
            Object.defineProperties(target, {
                ...srcDescriptors,
                ...originalDescriptors,
            });
        }

        globalThis.window = window;
        globalThis.document = window.document;
        // navigator is a getter, so we need to remove it, as assigning does not work
        delete globalThis.navigator;
        globalThis.navigator = window.navigator;
        globalThis.requestAnimationFrame = function (callback) {
            return setTimeout(callback, 0);
        };
        globalThis.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
        copyProps(window, globalThis);

        withGlobal = FakeTimers.withGlobal(globalThis);
    }

    function tearDownGlobal() {
        const originalDescriptorNames = Object.keys(originalDescriptors);
        const windowDescriptorNames = Object.getOwnPropertyNames(
            globalThis.window,
        );
        windowDescriptorNames.forEach(function (descriptorName) {
            if (!originalDescriptorNames.includes(descriptorName)) {
                delete globalThis[descriptorName];
            }
        });

        delete globalThis.window;
        delete globalThis.document;
        delete globalThis.navigator;
        delete globalThis.requestAnimationFrame;
        delete globalThis.cancelAnimationFrame;

        // restore
        if (originalNavigatorDescriptor) {
            Object.defineProperty(
                globalThis,
                "navigator",
                originalNavigatorDescriptor,
            );
        }
    }

    it("correctly instantiates and tears down", function () {
        setUpGlobal();

        try {
            const mockNow = new Date("1990-1-1");
            const clock = withGlobal.install({
                now: mockNow,
            });

            assert.equals(new Date(Date.now()).toString(), mockNow.toString());
            assert.equals(new Date().toString(), mockNow.toString());

            clock.uninstall();

            assert(new Date().valueOf() !== mockNow.valueOf());
        } finally {
            tearDownGlobal();
        }
    });
});
