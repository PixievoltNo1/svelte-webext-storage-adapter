export default function nullKeysStores(makeStore, receiveFromStorage) {
	var filledStores = Object.create(null);
	var subscribedStores = new Map();
	var wantedStores = new Map();
	var registry = new FinalizationRegistry( (key) => wantedStores.delete(key) );
	var stores = new Proxy(filledStores, {
		get(target, key) {
			if (key in filledStores) {
				return filledStores[key];
			}
			let store = wantedStores.get(key);
			if (store) {
				store = store.deref();
			}
			if (!store) {
				store = initStore(key);
				wantedStores.set( key, new WeakRef(store) );
				registry.register(store, key);
			}
			return store;
		},
		set() {
			return false;
		},
	});
	
	var skipFill = false;
	function initStore(key) {
		var store = makeStore(key);
		var innerSubscribe = store.subscribe;
		store.subscribe = (subscriber) => {
			var key = Symbol();
			subscribedStores.set(key, store);
			var unsubscribe = innerSubscribe(subscriber);
			return () => {
				subscribedStores.delete(key);
				unsubscribe();
			};
		};
		skipFill = true;
		innerSubscribe( (value) => {
			if (skipFill) {
				skipFill = false;
				return;
			}
			filledStores[key] = store;
		} );
		return store;
	};
	function resetStore(key) {
		delete filledStores[key];
		skipFill = true;
		receiveFromStorage(key, undefined);
		skipFill = false;
	}
	
	return { stores, resetStore };
}