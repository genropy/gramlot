#!/usr/bin/env python
"""Run this example with the project's normal Django management commands."""
import os
import sys
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gramlot_demo.settings')
    execute_from_command_line(sys.argv)
