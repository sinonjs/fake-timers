#!/usr/bin/env node
"use strict";

var fs = require("fs");
var browserify = require("browserify");
var timers = require("./src/fake-timers-src.js");

try {
    fs.mkdirSync("pkg");
} catch (ignore) {
    // We seem to have it already
}

function makeBundle(entryPoint, config, done) {
    browserify(entryPoint, config).bundle(function(err, buffer) {
        if (err) {
            throw err;
        }
        done(buffer.toString());
    });
}

makeBundle(
    "./src/fake-timers-src.js",
    {
        standalone: "FakeTimers",
        detectGlobals: false
    },
    function(bundle) {
        fs.writeFileSync("pkg/fake-timers.js", bundle);
    }
);

makeBundle(
    "./src/fake-timers-esm.js",
    {
        detectGlobals: false
    },
    function(bundle) {
        var source = "let FakeTimers;\n";
        source += bundle;
        source += Object.keys(timers)
            .map(function(key) {
                return (
                    "const _" +
                    key +
                    " = FakeTimers." +
                    key +
                    "\nexport { _" +
                    key +
                    " as " +
                    key +
                    " };"
                );
            })
            .join("\n");

        fs.writeFileSync("pkg/fake-timers-esm.mjs", source);
    }
);
