"""Whole-store exclusion, snapshots, failures and async cancellation."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from threading import Event, Lock
from time import sleep

import pytest
from genro_bag import Bag

from gramlot.store import ExclusiveBagStore


def _bag(value=0):
    bag = Bag()
    bag.set_item('value', value)
    return bag


def test_readers_and_writers_are_exclusive_and_increment_exactly():
    store = ExclusiveBagStore()
    store.run(lambda data: data.__setitem__('counter', _bag()))
    state_lock = Lock()
    active = 0
    overlap = False

    def increment(data):
        nonlocal active, overlap
        with state_lock:
            active += 1
            overlap = overlap or active != 1
        value = data['counter'].get_item('value')
        sleep(0.001)
        data['counter'].set_item('value', value + 1)
        with state_lock:
            active -= 1

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: store.run(increment), range(40)))
    assert overlap is False
    assert store.snapshot()['counter'].get_item('value') == 40


def test_exception_releases_without_promising_rollback_and_results_are_detached():
    store = ExclusiveBagStore()
    inserted = _bag(0)
    store.run(lambda data: data.__setitem__('input', inserted))
    inserted.set_item('value', 88)
    assert store.snapshot()['input'].get_item('value') == 0

    nested = _bag(2)
    def insert_nested(data):
        data['input'].set_item('nested', nested)

    store.run(insert_nested)
    nested.set_item('value', 77)
    assert store.snapshot()['input'].get_item('nested.value') == 2

    def fails(data):
        data['record'] = _bag(1)
        raise RuntimeError('failure after mutation')

    with pytest.raises(RuntimeError, match='after mutation'):
        store.run(fails)
    result = store.run(lambda data: data['record'])
    result.set_item('value', 99)
    assert store.snapshot()['record'].get_item('value') == 1
    detached_node = store.run(lambda data: data['record'].get_node('value'))
    detached_node.set_value(42)
    assert store.snapshot()['record'].get_item('value') == 1
    lease = None
    retained_bag = None
    with store.acquire() as current:
        lease = current
        retained_bag = current['record']
    with pytest.raises(RuntimeError, match='owning thread'):
        len(lease)
    with pytest.raises(RuntimeError, match='owning thread'):
        retained_bag.get_item('value')


@pytest.mark.asyncio
async def test_cancellation_waits_for_worker_release_before_next_owner():
    store = ExclusiveBagStore()
    entered = Event()
    release = Event()
    competitor_entered = Event()

    def slow(data):
        data['record'] = _bag(1)
        entered.set()
        release.wait(2)

    owner = asyncio.create_task(store.run_async(slow))
    await asyncio.to_thread(entered.wait, 1)
    owner.cancel()
    competitor = asyncio.create_task(store.run_async(lambda data: competitor_entered.set()))
    await asyncio.sleep(0.03)
    assert not owner.done()
    assert not competitor_entered.is_set()
    release.set()
    with pytest.raises(asyncio.CancelledError):
        await owner
    await competitor
    assert competitor_entered.is_set()


@pytest.mark.asyncio
async def test_cancellation_wins_after_consuming_worker_failure():
    store = ExclusiveBagStore()
    entered = Event()
    release = Event()

    def fails(_data):
        entered.set()
        release.wait(2)
        raise RuntimeError('worker failed after cancellation')

    owner = asyncio.create_task(store.run_async(fails))
    await asyncio.to_thread(entered.wait, 1)
    owner.cancel()
    release.set()
    with pytest.raises(asyncio.CancelledError):
        await owner
