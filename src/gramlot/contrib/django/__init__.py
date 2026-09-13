"""Optional Django hosting and ORM helpers: install ``gramlot[django]``."""
from .application import DjangoPageCollection
from .page import DjangoPage, selection_result

__all__ = ['DjangoPage', 'DjangoPageCollection', 'selection_result']
