import webextStorageAdapter from "../index.mjs";
import { get } from "svelte/store";
import { strict as assert } from "assert";

describe("keys parameter", function() {
	specify("string", function() {
		var {stores} = webextStorageAdapter("example");
		assert.deepStrictEqual(Object.keys(stores), ["example"])
	});
	specify("array", function() {
		var expected = ["one", "two"];
		var {stores} = webextStorageAdapter(expected);
		assert.deepStrictEqual(Object.keys(stores), expected)
	});
	specify("object with default values", function() {
		var keysParam = {
			one: "A",
			two: "B",
		};
		var {stores} = webextStorageAdapter(keysParam);
		var actual = new Map( [...Object.entries(stores)].map( ([key, value]) => {
			return [key, get(value)];
		} ) );
		assert.deepStrictEqual(actual, new Map( Object.entries(keysParam) ));
	});
	specify("null", function() {
		if (!runNullKeysStoresTests) { return this.skip(); }
		var {stores} = webextStorageAdapter(null);
		assert.ok( Boolean(stores.anyKey) );
	});
});
describe("storageArea option", function() {
	specify("non-default", function(done) {
		var storageArea = makeStorageArea();
		storageArea.get = () => {
			done();
			return {};
		};
		webextStorageAdapter("unused", {storageArea});
	});
});
describe("live option", function() {
	function liveTest(done) {
		var expectedKey = "example", expectedValue = "hooray";
		var {stores} = webextStorageAdapter(expectedKey);
		chrome.storage.sync.set( {[expectedKey]: expectedValue} );
		stores[expectedKey].subscribe( (value) => {
			if (value == expectedValue) { done(); }
		} );
	}
	specify("true (storageArea.onChanged)", liveTest);
	specify("true (chrome.storage.onChanged)", function(done) {
		var onChanged = chrome.storage.sync.onChanged;
		delete chrome.storage.sync.onChanged;
		chrome.storage.onChanged = {
			addListener(fn) {
				onChanged.addListener( (changes) => fn(changes, "sync") );
			},
		};
		liveTest(done);
	});
	specify("true throws when listening fails", function() {
		var storageArea = makeStorageArea();
		delete storageArea.onChanged;
		assert.throws( () => webextStorageAdapter("example", {storageArea}) );
	});
	specify("false", function() {
		chrome.storage.sync.onChanged.addListener = () => { assert.fail(); }
		webextStorageAdapter("unused", {live: false});
	});
});
describe("onSetError option", function() {
	var setKey = "example", setValue = "oh no";
	errorTests([], function({done, override, expectedError}) {
		chrome.storage.sync.set = override;
		var {stores} = webextStorageAdapter(setKey, {
			onSetError(error, setItems) {
				assert.equal(error, expectedError);
				assert.deepStrictEqual(
					new Map( Object.entries(setItems) ),
					new Map( [[setKey, setValue]] )
				);
				done();
			}
		});
		stores[setKey].set(setValue);
	});
});
describe("stores property (non-null keys)", function() {
	specify("values are writable stores", function() {
		var {stores} = webextStorageAdapter("example");
		var testing = stores.example;
		assert.ok(testing.subscribe && testing.set && testing.update);
	});
	specify("set is an error in strict mode", function() {
		var {stores} = webextStorageAdapter("example");
		assert.throws( () => { stores.example = 1; } );
	});
	specify("store.set sends new values back", function(done) {
		var expected = { key: "example", value: "hooray" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(expected.key, {storageArea});
		stores[expected.key].set(expected.value);
	});
	specify("store.update sends new values back", function(done) {
		var expected = { key: "example", value: "huzzah" };
		var storageArea = makeStorageArea();
		storageArea.set = (data) => {
			assert.equal(data[expected.key], expected.value);
			done();
		};
		var {stores} = webextStorageAdapter(expected.key, {storageArea});
		stores[expected.key].update( () => expected.value );
	});
	specify("for live store groups, deleted keys are reset to default", function(done) {
		var expected = "goodbye";
		var storageArea = makeStorageArea({nananana: "BATMAN"});
		var {stores, ready} = webextStorageAdapter({
			nananana: expected,
		}, {storageArea});
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
		var {stores} = webextStorageAdapter([...expected.keys()], {storageArea});
		for (let [key, value] of expected.entries()) {
			stores[key].set(value);
		}
	});
});
describe("ready property", function() {
	specify("resolves after store values are loaded", function() {
		var expected = "hooray";
		var storageArea = makeStorageArea({example: expected});
		var {stores, ready} = webextStorageAdapter("example", {storageArea});
		return ready.then( () => {
			assert.equal(get(stores.example), expected);
		} );
	});
	errorTests([null], function({done, override, expectedError}) {
		chrome.storage.sync.get = override;
		var {ready} = webextStorageAdapter("unused");
		ready.catch( (error) => {
			assert.equal(error, expectedError);
			done();
		} );
	});
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
		var {unLive} = webextStorageAdapter("unused");
		unLive();
		assert.ok(passed);
	});
});
function errorTests(callbackArgs, testTemplate) {
	var expectedError = { borked: true };
	var tests = [
		{
			name: "checks chrome.runtime.lastError",
			override: (...args) => {
				var callback = args.pop();
				chrome.runtime.lastError = expectedError;
				callback(...callbackArgs);
			},
		},
		{
			name: "checks callback parameter",
			override: (...args) => {
				var callback = args.pop();
				callback(...callbackArgs, expectedError);
			},
		},
	];
	for (let {name, override} of tests) {
		specify(name, function(done) {
			testTemplate({done, override, expectedError});
		});
	}
}