import { writable } from "svelte/store";
import { tick } from "svelte";
import nullKeysStores from "./nullKeysStores.mjs";

/**
 * Returned by webextStorageAdapter. Provides stores, plus properties that concern all of them.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#store-groups)
 * @typedef {Object} StoreGroup
 * @property {!Object<string,!Object>} stores Writable stores for each key in extension storage.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-stores)
 * @property {!Promise} ready Resolves when the initial read from extension storage is complete.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-ready)
 * @property {function(function(Promise, Object)): Function} onWrite Subscribe to be notified when
 * extension storage is being written to.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-onwrite) 
 * @property {function()} unLive Stops listening for changes in extension storage so that the store
 * group can be garbage-collected.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-unlive)
 */

/**
 * Create Svelte stores based on data from `chrome.storage`.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#default-export-webextstorageadapter)
 * @param {string|!Object} storageArea The StorageArea where store values will be read from & written to.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#parameter-storagearea)
 * @param {string|string[]|!Object<string,*>|null} keys Keys from extension storage to use, or
 * `null` to use the entire area.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#parameter-keys)
 * @param {Object} [options] Additional parameters.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#parameter-options)
 * @param {boolean} [options.live=true] Whether the stores will be updated in response to changes in
 * extension storage made elsewhere.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#live)
 * @returns {StoreGroup} A store group object. Object creation is synchronous, but data from
 * extension storage isn't available until the `ready` property's Promise resolves.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#store-groups)
 */
export default function webextStorageAdapter(storageArea, keys, options = {}) {
	var { live = true } = options;
	
	var defaults = Object.create(null), skipNextCollect = false, nextSetItems;
	function makeStore(forKey) {
		var store = writable(defaults[forKey]);
		skipNextCollect = true;
		store.subscribe( (value) => {
			if (skipNextCollect) {
				skipNextCollect = false;
				return;
			}
			if (!nextSetItems) {
				nextSetItems = Object.create(null);
				tick().then(sendToStorage);
			}
			nextSetItems[forKey] = value;
		} );
		return store;
	}
	function receiveFromStorage(key, value) {
		skipNextCollect = true;
		stores[key].set(value);
		skipNextCollect = false;
	}
	if (keys == null) {
		var { stores, resetStore } = nullKeysStores(makeStore, receiveFromStorage);
	} else {
		if (typeof keys == "object" && !Array.isArray(keys)) {
			Object.assign(defaults, keys);
			keys = Object.keys(keys);
		}
		var stores = Object.create(null);
		for (let key of (Array.isArray(keys) ? keys : [keys])) {
			stores[key] = makeStore(key);
		}
		Object.freeze(stores);
		var resetStore = (key) => { receiveFromStorage(key, defaults[key]); };
	}
	
	if (typeof storageArea == "string") {
		storageArea = chrome.storage[storageArea];
	}
	if (!storageArea?.set) {
		const msg = "first parameter must be a StorageArea, or the name of one in chrome.storage";
		throw new TypeError(msg);
	}
	var ready = new Promise( (resolve, reject) => {
		storageArea.get(keys, (results, error = chrome?.runtime?.lastError) => {
			if (error) {
				reject(error);
			} else {
				for (let key of Object.keys(results)) {
					receiveFromStorage(key, results[key]);
				}
				resolve(true);
			}
		});
	} );

	var onWriteSubscribers = new Map();
	function sendToStorage() {
		let setItems = nextSetItems;
		var write = new Promise((resolve, reject) => {
			storageArea.set(setItems, (error = chrome?.runtime?.lastError) => {
				if (error) {
					reject({ error, setItems });
				} else {
					resolve(true);
				}
			});
		});
		for (let subscriber of onWriteSubscribers.values()) {
			subscriber(write, setItems);
		}
		nextSetItems = null;
	}
	function onWrite(subscriber) {
		if (typeof subscriber != "function") {
			throw new TypeError("onWrite must be called with a function");
		}
		let key = Symbol();
		onWriteSubscribers.set(key, subscriber);
		return () => onWriteSubscribers.delete(key);
	}
	
	if (live) {
		if (!storageArea.onChanged) {
			throw new TypeError("This area doesn't support live updates");
		}
		storageArea.onChanged.addListener(receiveChanges);
	}
	function receiveChanges(changes) {
		for (let key of Object.keys(changes)) {
			if ( !(keys == null || key in stores) ) { continue; }
			if ("newValue" in changes[key]) {
				receiveFromStorage(key, changes[key].newValue);
			} else {
				resetStore(key);
			}
		}
	}
	function unLive() {
		storageArea.onChanged.removeListener(receiveChanges);
	}
	
	return { stores, ready, onWrite, unLive };
}