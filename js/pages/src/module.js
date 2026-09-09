// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Resolve TYTX's known lazy requires against the same browser ESM modules.
// No codec is implemented here. Other optional Node packages stay unavailable.
import * as msgpack from '@msgpack/msgpack';
import * as tytxMsgpack from '/_assets/tytx/msgpack.js';

export function createRequire() {
    return (name) => {
        if (name === '@msgpack/msgpack') { return msgpack; }
        if (name === './msgpack.js') { return tytxMsgpack; }
        throw new Error(`Optional Node module unavailable in browser: ${name}`);
    };
}
