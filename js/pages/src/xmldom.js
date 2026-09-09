// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Browser shim for @xmldom/xmldom. genro-bag-js imports DOMParser from
// it statically for its Node-side XML parsing path; in the browser the
// native DOMParser is used instead, so this stub is never invoked.
export class DOMParser {}
