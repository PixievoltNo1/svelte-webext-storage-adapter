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
		var {stores, ready} = webextStorageAdapter(null, {
			storageArea: makeStorageArea(storageData),
		});
		return ready.then( () => {
			assert.deepStrictEqual(new Set( Object.keys(stores) ), new Set( Object.keys(storageData) ));
		} );
	});
	specify("any key produces a writable store", function() {
		var {stores} = webextStorageAdapter(null);
		var testing = stores.anyKey;
		assert.ok(testing.subscribe && testing.set && testing.update);
	});
	specify("set is an error in strict mode", function() {
		var {stores} = webextStorageAdapter(null);
		assert.throws( () => { stores.anyKey = 1; } );
	});
	specify("store.set sends new values back", function(done) {
		var expected = { key: "anyKey", value: "hooray" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(null, {storageArea});
		stores[expected.key].set(expected.value);
	});
	specify("store.update sends new values back", function(done) {
		var expected = { key: "anyKey", value: "huzzah" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(null, {storageArea});
		stores[expected.key].update( () => expected.value );
	});
	specify("for live store groups, deleted keys are removed", function(done) {
		var expected = new Set(["I'd like to be"]);
		var initialStorage = {nananana: "hey jude", [ [...expected][0] ]: "under the sea"};
		var storageArea = makeStorageArea(initialStorage);
		var {stores, ready} = webextStorageAdapter(null, {storageArea});
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
});