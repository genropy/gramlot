# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Experimental process-local store with whole-operation exclusive ownership."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator, MutableMapping
from contextlib import contextmanager
from copy import deepcopy
from threading import RLock, get_ident
from typing import Any, TypeVar

from genro_bag import Bag


T = TypeVar("T")


class _LeasedObject:
    """Guard a mutable Bag implementation object that cannot be copied safely."""

    __slots__ = ("_lease", "_value")

    def __init__(self, lease: "StoreLease", value: Any):
        self._lease = lease
        self._value = value

    def __getattr__(self, name: str):
        self._lease._check()
        member = getattr(self._value, name)
        if not callable(member):
            return self._lease._guard(member)

        def call(*args, **kwargs):
            self._lease._check()
            result = member(
                *(self._lease._unwrap(value) for value in args),
                **{key: self._lease._unwrap(value) for key, value in kwargs.items()},
            )
            return self._lease._guard(result)
        return call


class _LeasedBag:
    """Guard every access to one store-owned Bag with its active lease."""

    __slots__ = ("_lease", "_bag")

    def __init__(self, lease: "StoreLease", bag: Bag):
        self._lease = lease
        self._bag = bag

    def __getattr__(self, name: str):
        self._lease._check()
        member = getattr(self._bag, name)
        if not callable(member):
            return deepcopy(member)

        def call(*args, **kwargs):
            self._lease._check()
            result = member(
                *(self._lease._unwrap(value) for value in args),
                **{key: self._lease._unwrap(value) for key, value in kwargs.items()},
            )
            return self._lease._guard(result)
        return call

    def __getitem__(self, key):
        self._lease._check()
        return self._lease._guard(self._bag[key])

    def __setitem__(self, key, value):
        self._lease._check()
        self._bag[key] = self._lease._unwrap(value)


class StoreLease(MutableMapping[str, Bag]):
    """A dictionary-of-Bags view valid only during its owning operation."""

    def __init__(self, data: dict[str, Bag], owner: int):
        self._data = data
        self._owner = owner
        self._active = True

    def _check(self) -> None:
        if not self._active or get_ident() != self._owner:
            raise RuntimeError("Store lease is usable only by its owning thread")

    def close(self) -> None:
        self._active = False

    def _guard(self, value: Any):
        if isinstance(value, Bag):
            return _LeasedBag(self, value)
        # BagNode and other mutable implementation objects must not escape.
        if not isinstance(value, (str, bytes, int, float, bool, type(None))):
            try:
                return deepcopy(value)
            except (AttributeError, TypeError):
                return _LeasedObject(self, value)
        return value

    @staticmethod
    def _unwrap(value: Any):
        # Store-owned proxies may stay live within this lease. Every other
        # mutable input is detached so caller-owned objects cannot become aliases.
        if isinstance(value, _LeasedBag):
            return value._bag
        if isinstance(value, _LeasedObject):
            return value._value
        return deepcopy(value)

    def detach(self, value: T) -> T:
        """Detach a supported operation result while ownership is active."""
        self._check()
        if isinstance(value, _LeasedBag):
            return deepcopy(value._bag)
        if isinstance(value, _LeasedObject):
            raise TypeError("Store operations cannot return live Bag implementation objects")
        if isinstance(value, dict):
            return {deepcopy(key): self.detach(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self.detach(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self.detach(item) for item in value)
        return deepcopy(value)

    def __getitem__(self, key: str) -> _LeasedBag:
        self._check()
        return _LeasedBag(self, self._data[key])

    def __setitem__(self, key: str, value: Bag) -> None:
        self._check()
        if not isinstance(key, str) or not key:
            raise TypeError("Store keys must be nonempty strings")
        if not isinstance(value, Bag):
            raise TypeError("Store values must be Bags")
        self._data[key] = deepcopy(value)

    def __delitem__(self, key: str) -> None:
        self._check()
        del self._data[key]

    def __iter__(self) -> Iterator[str]:
        self._check()
        return iter(tuple(self._data))

    def __len__(self) -> int:
        self._check()
        return len(self._data)


class ExclusiveBagStore:
    """Own a process-local dictionary of Bags for one thread at a time.

    ``run`` snapshots its return value before releasing ownership, preventing the
    supported API from returning a live shared Bag. An exception releases the
    lock but deliberately does not roll back mutations already made.
    """

    def __init__(self):
        self._data: dict[str, Bag] = {}
        self._lock = RLock()

    @contextmanager
    def acquire(self) -> Iterator[StoreLease]:
        """Acquire the whole store; nested use by the same thread is supported."""
        with self._lock:
            lease = StoreLease(self._data, get_ident())
            try:
                yield lease
            finally:
                lease.close()

    def run(self, operation: Callable[[StoreLease], T]) -> T:
        """Run one complete operation and detach its result before release."""
        with self.acquire() as lease:
            return lease.detach(operation(lease))

    async def run_async(self, operation: Callable[[StoreLease], T]) -> T:
        """Run lock acquisition, work and release in one worker thread.

        Cancellation waits for that worker to finish. It can stop the caller from
        receiving a result, but it cannot release ownership while code still runs.
        """
        worker = asyncio.create_task(asyncio.to_thread(self.run, operation))
        cancelled = False
        while not worker.done():
            try:
                await asyncio.wait({worker})
            except asyncio.CancelledError:
                cancelled = True
                continue
        if cancelled:
            # Cancellation wins for the caller after the worker releases. Read a
            # worker failure so asyncio never reports an unobserved exception.
            if not worker.cancelled():
                worker.exception()
            raise asyncio.CancelledError
        return worker.result()

    def snapshot(self) -> dict[str, Bag]:
        """Return a detached snapshot taken under exclusive ownership."""
        return self.run(lambda data: dict(data))


__all__ = ["ExclusiveBagStore", "StoreLease"]
