## 3.0.2 (April 3, 2024)

- Fixed calling `onWrite` repeatedly with the same function only subscribing once
- Now supports Svelte 5 (-next.94 and later)

In Svelte 5, this package does not use runes and continues to use the original writable store interface, which is not deprecated. I may release a separate package that uses runes.

## 3.0.1 (June🏳‍🌈 14, 2023)

- When using a 3rd-party `StorageArea`, the callbacks this package sends to it no longer throw if `chrome` or `chrome.runtime` are missing. This makes the package usable outside a WebExtension.
- Updated `storageArea`'s JSDocs
- Marked as compatible with Svelte 4.0.0-next.1 and up

## 3.0.0 (February 21, 2023)

- Breaking change: The signature of `webextStorageAdapter` is now `(storageArea, keys, {live})`. `onSetError` has been superceded by `onWrite` below.
- Breaking change: Required ECMAScript support increased from 6th Edition to 2020 Edition (Chrome 80+ or Firefox 74+)
- Breaking change: The default `live: true` option now requires support for [`StorageArea.onChanged`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/onChanged) (Chrome 73+ or Firefox 101+)
- Added: `storageArea` can now be a string, which is used to look up the object in `chrome.storage`.
- Added: Use the [`onWrite`](./README.md#property-onwrite) method for store groups to get notified when StorageArea.set calls start, finish, or fail.
- Changed: Setting a store to the primitive value it already had no longer re-saves that value to storage

If this update was useful for you, consider [sending a tip!](./README.md#--with-money)

<details><summary>Changes from 3.0.0 Beta 1 (published as `@next` February 4, 2023)</summary>

- Changed: Throw with a more useful error message if the first parameter is `undefined` or an incorrect string

</details>

Example migrations:

```javascript
/* v2.0 */
let storeGroup = webextStorageAdapter(keys, {
	storageArea: chrome.storage.local,
	live: false,
});
/* v3.0 */
let storeGroup = webextStorageAdapter("local", keys, {live: false});

/* v2.0 */ let storeGroup = webextStorageAdapter(keys);
/* v3.0 */ let storeGroup = webextStorageAdapter("sync", keys);

/* v2.0 */
let storeGroup = webextStorageAdapter(keys, {onSetError: myErrorHandler});
/* v3.0 */
let storeGroup = webextStorageAdapter("sync", keys);
storeGroup.onWrite( (write) => {
	write.catch( ({error, setItems}) => myErrorHandler(error, setItems) );
} );
/* Alternate v3.0 */
// The error will still be logged unless you call event.preventDefault()
let storeGroup = webextStorageAdapter("sync", keys);
window.addEventHandler("unhandledrejection", (event) => {
	if ("setItems" in event.reason) {
		let {error, setItems} = event.reason;
		myErrorHandler(error, setItems);
	}
});
```

## 2.0.2 (November 24, 2022)

- Fixed `onSetError` not receiving the correct `setItems` object ([#15](https://github.com/PixievoltNo1/svelte-webext-storage-adapter/issues/15))

## 2.0.1 (November 20, 2021)

No behavioral changes.

- Deleted the now-dead link about "invalid stores" from the readme's table of contents

## 2.0.0 (November 20, 2021)

- Breaking change: Using `webextStorageAdapter(null)` now requires support for [`WeakRef`](https://caniuse.com/mdn-javascript_builtins_weakref) and [`FinalizationRegistry`](https://caniuse.com/mdn-javascript_builtins_finalizationregistry)
- Improved: There is no longer any such thing as an "invalid store". A store's methods will not by themselves throw an error, regardless of circumstances.
- Breaking change: Using the default `live: true` option with a 3rd-party `storageArea` that doesn't support it now throws an error. To continue using such an area, specify `live: false` in the options.
- JSDocs now use Markdown \[links] instead of JSDoc {@link}s, working around VSCode bugs with the latter

## 1.0.3 (November 22, 2020)

No behavioral changes.

- Added repository, exports, & sideEffects fields to package.json

## 1.0.2 (August 16, 2020)

No behavioral changes.

- Fixed an erroneously-placed link in the JSDocs for store group objects.

## 1.0.1 (July 24, 2020)

No behavioral changes.

- JSDocs added. TypeScript can get type info from JSDocs, so TypeScript is now partially supported!
- Readme's section on `svelte-writable-derived` has been updated to use v2's API.

## 1.0.0 (June 2, 2019)

- Initial release