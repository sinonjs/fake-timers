import * as timers from '../pkg/fake-timers-esm.js';

const expectedExports = ['timers', 'createClock', 'install', 'withGlobal'];

for (const exp of expectedExports) {
    if (!timers[exp]) {
        console.error(`Missing export in ES module: ${exp}`);
        process.exit(1);
    }
}

let hasRun = false;
const org = setTimeout;
const clock = timers.install();
setTimeout(() => (hasRun = true));
clock.tick();

if (!hasRun) {
    console.error('Failed to tick timers in ES Module');
    process.exit(1);
}
