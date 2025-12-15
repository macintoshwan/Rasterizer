"""
Example of integrating Rasterizer with a custom machine learning model.

This demonstrates how to use the training API with scikit-learn,
which is a common use case.
"""

import numpy as np
from rasterizer import Trainer


class SimpleMLModel:
    """
    A simple mock ML model for demonstration.
    In practice, use models from TensorFlow, PyTorch, or scikit-learn.
    """
    
    def __init__(self):
        self.trained = False
        self.history = {'loss': []}
    
    def fit(self, X, y, epochs=10, batch_size=32, validation_split=0.2, **kwargs):
        """Mock training method."""
        print(f"Training on data shape: {X.shape}")
        print(f"Labels shape: {y.shape}")
        print(f"Epochs: {epochs}, Batch size: {batch_size}")
        
        # Simulate training
        for epoch in range(epochs):
            loss = 1.0 / (epoch + 1)  # Fake decreasing loss
            self.history['loss'].append(loss)
            print(f"  Epoch {epoch+1}/{epochs} - loss: {loss:.4f}")
        
        self.trained = True
        return self
    
    def predict(self, X):
        """Mock prediction method."""
        if not self.trained:
            raise ValueError("Model not trained yet!")
        # Return random predictions for demonstration
        return np.random.rand(len(X), 2)


def main():
    print("=== Custom Model Integration Example ===\n")
    
    # Generate sample data
    print("1. Generating sample data...")
    n_samples = 40
    data = []
    labels = []
    
    for i in range(n_samples):
        # Create random point clouds
        n_points = np.random.randint(3, 10)
        points = np.random.rand(n_points, 2) * 100
        data.append({'type': 'points', 'data': points, 'radius': 2.5})
        labels.append(i % 2)  # Binary classification
    
    labels = np.array(labels)
    print(f"   Generated {len(data)} samples")
    print(f"   Class distribution: {np.bincount(labels)}\n")
    
    # Create trainer
    print("2. Creating trainer...")
    trainer = Trainer(width=128, height=128)
    print(f"   Trainer initialized: {trainer.width}x{trainer.height}\n")
    
    # Create a custom model
    print("3. Creating custom model...")
    model = SimpleMLModel()
    print("   Model created\n")
    
    # Train using the complete pipeline
    print("4. Training with complete pipeline...")
    print("-" * 50)
    result = trainer.train_from_raw_data(
        raw_data=data,
        labels=labels,
        model=model,
        epochs=5,
        batch_size=16,
        validation_split=0.2
    )
    print("-" * 50)
    print(f"\n   Training status: {result['status']}")
    print(f"   Epochs completed: {result['epochs']}")
    
    # Make predictions on new data
    print("\n5. Making predictions on new data...")
    test_data = [
        {'type': 'points', 'data': np.random.rand(5, 2) * 100, 'radius': 2.5},
        {'type': 'points', 'data': np.random.rand(5, 2) * 100, 'radius': 2.5}
    ]
    predictions = trainer.predict(test_data)
    print(f"   Predictions shape: {predictions.shape}")
    print(f"   Sample predictions:\n{predictions}\n")
    
    # Show training history
    print("6. Viewing training history...")
    history = trainer.get_training_history()
    print(f"   Number of training runs: {len(history)}")
    for i, run in enumerate(history):
        print(f"   Run {i+1}: {run['status']}, epochs: {run['epochs']}")
    
    print("\n✓ Custom model integration example completed!")
    print("\nThis example shows how easy it is to:")
    print("  ✓ Prepare vector data for training")
    print("  ✓ Integrate with any ML framework")
    print("  ✓ Train and make predictions")
    print("  ✓ Use the complete one-step API")


if __name__ == "__main__":
    main()
