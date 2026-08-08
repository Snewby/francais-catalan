// vitest does not apply setup files implicitly the way Jest does; this file is
// wired up through test.setupFiles in vitest.config.ts. Forgetting that is the
// usual reason Dexie tests fail with "indexedDB is not defined".
import 'fake-indexeddb/auto';
