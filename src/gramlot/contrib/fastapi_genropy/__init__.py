"""Optional FastAPI–GenroPy integration; importing it does not import GenroPy."""

from .application import (
    GenropyPage,
    GenropyPageCollection,
    create_genropy_application,
    legacy_to_gramlot,
    mount_genropy,
)

__all__ = [
    "GenropyPage", "GenropyPageCollection", "create_genropy_application",
    "legacy_to_gramlot", "mount_genropy",
]
