import * as msgpack from '@msgpack/msgpack';
import * as tytxMsgpack from 'genro-tytx/msgpack.js';

export function createRequire() {
  return name => {
    if (name === '@msgpack/msgpack') return msgpack;
    if (name === './msgpack.js') return tytxMsgpack;
    throw Error(`Unsupported optional module: ${name}`);
  };
}
