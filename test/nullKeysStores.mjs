import webextStorageAdapter from "../index.mjs";
import { strict as assert } from "assert";

describe("stores property (null keys)", function() {
	before(function() {
		if (!runNullKeysStoresTests) { this.skip(); }
	});
	specify("has keys that have values", function() {
		var storageData = {
			one: "A",
			two: "B",
		};
		var {stores, ready} = webextStorageAdapter(makeStorageArea(storageData), null);
		return ready.then( () => {
			assert.deepStrictEqual(new Set( Object.keys(stores) ), new Set( Object.keys(storageData) ));
		} );
	});
	specify("any key produces a writable store", function() {
		var {stores} = webextStorageAdapter("sync", null);
		var testing = stores.anyKey;
		assert.ok(testing.subscribe && testing.set && testing.update);
	});
	specify("set is an error in strict mode", function() {
		var {stores} = webextStorageAdapter("sync", null);
		assert.throws( () => { stores.anyKey = 1; } );
	});
	specify("store.set sends new values back", function(done) {
		var expected = { key: "anyKey", value: "hooray" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(storageArea, null);
		stores[expected.key].set(expected.value);
	});
	specify("store.update sends new values back", function(done) {
		var expected = { key: "anyKey", value: "huzzah" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(storageArea, null);
		stores[expected.key].update( () => expected.value );
	});
	specify("for live store groups, deleted keys are removed", function(done) {
		var expected = new Set(["I'd like to be"]);
		var initialStorage = {nananana: "hey jude", [ [...expected][0] ]: "under the sea"};
		var storageArea = makeStorageArea(initialStorage);
		var {stores, ready} = webextStorageAdapter(storageArea, null);
		ready.then( () => {
			stores.nananana.subscribe( (value) => {
				try {
					assert.deepStrictEqual(new Set( Object.keys(stores) ), expected);
					done();
				} catch (e) {}
			} );
			storageArea.remove("nananana");
		} );
	});
	describe("garbage collection", function() {
		before(function() {
			if ( !(globalThis.gc && globalThis.setImmediate) ) {
				this.skip();
			}
		});
		/* It appears that before globalThis.gc can reliably collect a WeakRef, the function
		creating it must return (awaiting doesn't count) and the microtask queue must be cleared. */
		specify("subscribed stores cannot be GC'd", function(done) {
			let { stores } = webextStorageAdapter("sync", null);
			stores.test.subscribe( () => {} );
			let expectedPresent = new WeakRef(stores.test);
			setImmediate(() => {
				globalThis.gc();
				assert.ok(expectedPresent.deref());
				done();
			});
		});
		specify("stores with no more subscriptions can be GC'd", function (done) {
			let { stores } = webextStorageAdapter("sync", null);
			let unsubscribe = stores.test.subscribe( () => {} );
			let expectedAbsent = new WeakRef(stores.test);
			unsubscribe();
			setImmediate(() => {
				globalThis.gc();
				assert.equal(expectedAbsent.deref(), undefined);
				done();
			});
		});
		specify("stores with a value cannot be GC'd", function (done) {
			let { stores } = webextStorageAdapter("sync", null);
			stores.test.set("hi");
			let expectedPresent = new WeakRef(stores.test);
			setImmediate(() => {
				globalThis.gc();
				assert.ok(expectedPresent.deref());
				done();
			});
		});
		specify("stores with data deleted from extension storage can be GC'd", function (done) {
			let { stores, onWrite } = webextStorageAdapter("sync", null);
			stores.test.set("hi");
			let expectedAbsent = new WeakRef(stores.test);
			onWrite( async (write) => {
				await write;
				chrome.storage.sync.remove("test", () => {
					setImmediate(() => {
						globalThis.gc();
						assert.equal(expectedAbsent.deref(), undefined);
						done();
					});
				});
			} );
		});
	});
});