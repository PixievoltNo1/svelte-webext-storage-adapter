import webextStorageAdapter from "../index.mjs";
import { get } from "svelte/store";
import { strict as assert } from "assert";
import { createHook } from "async_hooks";

describe("keys parameter", function() {
	specify("string", function() {
		var {stores} = webextStorageAdapter("sync", "example");
		assert.deepStrictEqual(Object.keys(stores), ["example"])
	});
	specify("array", function() {
		var expected = ["one", "two"];
		var {stores} = webextStorageAdapter("sync", expected);
		assert.deepStrictEqual(Object.keys(stores), expected)
	});
	specify("object with default values", function() {
		var keysParam = {
			one: "A",
			two: "B",
		};
		var {stores} = webextStorageAdapter("sync", keysParam);
		var actual = new Map( [...Object.entries(stores)].map( ([key, value]) => {
			return [key, get(value)];
		} ) );
		assert.deepStrictEqual(actual, new Map( Object.entries(keysParam) ));
	});
	specify("null", function() {
		if (!runNullKeysStoresTests) { return this.skip(); }
		var {stores} = webextStorageAdapter("sync", null);
		assert.ok( Boolean(stores.anyKey) );
	});
});
describe("storageArea option", function() {
	specify("string", function(done) {
		chrome.storage.sync.get = () => {
			done();
			return {};
		};
		webextStorageAdapter("sync", "unused");
	});
	specify("object", function(done) {
		var storageArea = makeStorageArea();
		storageArea.get = () => {
			done();
			return {};
		};
		webextStorageAdapter(storageArea, "unused");
	});
});
describe("live option", function() {
	specify("true (storageArea.onChanged)", function(done) {
		var expectedKey = "example", expectedValue = "hooray";
		var {stores} = webextStorageAdapter("sync", expectedKey);
		chrome.storage.sync.set({ [expectedKey]: expectedValue });
		stores[expectedKey].subscribe((value) => {
			if (value == expectedValue) { done(); }
		});
	});
	specify("true throws when listening fails", function() {
		var storageArea = makeStorageArea();
		delete storageArea.onChanged;
		assert.throws( () => webextStorageAdapter(storageArea, "example") );
	});
	specify("false", function() {
		chrome.storage.sync.onChanged.addListener = () => { assert.fail(); }
		webextStorageAdapter("sync", "unused", {live: false});
	});
});
describe("stores property (non-null keys)", function() {
	specify("values are writable stores", function() {
		var {stores} = webextStorageAdapter("sync", "example");
		var testing = stores.example;
		assert.ok(testing.subscribe && testing.set && testing.update);
	});
	specify("set is an error in strict mode", function() {
		var {stores} = webextStorageAdapter("sync", "example");
		assert.throws( () => { stores.example = 1; } );
	});
	specify("store.set sends new values back", function(done) {
		var expected = { key: "example", value: "hooray" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(storageArea, expected.key);
		stores[expected.key].set(expected.value);
	});
	specify("store.update sends new values back", function(done) {
		var expected = { key: "example", value: "huzzah" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(storageArea, expected.key);
		stores[expected.key].update( () => expected.value );
	});
	specify("for live store groups, deleted keys are reset to default", function(done) {
		var expected = "goodbye";
		var storageArea = makeStorageArea({nananana: "BATMAN"});
		var {stores, ready} = webextStorageAdapter(storageArea, {
			nananana: expected,
		});
		ready.then( () => {
			stores.nananana.subscribe( (value) => {
				if (value == expected) {
					done();
				}
			} );
			storageArea.remove("nananana");
		} );
	});
	specify("multi-set sends batched update", function(done) {
		var expected = new Map([["one", "A"], ["two", "B"]]);
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.deepStrictEqual(new Map( Object.entries(data) ), expected);
			done();
		};
		var {stores} = webextStorageAdapter(storageArea, [...expected.keys()]);
		for (let [key, value] of expected.entries()) {
			stores[key].set(value);
		}
	});
});
describe("ready property", function() {
	specify("resolves after store values are loaded", function() {
		var expected = "hooray";
		var storageArea = makeStorageArea({example: expected});
		var {stores, ready} = webextStorageAdapter(storageArea, "example");
		return ready.then( () => {
			assert.equal(get(stores.example), expected);
		} );
	});
	errorTests([null], function({done, override, expectedError}) {
		chrome.storage.sync.get = override;
		var {ready} = webextStorageAdapter("sync", "unused");
		ready.then( () => {
			assert.fail("no error");
		}, (error) => {
			assert.equal(error, expectedError);
		} ).then( () => done(), done );
	});
});
describe("onWrite property", function () {
	var setKey = "example", setValue = "oh no";
	specify("accepts a subscriber");
	specify("subscriber's received Promise resolves when the write is done");
	errorTests([], function ({ done, override, expectedError }) {
		this.skip();
		chrome.storage.sync.set = override;
		var { stores } = webextStorageAdapter(setKey, {
			onSetError(error, setItems) {
				try {
					assert.equal(error, expectedError);
					assert.deepStrictEqual(
						new Map(Object.entries(setItems)),
						new Map([[setKey, setValue]])
					);
				} catch (o_o) {
					return done(o_o);
				}
				done();
			}
		});
		stores[setKey].set(setValue);
	});
	specify("returns an unsubscriber")
});
describe("unLive property", function() {
	specify("stops listening", function() {
		var passed = false, listener;
		chrome.storage.sync.onChanged = {
			addListener(fn) {
				listener = fn;
			},
			removeListener(fn) {
				assert.equal(listener, fn);
				passed = true;
			},
		}
		var {unLive} = webextStorageAdapter("sync", "unused");
		unLive();
		assert.ok(passed);
	});
});
function errorTests(callbackArgs, testTemplate) {
	var expectedError = { borked: true };
	var tests = [
		{
			name: "checks chrome.runtime.lastError",
			async override(...args) {
				var callback = args.pop();
				await Promise.resolve();
				chrome.runtime.lastError = expectedError;
				callback(...callbackArgs);
			},
		},
		{
			name: "checks callback parameter",
			async override(...args) {
				var callback = args.pop();
				await Promise.resolve();
				callback(...callbackArgs, expectedError);
			},
		},
	];
	for (let {name, override} of tests) {
		specify(name, function(done) {
			testTemplate.bind(this)({done, override, expectedError});
		});
	}
}