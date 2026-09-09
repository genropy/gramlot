// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Actual developer tools belonging to one page, never a global registry. */
export class DeveloperTools {
    constructor() {
        this.inspector = null;
        this.playground = null;
        this.disposed = false;
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.inspector?.dispose();
        this.playground?.dispose();
    }
}
