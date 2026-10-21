# Homepage asset versions

Before committing a homepage release, run `python3 scripts/version_homepage_assets.py`, then `python3 scripts/version_homepage_assets.py --check`. Commit the updated references together with the source changes. The command is deterministic and uses only Python's standard library.

The two homepage HTML entries and their first-party JavaScript import graph use SHA-256 content versions. A dependency change propagates through its importing modules to the entry URL. CSS and directly loaded scripts receive their own content versions. Vendored Three.js and image/bake assets remain unchanged; this avoids loading two Three.js module identities or invalidating large unchanged assets.

Versioned resource URLs prevent a refreshed HTML entry from reusing the previous unversioned scripts. They cannot update an already-open page or force a browser/CDN to fetch a newer HTML document. No cache policy or third-party settings are changed.
