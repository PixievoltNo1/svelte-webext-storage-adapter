import { writable } from "svelte/store";
export default function nullKeysStores(sendUpstream) {
	var filledStores = Object.create(null);
	var subscribedStores = new Set();
	var wantedStores = new Map();
	var registry = new FinalizationRegistry( (key) => wantedStores.delete(key) );
	var stores = new Proxy(filledStores, {
		get(target, key) {
			if (key in filledStores) {
				return filledStores[key];
			} else {
				let store = wantedStores.get(key);
				if (store) {
					store = store.deref();
				}
				if (!store) {
					store = wrappedWritable(key);
					wantedStores.set( key, new WeakRef(store) );
					registry.register(store, key);
				}
				return store;
			}
		},
		set() {
			return false;
		},
	});
	
	var privateSet = Symbol();
	function wrappedWritable(key) {
		var { set, update, subscribe } = writable(undefined, () => {
			subscribedStores.add(me);
			return () => {
				subscribedStores.delete(me);
			};
		});
		var me = {
			set: (value) => {
				filledStores[key] = me;
				sendUpstream(key, value);
				set(value);
			},
			update: (updater) => {
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
	var privateSetters = { get: (key) => stores[key][privateSet] };
	
	return { stores, privateSetters };
}