import { writable } from "svelte/store";
export default function nullKeysStores(sendUpstream) {
	var filledStores = Object.create(null);
	var subscribedStores = new Map();
	var stores = new Proxy(filledStores, {
		get(target, key) {
			var foundStore = findStore(key);
			return foundStore || wrappedWritable(key);
		},
		set() {
			return false;
		},
	});
	function findStore(key) {
		if (key in filledStores) {
			return filledStores[key];
		} else if (subscribedStores.has(key)) {
			return subscribedStores.get(key);
		}
	}
	
	var privateSet = Symbol();
	function wrappedWritable(key) {
		var { set, update, subscribe } = writable(undefined, () => {
			checkValidity(key, me);
			subscribedStores.set(key, me);
			return () => {
				subscribedStores.delete(key);
			};
		});
		var me = {
			set: (value) => {
				checkValidity(key, me);
				filledStores[key] = me;
				sendUpstream(key, value);
				set(value);
			},
			update: (updater) => {
				checkValidity(key, me);
				filledStores[key] = me;
				update( (oldValue) => {
					var newValue = updater(oldValue);
					sendUpstream(key, newValue);
					return newValue;
				} );
			},
			subscribe,
			[privateSet]: (value) => {
				if (value === undefined) {
					delete filledStores[key];
				} else {
					filledStores[key] = me;
				}
				set(value);
			},
		};
		return me;
	}
	function checkValidity(key, store) {
		var foundStore = findStore(key);
		if (foundStore && foundStore != store) {
			throw new Error("Store invalidated");
		}
	}
	var privateSetters = { get: (key) => stores[key][privateSet] };
	
	return { stores, privateSetters };
}