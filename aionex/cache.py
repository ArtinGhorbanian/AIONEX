"""Small bounded in-memory primitives used by the single-process app."""

from __future__ import annotations

import time
from collections import OrderedDict, deque
from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _CacheItem(Generic[T]):
    expires_at: float
    value: T


class TTLCache(Generic[T]):
    """Thread-safe TTL/LRU cache with a fixed item limit."""

    def __init__(
        self,
        ttl_seconds: int = 300,
        max_items: int = 256,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._ttl = max(0, ttl_seconds)
        self._max_items = max(1, max_items)
        self._clock = clock
        self._items: OrderedDict[str, _CacheItem[T]] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> T | None:
        now = self._clock()
        with self._lock:
            item = self._items.get(key)
            if item is None:
                return None
            if item.expires_at <= now:
                del self._items[key]
                return None
            self._items.move_to_end(key)
            return item.value

    def set(self, key: str, value: T) -> None:
        if self._ttl == 0:
            return
        with self._lock:
            self._items[key] = _CacheItem(self._clock() + self._ttl, value)
            self._items.move_to_end(key)
            while len(self._items) > self._max_items:
                self._items.popitem(last=False)


class SlidingWindowRateLimiter:
    """Per-process, per-key limiter suitable for a local/single-instance app."""

    def __init__(
        self,
        limit: int,
        window_seconds: int = 60,
        max_keys: int = 2_000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._limit = max(1, limit)
        self._window = max(1, window_seconds)
        self._max_keys = max(10, max_keys)
        self._clock = clock
        self._events: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        now = self._clock()
        cutoff = now - self._window
        with self._lock:
            events = self._events.setdefault(key, deque())
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self._limit:
                retry_after = max(1, int(self._window - (now - events[0])))
                self._events.move_to_end(key)
                return False, retry_after
            events.append(now)
            self._events.move_to_end(key)
            while len(self._events) > self._max_keys:
                self._events.popitem(last=False)
            return True, 0
