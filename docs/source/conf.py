"""English user documentation; builds without importing optional server packages."""
from pathlib import Path
import tomllib

project = 'Gramlot'
author = 'Gramlot Team'
copyright = '2026, Softwell S.r.l.'
release = tomllib.loads((Path(__file__).parents[2] / 'pyproject.toml').read_text())['project']['version']
language = 'en'
extensions = []
root_doc = 'index'
exclude_patterns = []
nitpicky = True
html_theme = 'furo'
html_logo = '../../assets/gramlot-logo.png'
html_static_path = ['_static']
html_css_files = ['custom.css']
html_theme_options = {
    'light_css_variables': {
        'color-brand-primary': '#1643c5',
        'color-brand-content': '#1643c5',
        'color-sidebar-background': '#f5f7fc',
    },
    'dark_css_variables': {
        'color-brand-primary': '#ffcc43',
        'color-brand-content': '#8fb2ff',
    },
}
html_title = f'Gramlot {release} documentation'
