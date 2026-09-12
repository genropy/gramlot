# Standalone IndexedDB probe

Tested 2026-09-11 with installed Google Chrome 152.0.7977.83 on macOS, via
Playwright headless with a separate persistent temporary profile. No HTTP server
or remote dependencies were used. This tests IndexedDB, not Gramlot integration.

| Operation | Result |
| --- | --- |
| Write structured data from file:// HTML | Passed |
| Reload and read | Same data |
| Close browser, reopen with same profile and read | Same data |
| Open a copied HTML at a different filename, same database name | Same data |

The copied file was in the same directory. Moving directories, a different
browser/profile, headed manual operation and browser-data eviction were not
tested. Namespace database names by application identity; filenames did not
isolate the database in this test. An application ID is not a security boundary.

Safari WebDriver could not create a session because Allow remote automation is
not enabled in Safari settings. No Safari persistence conclusion is available;
settings were not changed.

`probe.html` exposes `await probe(value)` to write/read and `await probe()` to
read, from the developer console. It uses database `gramlot-standalone-probe`,
object store `data`, key `sample`. After writing, close/reopen the HTML and read.
The test data is outside the HTML, stored in the browser profile.
