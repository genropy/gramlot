"""Compile the Python page to portable Gramlot Source; no server is required."""
from pathlib import Path
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx
from page import Page

builder = GramlotBuilder('api')
Page().main(builder.root)
Path(__file__).with_name('page.tytx').write_text(to_tytx(builder.source))
