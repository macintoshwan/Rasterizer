"""
Unit tests for the Rasterizer class.
"""

import numpy as np
import pytest
from rasterizer import Rasterizer


class TestRasterizer:
    """Test cases for the Rasterizer class."""
    
    def test_initialization(self):
        """Test Rasterizer initialization."""
        rasterizer = Rasterizer(width=256, height=256, resolution=1.0)
        assert rasterizer.width == 256
        assert rasterizer.height == 256
        assert rasterizer.resolution == 1.0
    
    def test_rasterize_points_shape(self):
        """Test that rasterize_points returns correct shape."""
        rasterizer = Rasterizer(width=128, height=128)
        points = np.array([[10, 20], [30, 40]])
        result = rasterizer.rasterize_points(points, radius=2.0)
        
        assert result.shape == (128, 128)
        assert result.dtype == np.float32
    
    def test_rasterize_points_output(self):
        """Test that rasterize_points produces non-zero output."""
        rasterizer = Rasterizer(width=100, height=100)
        points = np.array([[25, 25], [50, 50], [75, 75]])
        result = rasterizer.rasterize_points(points, radius=3.0)
        
        # Should have some non-zero values
        assert np.sum(result > 0) > 0
        # Values should be in [0, 1] range
        assert np.all(result >= 0) and np.all(result <= 1)
    
    def test_rasterize_points_empty(self):
        """Test rasterize_points with empty input."""
        rasterizer = Rasterizer(width=100, height=100)
        points = np.array([]).reshape(0, 2)
        result = rasterizer.rasterize_points(points)
        
        assert result.shape == (100, 100)
        assert np.sum(result) == 0
    
    def test_rasterize_lines_shape(self):
        """Test that rasterize_lines returns correct shape."""
        rasterizer = Rasterizer(width=128, height=128)
        lines = [(np.array([0, 0]), np.array([50, 50]))]
        result = rasterizer.rasterize_lines(lines, thickness=1.0)
        
        assert result.shape == (128, 128)
        assert result.dtype == np.float32
    
    def test_rasterize_polygon_shape(self):
        """Test that rasterize_polygon returns correct shape."""
        rasterizer = Rasterizer(width=128, height=128)
        vertices = np.array([[10, 10], [50, 10], [50, 50], [10, 50]])
        result = rasterizer.rasterize_polygon(vertices)
        
        assert result.shape == (128, 128)
        assert result.dtype == np.float32
    
    def test_rasterize_polygon_output(self):
        """Test that rasterize_polygon produces filled polygon."""
        rasterizer = Rasterizer(width=100, height=100)
        vertices = np.array([[20, 20], [80, 20], [80, 80], [20, 80]])
        result = rasterizer.rasterize_polygon(vertices)
        
        # Polygon should have significant area filled
        assert np.sum(result > 0) > 100
    
    def test_batch_rasterize(self):
        """Test batch rasterization of mixed data."""
        rasterizer = Rasterizer(width=100, height=100)
        
        data_list = [
            {'type': 'points', 'data': np.array([[25, 25], [75, 75]]), 'radius': 2.0},
            {'type': 'polygon', 'data': np.array([[10, 10], [30, 10], [30, 30], [10, 30]])},
        ]
        
        result = rasterizer.batch_rasterize(data_list)
        
        assert result.shape == (2, 100, 100)
        assert result.dtype == np.float32
        # Both images should have some content
        assert np.sum(result[0] > 0) > 0
        assert np.sum(result[1] > 0) > 0
    
    def test_batch_rasterize_empty(self):
        """Test batch rasterization with empty list."""
        rasterizer = Rasterizer(width=100, height=100)
        result = rasterizer.batch_rasterize([])
        
        assert result.shape == (0, 100, 100)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
