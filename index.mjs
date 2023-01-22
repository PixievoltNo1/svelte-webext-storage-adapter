import { writable } from "svelte/store";
import { tick } from "svelte";
import nullKeysStores from "./nullKeysStores.mjs";

/**
 * Returned by webextStorageAdapter. Provides stores, plus properties that concern all of them.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#returned-value-store-group)
 * @typedef {Object} StoreGroup
 * @property {!Object<string,!Object>} stores Writable stores for each key in extension storage.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-stores)
 * @property {!Promise} ready Resolves when the initial read from extension storage is complete.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-ready)
 * @property {function()} unLive Stops listening for changes in extension storage so that the store
 * group can be garbage-collected.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#property-unlive)
 */

/**
 * Create Svelte stores based on data from `chrome.storage`.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#default-export-webextstorageadapter)
 * @param {string|string[]|!Object<string,*>|null} keys Keys from extension storage to use, or
 * `null` to use the entire area.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#parameter-keys)
 * @param {Object} [options] Additional parameters.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#parameter-options)
 * @param {!Object} [options.storageArea=chrome.storage.sync] The StorageArea where store values
 * will be read from & written to.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#storagearea)
 * @param {boolean} [options.live=true] Whether the stores will be updated in response to changes in
 * extension storage made elsewhere.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#live)
 * @param {function(!Object,!Object)} [options.onSetError] Will be called if writing to extension
 * storage fails.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#onseterror)
 * @returns {StoreGroup} A store group object. Object creation is synchronous, but data from
 * extension storage isn't available until the `ready` property's Promise resolves.
 * [Read more...](https://github.com/PixievoltNo1/svelte-webext-storage-adapter#returned-value-store-group)
 */
export default function webextStorageAdapter(keys, options = {}) {
	var {
		storageArea = chrome.storage.sync,
		live = true,
		onSetError = (error, setItems) => {
			console.error("error: ", error, "\n", "setItems: ", setItems);
		},
	} = options;
	
	var defaults = Object.create(null);
	if (keys == null) {
		var { stores, privateSetters } = nullKeysStores(sendUpstream);
	} else {
		if (typeof keys == "object" && !Array.isArray(keys)) {
			Object.assign(defaults, keys);
			keys = Object.keys(keys);
		}
		var stores = Object.create(null), privateSetters = new Map();
		for (let key of (Array.isArray(keys) ? keys : [keys])) {
			let { set, update, subscribe } = writable( defaults[key] );
			privateSetters.set(key, set);
			stores[key] = {
				set: (value) => {
					sendUpstream(key, value);
					set(value);
				},
				update: (updater) => {
					update( (oldValue) => {
						var newValue = updater(oldValue);
						sendUpstream(key, newValue);
						return newValue;
					} );
				},
				subscribe,
			};
		}
		Object.freeze(stores);
	}
	var setItems;
	function sendUpstream(key, value) {
		if (!setItems) {
			setItems = Object.create(null);
			tick().then( () => {
				let currentSetItems = setItems;
				storageArea.set(currentSetItems, (error = chrome.runtime.lastError) => {
					if (error) { onSetError(error, currentSetItems); }
				});
				setItems = null;
			} );
		}
		setItems[key] = value;
	}
	
	var get = new Promise( (resolve, reject) => {
		storageArea.get(keys, (results, error = chrome.runtime.lastError) => {
			if (error) {
				reject(error);
			} else {
				resolve(results);
			}
		});
	} );
	var ready = get.then( (results) => {
		for (let key of Object.keys(results)) {
			privateSetters.get(key)(results[key]);
		}
		return true;
	} );
	
	var eventSource, specifiedArea;
	if (live) {
		if (storageArea.onChanged) {
			eventSource = storageArea.onChanged;
		} else {
			for (let name of Object.keys(chrome.storage)) {
				if (chrome.storage[name] == storageArea) {
					specifiedArea = name;
					eventSource = chrome.storage.onChanged;
					break;
				}
			}
		}
		if (eventSource) {
			eventSource.addListener(receiveChanges);
		} else {
			throw new TypeError("This area doesn't support live updates");
		}
	}
	function receiveChanges(changes, area) {
		if (specifiedArea && area != specifiedArea) { return; }
		for (let key of Object.keys(changes)) {
			if ( !(keys == null || key in stores) ) { continue; }
			if ("newValue" in changes[key]) {
				privateSetters.get(key)( changes[key].newValue );
			} else {
				privateSetters.get(key)( defaults[key] );
			}
		}
	}
	function unLive() {
		if (!eventSource) { return; }
		eventSource.removeListener(receiveChanges);
	}
	
	return { stores, ready, unLive };
}