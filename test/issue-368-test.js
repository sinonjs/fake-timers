import {
    sinon,
    FakeTimers,
    assert,
    addTimerReturnsObject,
} from "./helpers/setup-tests.js";

describe("#368 - timeout.refresh setTimeout arguments", function () {
    before(function () {
        if (!addTimerReturnsObject) {
            this.skip();
        }
    });

    it("should forward arguments passed to setTimeout", function () {
        const clock = FakeTimers.install();
        const stub = sinon.stub();

        const t = setTimeout(stub, 1000, "test");
        clock.tick(1000);
        t.refresh();
        clock.tick(1000);
        assert.calledTwice(stub);
        assert.alwaysCalledWith(stub, "test");
        clock.uninstall();
    });
});
