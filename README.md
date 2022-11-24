# `svelte-webext-storage-adapter`
[![npm](https://img.shields.io/npm/v/svelte-webext-storage-adapter.svg)](https://www.npmjs.com/package/svelte-webext-storage-adapter) [![Bundle size](https://img.shields.io/bundlephobia/minzip/svelte-webext-storage-adapter.svg)](https://bundlephobia.com/result?p=svelte-webext-storage-adapter) [![License](https://img.shields.io/github/license/PixievoltNo1/svelte-webext-storage-adapter.svg)](https://github.com/PixievoltNo1/svelte-webext-storage-adapter/blob/master/LICENSE.txt)

If you're using [Svelte](https://svelte.dev/) v3 to make a [WebExtension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) for Firefox or Chrome, you can use this to create [writable stores](https://svelte.dev/tutorial/writable-stores) that are backed by your extension's storage. Handy features are provided to you right out of the box:

* **Flexible:** This package can work with a part of or the entirety of any area of `chrome.storage`, including areas from 3rd-party packages.
* **Automatic batching:** Save on storage writes when all your store changes are batched up to be sent out at the next Svelte tick.
* **Live updates:** If you'd like, this package will handle listening for storage changes for you, using the modern `StorageArea.onChanged` event that 3rd-party areas can use, and falling back on `chrome.storage.onChanged` if needed.

This project has a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in the Git repo or issues tracker, you agree to be as courteous, welcoming, and generally a lovely person as its terms require. 😊

👀 [**Version 3 is in planning!**](https://github.com/PixievoltNo1/svelte-webext-storage-adapter/issues/14) Leave your feedback and help it be the best version yet!

<!-- Table of contents generated mostly by the markdown-toc package - however, it includes emoji in the URLs, and they need to be stripped for GitHub -->
<!-- toc -->

  * [Default export: `webextStorageAdapter()`](#default-export-webextstorageadapter)
    + [Parameter: `keys`](#parameter-keys)
    + [Parameter: `options`](#parameter-options)
      - [`storageArea`](#storagearea)
        * [Using external storage areas](#using-external-storage-areas)
      - [`live`](#live)
      - [`onSetError()`](#onseterror)
    + [Returned value: Store group](#returned-value-store-group)
      - [Property: `stores`](#property-stores)
      - [Property: `ready`](#property-ready)
      - [Property: `unLive()`](#property-unlive)
  * [Suggested usage: Dedicated module](#suggested-usage-dedicated-module)
  * [Tip: Use with `svelte-writable-derived`](#tip-use-with-svelte-writable-derived)
  * [Browser compatibility](#browser-compatibility)
- [💖 Support the developer](#-support-the-developer)
  * [💸 ... with money](#--with-money)
  * [💌 ... with kind words](#--with-kind-words)
  * [🤝 ... with a job](#--with-a-job)

<!-- tocstop -->

## Default export: `webextStorageAdapter()`

<i>Parameters: [`keys`](#parameter-keys) (string, array, object, or `null`), optional [`options`](#parameter-options) (object)</i><br>
<i>Returns a [store group](#returned-value-store-group)</i>

Creates a group of Svelte v3 [writable stores](https://svelte.dev/tutorial/writable-stores), populated from & persisted to `chrome.storage` (by default, the `sync` area). It will immediately request the needed values; this is asynchronous, but the store group will be returned synchronously with all stores in place. You can use [the store group's `ready` promise](#property-ready) to determine when values from storage are available.

```javascript
// Example

import webextStorageAdapter from "svelte-webext-storage-adapter";
var storeGroup = webextStorageAdapter(["thisKey", "thatKey"]);
storeGroup.ready.then( () => {
	// You can now interact with data in storage
} );
```

### Parameter: `keys`

<i>string, array, object, or `null`</i>

This can be any of the same values accepted by [`StorageArea.get`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get). Using `null` will allow the store group to read and write any key in storage. Unlike `StorageArea.get`, default values specified in the object form will survive the round trip regardless of type.

```javascript
// Example: Specifying keys with default values
var storeGroup = webextStorageAdapter({
	i: "he",
	you: "me",
	we: "all together",
});
storeGroup.stores.we.subscribe(console.log); // logs "all together"
```

### Parameter: `options`

<i>object</i>

An optional parameter with optional properties `storageArea`, `live`, and `onSetError`, the effects of which are detailed below.

#### `storageArea`

<i>[`StorageArea`](https://developer.chrome.com/extensions/storage#type-StorageArea)</i><br>
<i>Default: `chrome.storage.sync`</i>

The area that will be read from and written to, usually either `chrome.storage.sync` or `chrome.storage.local`.

```javascript
// Example: Making store groups for both local and sync
var localGroup = webextStorageAdapter(null, {storageArea: chrome.storage.local});
var syncGroup = webextStorageAdapter(null);
```

##### Using external storage areas

It's possible to use `StorageArea` objects not originally part of `chrome.storage`, such as the `chrome-storage-largeSync` package (not linking as it seems to be unmaintained as of this writing).

Implementors of such objects must provide [`StorageArea`](https://developer.chrome.com/extensions/storage#type-StorageArea)'s `get` and `set` methods, accepting callbacks. For the `live` option below to work, they must also implement the `onChanged` property. They may indicate errors either by setting `chrome.runtime.lastError` (⚠️ but they need to delete it afterwards), or by passing an extra parameter to the callbacks.

#### `live`

<i>boolean</i><br>
<i>Default: `true`</i>

If `true`, `webextStorageAdapter` will listen for changes to `options.storageArea` and propagate them to the stores. If a key is deleted from storage, this will set the key's corresponding store to its default value if one was specified in the `keys` parameter, or `undefined` otherwise.

This will prevent the store group from being garbage-collected. If this is a concern, you can call the group's [`unLive` method](#property-unlive) when you're done with it.

This throws an error if used with a 3rd-party area that doesn't support it.

```javascript
// Example

// In your extension's tab page / browser action popup / etc.
import webextStorageAdapter from "svelte-webext-storage-adapter";
// The live option defaults to true, but we explicitly set it here for demonstration purposes
var storeGroup = webextStorageAdapter("noise", {live: true});
storeGroup.stores.noise.subscribe( (value) => console.log(value) );
chrome.runtime.sendMessage("Sound the alarm!");

// In your extension's background page
chrome.runtime.onMessage.addListener( (message) => {
	if (message == "Sound the alarm!") {
		chrome.storage.sync.set({noise: "awooga"}); // The above script will eventually log "awooga"
	}
} );
```

#### `onSetError()`

<i>Called with: `error` (object), `setItems` (object)</i><br>
<i>Default: `(error, setItems) => { console.error("error: ", error, "\n", "setItems: ", setItems); }`</i>

If an attempt to write to `options.storageArea` fails, this function is called with `error` as the error that was reported and `setItems` as the first parameter given to `options.storageArea.set`. Note that changes to the stores will *not* be rolled back.

### Returned value: Store group

<i>Object</i>

Provides access to the requested stores, plus properties that concern all of them as a whole.

#### Property: `stores`

<i>Object (prototype: `null`)</i>

This has a property for every key specified in `webextStorageAdapter`'s [`keys` parameter](#parameter-keys), and each property's value is a Svelte writable store containing the corresponding value in [`options.storageArea`](#storagearea). If `keys` was `null`, then `stores` is a `Proxy` that allows getting *any* property to obtain a usable store, but operations such as `Object.keys()`, `for...in`, etc. will only expose keys that are known to have values.

New values introduced via the stores' `set` and `update` methods are batched up into a single `options.storageArea.set()` call that happens when [Svelte's `tick()`](https://svelte.dev/docs#tick) resolves. The stores themselves will have their new values immediately.

To help avoid bugs in your code, directly setting any property of `stores` is disallowed, and will throw an error in strict mode. Remember to use `stores.example.set(value)` instead of `stores.example = value`!

```javascript
// Example

import webextStorageAdapter from "svelte-webext-storage-adapter";
var storeGroup = webextStorageAdapter(null);
// Since storeGroup.ready hasn't resolved yet, no data will be loaded...
console.log( Object.keys(storeGroup.stores) ); // []
// ... but we can set data and have it sent to extension storage anyways
storeGroup.stores.tooBad.set("Waluigi time");
console.log( Object.keys(storeGroup.stores) ); // ["tooBad"]

// For non-null keys parameters, the specified keys are always present
var storeGroup2 = webextStorageAdapter(["thing1", "thing2"]);
console.log( Object.keys(storeGroup2.stores) ); // ["thing1", "thing2"]
```

#### Property: `ready`

<i>`Promise`</i>

Resolves with `true` after all stores have been set to values received from the initial `options.storageArea.get` call, or rejects with a reported error object.

```javascript
// Example

// In a Svelte component's <script> block
import webextStorageAdapter from "svelte-webext-storage-adapter";
var { stores, ready, unLive } = webextStorageAdapter(null);
var preparations = Promise.all([ready, ...otherAsyncWork]);
```
```html
<!-- In the same component's markup -->
{#await preparations}
	<LoadingAnimation/>
{:then}
	<UsefulContent/>
{/await}
```

#### Property: `unLive()`

<i>No parameters</i>

Reverses the effects of the [`live: true` option](#live) so that the store group can be garbage-collected. This function does not use `this` and may be freely reassigned.

```javascript
// Example

// In a Svelte component's <script> block
import webextStorageAdapter from "svelte-webext-storage-adapter";
import { onDestroy } from "svelte";

var { stores, ready, unLive } = webextStorageAdapter("myKey");
onDestroy( () => {
	unLive();
} );
```

## Suggested usage: Dedicated module

I recommend having a module in your project specifically for calling `webextStorageAdapter`, like so:

```javascript
// In file storage.esm.js
import webextStorageAdapter from "svelte-webext-storage-adapter";

var {stores, ready} = webextStorageAdapter({
	"Your": "default",
	"values": "default",
	"here": "default",
}, {
	onSetError(error, setItems) {
		// Your error-handling logic here
	}
})
export { stores, ready, stores as default };

// In a component's script
import storage from "./storage.esm.js";

var {here} = storage;
$: reactToHere( $here );
```

## Tip: Use with `svelte-writable-derived`

<i>Full disclosure: I, Pixievolt, am the author of `svelte-writable-derived`. If you find this tip helpful, now you have </i>two<i> reasons to <a href="#-support-the-developer">support me!</a></i>

Chrome's implementation of `chrome.storage` can't safely store anything besides booleans, numbers, strings, and arrays. If you need something more complex, you can use the [`svelte-writable-derived`](https://github.com/PixievoltNo1/svelte-writable-derived) package to translate your data to & from its storage-safe form.

```javascript
import webextStorageAdapter from "svelte-webext-storage-adapter";
import writableDerived from "svelte-writable-derived";

var {stores, ready} = webextStorageAdapter({
	"key": `{"storedAsJson":true}`,
})
exportedStores = Object.assign({}, stores, {
	"key": writableDerived(
		stores.key,
		(json) => JSON.parse(json),
		(data) => JSON.stringify(data)
	),
});
export { exportedStores as stores, ready, exportedStores as default };
```

## Browser compatibility

This package officially supports Firefox and Chrome. Other browsers with the `chrome.storage` and `chrome.runtime` APIs aren't tested, but bug reports and pull requests for them are welcome.

If you don't use `webextStorageAdapter(null)`, support for ECMAScript 6th Edition is required, but transpilers and polyfills may be used. If you *do* use `webextStorageAdapter(null)`, support for [`WeakRef`](https://caniuse.com/mdn-javascript_builtins_weakref) and [`FinalizationRegistry`](https://caniuse.com/mdn-javascript_builtins_finalizationregistry) are required, and transpilers/polyfills are *not* supported.

# 💖 Support the developer

I muchly appreciate any way you'd like to show your thanks - knowing people are helped gives me warm fuzzies and makes it all worthwhile!

## 💸 ... with money

You can make a one-time donation or become an ongoing sponsor at [my Sponsus page](https://sponsus.org/u/pixievoltno1), and sponsors can ask me to prioritize development of this package.

## 💌 ... with kind words

Current contact info is on [this page](https://pixievoltno1.com/contact/) - or you can create an "issue" on this repo just to say thanks! Thank-you "issues" will be closed right away, but are treasured regardless~

## 🤝 ... with a job

[I have a Developer Story on Stack Overflow!](https://stackoverflow.com/users/story/707043)