"""
Core Rasterizer class for converting vector data to raster format.
"""

import numpy as np
from typing import Tuple, Optional, Union, List

# Epsilon value for floating-point comparisons
EPSILON = 1e-8


class Rasterizer:
    """
    A class for rasterizing vector data into grid-based representations.
    
    This class provides methods to convert various types of vector data
    (points, lines, polygons) into raster format suitable for machine learning.
    
    Attributes:
        width (int): Width of the raster output
        height (int): Height of the raster output
        resolution (float): Resolution/scale factor for rasterization
    """
    
    def __init__(self, width: int = 256, height: int = 256, resolution: float = 1.0):
        """
        Initialize the Rasterizer.
        
        Args:
            width: Width of the output raster in pixels
            height: Height of the output raster in pixels
            resolution: Resolution/scale factor (higher = more detail)
        """
        self.width = width
        self.height = height
        self.resolution = resolution
        
    def rasterize_points(self, points: np.ndarray, radius: float = 1.0) -> np.ndarray:
        """
        Rasterize a set of 2D points onto a grid.
        
        Args:
            points: Array of shape (N, 2) containing x, y coordinates
            radius: Radius of each point in pixels
            
        Returns:
            np.ndarray: Rasterized image of shape (height, width)
        """
        raster = np.zeros((self.height, self.width), dtype=np.float32)
        
        # Normalize points to image dimensions
        points_normalized = points.copy()
        if len(points) > 0:
            # Scale to image size
            x_min, x_max = points[:, 0].min(), points[:, 0].max()
            y_min, y_max = points[:, 1].min(), points[:, 1].max()
            
            # Handle case where all points have same coordinate
            if x_max - x_min > EPSILON:
                points_normalized[:, 0] = (points[:, 0] - x_min) / (x_max - x_min) * (self.width - 1)
            else:
                points_normalized[:, 0] = self.width // 2
            
            if y_max - y_min > EPSILON:
                points_normalized[:, 1] = (points[:, 1] - y_min) / (y_max - y_min) * (self.height - 1)
            else:
                points_normalized[:, 1] = self.height // 2
        
        # Draw points
        for x, y in points_normalized:
            x_int, y_int = int(x), int(y)
            for dy in range(-int(radius), int(radius) + 1):
                for dx in range(-int(radius), int(radius) + 1):
                    if dx*dx + dy*dy <= radius*radius:
                        nx, ny = x_int + dx, y_int + dy
                        if 0 <= nx < self.width and 0 <= ny < self.height:
                            raster[ny, nx] = 1.0
                            
        return raster
    
    def rasterize_lines(self, lines: List[Tuple[np.ndarray, np.ndarray]], 
                        thickness: float = 1.0) -> np.ndarray:
        """
        Rasterize a set of line segments.
        
        Args:
            lines: List of tuples (start_point, end_point) where each point is (x, y)
            thickness: Thickness of lines in pixels
            
        Returns:
            np.ndarray: Rasterized image of shape (height, width)
        """
        raster = np.zeros((self.height, self.width), dtype=np.float32)
        
        for start, end in lines:
            # Bresenham's line algorithm
            x0, y0 = int(start[0]), int(start[1])
            x1, y1 = int(end[0]), int(end[1])
            
            dx = abs(x1 - x0)
            dy = abs(y1 - y0)
            sx = 1 if x0 < x1 else -1
            sy = 1 if y0 < y1 else -1
            err = dx - dy
            
            while True:
                # Draw with thickness
                for dy_offset in range(-int(thickness), int(thickness) + 1):
                    for dx_offset in range(-int(thickness), int(thickness) + 1):
                        nx, ny = x0 + dx_offset, y0 + dy_offset
                        if 0 <= nx < self.width and 0 <= ny < self.height:
                            raster[ny, nx] = 1.0
                
                if x0 == x1 and y0 == y1:
                    break
                    
                e2 = 2 * err
                if e2 > -dy:
                    err -= dy
                    x0 += sx
                if e2 < dx:
                    err += dx
                    y0 += sy
                    
        return raster
    
    def rasterize_polygon(self, vertices: np.ndarray) -> np.ndarray:
        """
        Rasterize a polygon defined by vertices.
        
        Args:
            vertices: Array of shape (N, 2) containing polygon vertices
            
        Returns:
            np.ndarray: Rasterized image of shape (height, width)
        """
        raster = np.zeros((self.height, self.width), dtype=np.float32)
        
        if len(vertices) < 3:
            return raster
        
        # Normalize vertices to image dimensions
        vertices_normalized = vertices.copy()
        x_min, x_max = vertices[:, 0].min(), vertices[:, 0].max()
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        
        # Handle case where all vertices have same coordinate
        if x_max - x_min > EPSILON:
            vertices_normalized[:, 0] = (vertices[:, 0] - x_min) / (x_max - x_min) * (self.width - 1)
        else:
            vertices_normalized[:, 0] = self.width // 2
        
        if y_max - y_min > EPSILON:
            vertices_normalized[:, 1] = (vertices[:, 1] - y_min) / (y_max - y_min) * (self.height - 1)
        else:
            vertices_normalized[:, 1] = self.height // 2
        
        # Simple scanline fill algorithm
        for y in range(self.height):
            intersections = []
            for i in range(len(vertices_normalized)):
                v1 = vertices_normalized[i]
                v2 = vertices_normalized[(i + 1) % len(vertices_normalized)]
                
                if v1[1] != v2[1]:  # Not horizontal
                    if min(v1[1], v2[1]) <= y < max(v1[1], v2[1]):
                        x = v1[0] + (y - v1[1]) * (v2[0] - v1[0]) / (v2[1] - v1[1])
                        intersections.append(x)
            
            intersections.sort()
            for i in range(0, len(intersections), 2):
                if i + 1 < len(intersections):
                    x_start = int(intersections[i])
                    x_end = int(intersections[i + 1])
                    for x in range(max(0, x_start), min(self.width, x_end + 1)):
                        raster[y, x] = 1.0
                        
        return raster
    
    def batch_rasterize(self, data_list: List[dict]) -> np.ndarray:
        """
        Rasterize a batch of mixed geometric data.
        
        Args:
            data_list: List of dictionaries with 'type' and 'data' keys.
                      Type can be 'points', 'lines', or 'polygon'.
            
        Returns:
            np.ndarray: Array of rasterized images, shape (batch_size, height, width)
        """
        if not data_list:
            # Return empty array with correct shape
            return np.zeros((0, self.height, self.width), dtype=np.float32)
        
        rasters = []
        for data_dict in data_list:
            data_type = data_dict.get('type', 'points')
            data = data_dict.get('data')
            
            if data_type == 'points':
                raster = self.rasterize_points(data, radius=data_dict.get('radius', 1.0))
            elif data_type == 'lines':
                raster = self.rasterize_lines(data, thickness=data_dict.get('thickness', 1.0))
            elif data_type == 'polygon':
                raster = self.rasterize_polygon(data)
            else:
                raster = np.zeros((self.height, self.width), dtype=np.float32)
            
            rasters.append(raster)
        
        return np.array(rasters)
