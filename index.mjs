import { writable } from "svelte/store";
import { tick } from "svelte";
import nullKeysStores from "./nullKeysStores.mjs";
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
			defaults = Object.assign(Object.create(null), keys);
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
				storageArea.set(setItems, (error = chrome.runtime.lastError) => {
					if (error) { onSetError(error, setItems); }
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