before(function() {
	global.makeStorageArea = function(data = {}) {
		var listeners = new Set();
		return {
			get(keys, callback) {
				var requested = {};
				if (keys == null) {
					requested = data;
				} else if (typeof keys == "string" && keys in data) {
					requested[keys] = data[keys];
				} else if (Array.isArray(keys)) {
					for (let key of keys) {
						if ( !(key in data) ) { continue; }
						requested[key] = data[key];
					}
				}
				Promise.resolve().then( () => { callback(requested); } );
			},
			set(newValues, callback = () => {}) {
				var changeset = {};
				for (let [key, value] of Object.entries(newValues)) {
					data[key] = value;
					changeset[key] = {newValue: value};
				}
				Promise.resolve().then( () => {
					callback();
					for (let listener of listeners) {
						listener(changeset);
					}
				} );
			},
			remove(key) {
				delete data[key];
				var changeset = { [key]: {} };
				Promise.resolve().then( () => {
					for (let listener of listeners) {
						listener(changeset);
					}
				} );
			},
			onChanged: {
				addListener(fn) {
					listeners.add(fn);
				},
				removeListener(fn) {
					listeners.delete(fn);
				},
			},
		};
	};
	global.chrome = {
		runtime: {},
		storage: {},
	};
	global.runNullKeysStoresTests = Boolean(global.WeakRef && global.FinalizationRegistry);
	if (!runNullKeysStoresTests) {
		console.warn("Support for WeakRef and FinalizationRegistry is needed to run nullKeysStores tests.");
	}
});
beforeEach(function() {
	delete chrome.runtime.lastError;
	chrome.storage.sync = makeStorageArea();
});