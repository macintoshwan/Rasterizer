"""
Basic usage example of the Rasterizer library.

This example demonstrates how to use the core Rasterizer class
to convert vector data to raster format.
"""

import numpy as np
from rasterizer import Rasterizer


def main():
    print("=== Rasterizer Basic Usage Example ===\n")
    
    # Create a rasterizer instance
    rasterizer = Rasterizer(width=256, height=256)
    print(f"Created Rasterizer: {rasterizer.width}x{rasterizer.height}")
    
    # Example 1: Rasterize points
    print("\n1. Rasterizing points...")
    points = np.array([
        [50, 50],
        [100, 100],
        [150, 150],
        [200, 200]
    ])
    raster_points = rasterizer.rasterize_points(points, radius=3.0)
    print(f"   Result shape: {raster_points.shape}")
    print(f"   Non-zero pixels: {np.sum(raster_points > 0)}")
    
    # Example 2: Rasterize lines
    print("\n2. Rasterizing lines...")
    lines = [
        (np.array([0, 0]), np.array([100, 100])),
        (np.array([0, 100]), np.array([100, 0]))
    ]
    raster_lines = rasterizer.rasterize_lines(lines, thickness=2.0)
    print(f"   Result shape: {raster_lines.shape}")
    print(f"   Non-zero pixels: {np.sum(raster_lines > 0)}")
    
    # Example 3: Rasterize a polygon
    print("\n3. Rasterizing a polygon...")
    polygon_vertices = np.array([
        [50, 50],
        [200, 50],
        [200, 200],
        [50, 200]
    ])
    raster_polygon = rasterizer.rasterize_polygon(polygon_vertices)
    print(f"   Result shape: {raster_polygon.shape}")
    print(f"   Non-zero pixels: {np.sum(raster_polygon > 0)}")
    
    # Example 4: Batch rasterization
    print("\n4. Batch rasterizing mixed data...")
    data_batch = [
        {'type': 'points', 'data': np.array([[30, 30], [60, 60]]), 'radius': 5.0},
        {'type': 'polygon', 'data': np.array([[10, 10], [50, 10], [50, 50], [10, 50]])},
        {'type': 'lines', 'data': [(np.array([0, 0]), np.array([50, 50]))], 'thickness': 3.0}
    ]
    batch_result = rasterizer.batch_rasterize(data_batch)
    print(f"   Batch result shape: {batch_result.shape}")
    print(f"   Number of images: {len(batch_result)}")
    
    print("\n✓ Basic usage examples completed successfully!")


if __name__ == "__main__":
    main()
