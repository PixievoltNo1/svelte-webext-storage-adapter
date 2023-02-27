# `svelte-webext-storage-adapter`
[![npm](https://img.shields.io/npm/v/svelte-webext-storage-adapter.svg)](https://www.npmjs.com/package/svelte-webext-storage-adapter)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/svelte-webext-storage-adapter.svg)](https://bundlephobia.com/result?p=svelte-webext-storage-adapter)
[![GitHub CI Status](https://img.shields.io/github/actions/workflow/status/PixievoltNo1/svelte-webext-storage-adapter/node.js.yml?branch=master&label=tests)](https://github.com/PixievoltNo1/svelte-webext-storage-adapter/actions/workflows/node.js.yml)
[![License](https://img.shields.io/github/license/PixievoltNo1/svelte-webext-storage-adapter.svg)](https://github.com/PixievoltNo1/svelte-webext-storage-adapter/blob/master/LICENSE.txt)
[![GitHub Repo stars](https://img.shields.io/github/stars/PixievoltNo1/svelte-webext-storage-adapter?style=social)](https://github.com/PixievoltNo1/svelte-webext-storage-adapter)

If you're using [Svelte](https://svelte.dev/) v3 to make a [WebExtension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) for Firefox or Chrome, you can use this to create [writable stores](https://svelte.dev/tutorial/writable-stores) that are backed by your extension's storage. Handy features are provided to you right out of the box:

* **Flexible:** This package can work with a part of or the entirety of any area of `chrome.storage`, including areas from 3rd-party packages.
* **Automatic batching:** Save on storage writes when all your store changes are batched up to be sent out at the next Svelte tick.
* **Live updates:** If you'd like, this package will handle listening for storage changes for you, even in 3rd-party area (with their support).

This project has a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in the Git repo or issues tracker, you agree to be as courteous, welcoming, and generally a lovely person as its terms require. 😊

<!-- Table of contents generated mostly by the markdown-toc package - however, it includes emoji in the URLs, and they need to be stripped for GitHub -->
<!-- toc -->

  * [Default export: `webextStorageAdapter()`](#default-export-webextstorageadapter)
    + [Parameter: `storageArea`](#parameter-storagearea)
    + [Parameter: `keys`](#parameter-keys)
    + [Parameter: `options`](#parameter-options)
      - [`live`](#live)
  * [Store groups](#store-groups)
    + [Property: `stores`](#property-stores)
    + [Property: `ready`](#property-ready)
    + [Property: `onWrite()`](#property-onwrite)
    + [Handling write errors with `unhandledrejection`](#handling-write-errors-with-unhandledrejection)
    + [Property: `unLive()`](#property-unlive)
    + [Methods don't use `this`](#methods-dont-use-this)
  * [Implementation requirements for `StorageArea`](#implementation-requirements-for-storagearea)
  * [Tip: Use with `svelte-writable-derived`](#tip-use-with-svelte-writable-derived)
  * [Browser compatibility](#browser-compatibility)
- [💖 Support the developer](#-support-the-developer)
  * [💸 ... with money](#--with-money)
  * [💌 ... with kind words](#--with-kind-words)
  * [🤝 ... with a job](#--with-a-job)

<!-- tocstop -->

## Default export: `webextStorageAdapter()`

<i>Parameters: [`storageArea`](#parameter-storagearea) (string or `StorageArea`), [`keys`](#parameter-keys) (string, array, object, or `null`), optional [`options`](#parameter-options) (object)</i><br>
<i>Returns a [store group](#store-groups)</i>

Creates a group of Svelte v3 [writable stores](https://svelte.dev/tutorial/writable-stores), populated from & persisted to `chrome.storage`. It will immediately request the needed values; this is asynchronous, but the store group will be returned synchronously with all stores in place. You can use [the store group's `ready` promise](#property-ready) to determine when values from storage are available.

```javascript
// Example

import webextStorageAdapter from "svelte-webext-storage-adapter";
var storeGroup = webextStorageAdapter("sync", ["thisKey", "thatKey"]);
storeGroup.ready.then( () => {
	// You can now interact with data in storage
} );
```

### Parameter: `storageArea`

<i>string or [`StorageArea`](https://developer.chrome.com/extensions/storage#type-StorageArea)</i>

The object that will be read from and written to. If it's a string, it's used to look up the object from `chrome.storage`. Objects from outside `chrome.storage` may be used if they meet the [implementation requirements](#implementation-requirements-for-storagearea).

```javascript
// Example: These are equivalent
var group1 = webextStorageAdapter(chrome.storage.local, null);
var group2 = webextStorageAdapter("local", null);
```

### Parameter: `keys`

<i>string, array, object, or `null`</i>

This can be any of the same values accepted by [`StorageArea.get`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get). Using `null` will allow the store group to read and write any key in storage. Unlike `StorageArea.get`, default values specified in the object form will survive the round trip regardless of type.

```javascript
// Example: Specifying keys with default values
var storeGroup = webextStorageAdapter("sync", {
	i: "he",
	you: "me",
	we: "all together",
});
storeGroup.stores.we.subscribe(console.log); // logs "all together"
```

### Parameter: `options`

<i>object</i>

This parameter and all its properties are optional. There is currently only one option; more may be added later.

#### `live`

<i>boolean</i><br>
<i>Default: `true`</i>

If `true`, `webextStorageAdapter` will listen for changes to `storageArea` and propagate them to the stores. If a key is deleted from storage, this will set the key's corresponding store to its default value if one was specified in the `keys` parameter, or `undefined` otherwise.

This will prevent the store group from being garbage-collected. If this is a concern, you can call the group's [`unLive` method](#property-unlive) when you're done with it.

This throws an error if used with a 3rd-party area that doesn't support it.

```javascript
// Example

// In your extension's tab page / browser action popup / etc.
import webextStorageAdapter from "svelte-webext-storage-adapter";
// The live option defaults to true, but we explicitly set it here for demonstration purposes
var storeGroup = webextStorageAdapter("sync", "noise", {live: true});
storeGroup.stores.noise.subscribe( (value) => console.log(value) );
chrome.runtime.sendMessage("Sound the alarm!");

// In your extension's background page
chrome.runtime.onMessage.addListener( (message) => {
	if (message == "Sound the alarm!") {
		chrome.storage.sync.set({noise: "awooga"}); // The above script will eventually log "awooga"
	}
} );
```

## Store groups

<i>Object</i>

Store groups are returned synchronously from [`webextStorageAdapter`](#default-export-webextstorageadapter).

### Property: `stores`

<i>Object (prototype: `null`)</i>

This has a property for every key specified in [`keys`](#parameter-keys), and each property's value is a Svelte writable store containing the corresponding value in [`storageArea`](#parameter-storagearea). If `keys` was `null`, then `stores` is a `Proxy` that allows getting *any* property to obtain a usable store, but operations such as `Object.keys()`, `for...in`, etc. will only expose keys that are known to have values.

New values introduced via the stores' `set` and `update` methods are batched up into a single `storageArea.set()` call that happens when [Svelte's `tick()`](https://svelte.dev/docs#tick) resolves. The stores themselves will have their new values immediately.

To help avoid bugs in your code, directly setting any property of `stores` is disallowed, and will throw an error in strict mode. Remember to use `stores.example.set(value)` instead of `stores.example = value`!

```javascript
// Example

import webextStorageAdapter from "svelte-webext-storage-adapter";
var storeGroup = webextStorageAdapter("sync", null);
// Since storeGroup.ready hasn't resolved yet, no data will be loaded...
console.log( Object.keys(storeGroup.stores) ); // []
// ... but we can set data and have it sent to extension storage anyways
storeGroup.stores.tooBad.set("Waluigi time");
console.log( Object.keys(storeGroup.stores) ); // ["tooBad"]

// For non-null keys parameters, the specified keys are always present
var storeGroup2 = webextStorageAdapter("sync", ["thing1", "thing2"]);
console.log( Object.keys(storeGroup2.stores) ); // ["thing1", "thing2"]
```

### Property: `ready`

<i>`Promise`</i>

Resolves with `true` after all stores have been set to values received from the initial `storageArea.get` call, or rejects with a reported error object.

```javascript
// Example

// In a Svelte component's <script> block
import webextStorageAdapter from "svelte-webext-storage-adapter";
var { stores, ready, unLive } = webextStorageAdapter("sync", null);
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

### Property: `onWrite()`

<i>Parameter: `subscriber` (function with signature `(write, setItems)`)</i><br>
<i>Returns a function</i>

Functions passed to this method are subscribed to be called when data starts getting written to storage. The return value can be called to unsubscribe the subscriber. Subscribers are called with two parameters:

- `write` is a `Promise` that resolves with `true` when the write is finished, or rejects with an object if there's an error. The rejection object has properties `error` with the error reported from `chrome.runtime.lastError`, and `setItems` which is the same as below.
- `setItems` is an object of key/value pairs, the same one passed to [`storageArea.set`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set).

```javascript
// Example: Save indicator
/* Save indicators usually aren't needed for WebExtensions, as you're typically
saving small amounts of data to a local device. */

// In a Svelte component's <script> block
import { onDestroy } from "svelte";
var activeWriteCount = 0;
var unsubscribe = storeGroup.onWrite( (write) => {
	activeWriteCount += 1;
	write.finally( () => { activeWriteCount -= 1; } );
} );
onDestroy(unsubscribe);
```
```html
<!-- In the same component's markup -->
{#if activeWriteCount}
	<Throbber/>
{/if}
```

### Handling write errors with `unhandledrejection`

The `write` promise described above is created whether or not `onWrite` has subscribers. If no subscriber adds a rejection handler to it, a storage write error causes an [`unhandledrejection` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event). If this event also has no handlers, or none of them call `event.preventDefault()`, the rejection is logged to the browser console.

```javascript
// Example

window.addEventHandler("unhandledrejection", (event) => {
	if ("setItems" in event.reason) {
		let {error, setItems} = event.reason;
		reportProblem(error);
		markUnsaved(Object.keys(setItems));
	}
});
```

### Property: `unLive()`

<i>No parameters</i>

Reverses the effects of the [`live: true` option](#live) so that the store group can be garbage-collected.

```javascript
// Example

// In a Svelte component's <script> block
import webextStorageAdapter from "svelte-webext-storage-adapter";
import { onDestroy } from "svelte";

var { stores, ready, unLive } = webextStorageAdapter("sync", "myKey");
onDestroy( unLive );
```

### Methods don't use `this`

The `onWrite` and `unLive` methods of store groups don't use `this`, and may be freely assigned to other variables or properties without breaking their connection to their original store group.

```javascript
// Example

var stores = webextStorageAdapter("sync", "myKey");
var { unLive } = stores;
// These do the same thing
stores.unLive();
unLive();
```

## Implementation requirements for `StorageArea`

Any object you pass in via the [`storageArea` parameter](#parameter-storagearea) will work if it implements the following interface:

- [`get` method](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/get)
- [`set` method](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set)
- [`onChanged` object](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/onChanged) (only if [`live`](#live) is `true`)
	- `addListener` method
	- `removeListener` method (only if [`unLive`](#property-unlive) is used)

`get` and `set` must accept callbacks; any returned Promise will not be used. They may indicate errors either by setting `chrome.runtime.lastError` (⚠ but they need to delete it afterwards), or by passing an extra parameter to the callbacks.

## Tip: Use with `svelte-writable-derived`

<i>Full disclosure: I, Pixievolt, am the author of `svelte-writable-derived`. If you find this tip helpful, now you have </i>two<i> reasons to <a href="#-support-the-developer">support me!</a></i>

Chrome's implementation of `chrome.storage` can't safely store anything besides booleans, numbers, strings, and arrays. If you need something more complex, you can use the [`svelte-writable-derived`](https://www.npmjs.com/package/svelte-writable-derived) package to translate your data to & from its storage-safe form.

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

This package officially supports Firefox and Chrome. Other browsers that support WebExtensions aren't tested, but bug reports and pull requests for them are welcome. Firefox version 101+ and Chrome version 84+ support all additional requirements listed below.

Support for ECMAScript 2020 is required (see [caniuse data for optional chaining](https://caniuse.com/mdn-javascript_operators_optional_chaining)). Transpilers & polyfills are supported provided [`keys`](#parameter-keys) is not `null`.

If `keys` is `null`, support for [`WeakRef`](https://caniuse.com/mdn-javascript_builtins_weakref) is additionally required.

If [`live`](#live) is `true`, support for [`StorageArea.onChanged`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/onChanged#browser_compatibility) is additionally required. A polyfill may be used.

# 💖 Support the developer

I muchly appreciate any way you'd like to show your thanks - knowing people are helped gives me warm fuzzies and makes it all worthwhile!

## 💸 ... with money

At [my Ko-Fi page](https://ko-fi.com/pixievoltno1), you can make a one-time or monthly donation, or [commission work on an issue](https://ko-fi.com/pixievoltno1/commissions).

## 💌 ... with kind words

Current contact info is on [this page](https://pixievoltno1.com/contact/) - or you can create an "issue" on this repo just to say thanks! Thank-you "issues" will be closed right away, but are treasured regardless~

## 🤝 ... with a job

[I have a Developer Story on Stack Overflow!](https://stackoverflow.com/users/story/707043)