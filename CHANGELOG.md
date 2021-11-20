## Unreleased (will be 2.0.0)

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