"""
Rasterizer - A library for rasterizing vector data for machine learning training.

This library provides an easy-to-use API for converting vector/geometric data
into raster format suitable for training machine learning models.
"""

__version__ = "0.1.0"
__author__ = "macintoshwan"

from .rasterizer import Rasterizer
from .trainer import Trainer

__all__ = ["Rasterizer", "Trainer"]
