"""Compile the Python page to portable Gramlot Source; no server is required."""
from pathlib import Path
from gramlot.builder import GramlotBuilder
from gramlot.examples import example_panel
from gramlot.transport import to_tytx
from page import Page

builder = GramlotBuilder('api')
Page().main(example_panel(builder.root, Path(__file__).with_name('page.py').read_text(), 'OpenAPI Explorer'))
Path(__file__).with_name('page.tytx').write_text(to_tytx(builder.source))
