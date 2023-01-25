## Unpublished

- Breaking change: Required ECMAScript support increased from 6th Edition to 2020 Edition (Chrome 80+ or Firefox 74+)
- Breaking change: The default `live: true` option now requires support for [`StorageArea.onChanged`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/onChanged) (Firefox 101+)
- Changed: Setting a store to the primitive value it already had no longer re-saves that value to storage

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