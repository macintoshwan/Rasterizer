"""
Training API example - demonstrates how to use the Trainer class.

This example shows the main API for directly training your data,
which is what the library is designed for.
"""

import numpy as np
from rasterizer import Trainer


def generate_sample_data(n_samples=100):
    """Generate synthetic vector data for demonstration."""
    data = []
    labels = []
    
    for i in range(n_samples):
        if i % 2 == 0:
            # Class 0: random points in upper region
            points = np.random.rand(5, 2) * 50 + np.array([0, 0])
            data.append({'type': 'points', 'data': points, 'radius': 2.0})
            labels.append(0)
        else:
            # Class 1: random points in lower region
            points = np.random.rand(5, 2) * 50 + np.array([50, 50])
            data.append({'type': 'points', 'data': points, 'radius': 2.0})
            labels.append(1)
    
    return data, np.array(labels)


def main():
    print("=== Rasterizer Training API Example ===\n")
    
    # Create a trainer
    trainer = Trainer(width=128, height=128)
    print(f"Created Trainer: {trainer.width}x{trainer.height}\n")
    
    # Generate sample data
    print("Generating sample data...")
    data, labels = generate_sample_data(n_samples=50)
    print(f"Generated {len(data)} samples with {len(np.unique(labels))} classes\n")
    
    # Method 1: Prepare data for training
    print("Method 1: Preparing training data...")
    X_train, y_train = trainer.prepare_training_data(data, labels, normalize=True)
    print(f"✓ Data prepared:")
    print(f"  X_train shape: {X_train.shape}")
    print(f"  y_train shape: {y_train.shape}")
    print(f"  X_train range: [{X_train.min():.3f}, {X_train.max():.3f}]")
    
    # At this point, you can use X_train and y_train with any ML framework
    print("\nYou can now use this data with:")
    print("  - TensorFlow/Keras: model.fit(X_train, y_train)")
    print("  - PyTorch: train_loader = DataLoader(dataset)")
    print("  - scikit-learn: clf.fit(X_train.reshape(len(X_train), -1), y_train)")
    
    # Method 2: Train without a model (just data preparation)
    print("\n" + "="*50)
    print("\nMethod 2: Using train() without a model...")
    result = trainer.train(X_train, y_train, model=None)
    print(f"✓ Result: {result['status']}")
    print(f"  Message: {result['message']}")
    
    # Method 3: One-step pipeline (most convenient)
    print("\n" + "="*50)
    print("\nMethod 3: One-step training pipeline...")
    print("(This combines rasterization and training in one call)")
    
    # Generate new data for this example
    new_data, new_labels = generate_sample_data(n_samples=30)
    result = trainer.train_from_raw_data(
        new_data, 
        new_labels, 
        model=None,  # Set to your model for actual training
        normalize=True
    )
    print(f"✓ Pipeline result: {result['status']}")
    
    # Show how to integrate with a real model
    print("\n" + "="*50)
    print("\nTo integrate with your own model:")
    print("""
    from rasterizer import Trainer
    from your_ml_framework import YourModel
    
    # Initialize
    trainer = Trainer(width=256, height=256)
    model = YourModel()
    
    # Option A: Prepare data separately
    X, y = trainer.prepare_training_data(data, labels)
    model.fit(X, y)
    
    # Option B: Use the train method
    trainer.train(X, y, model=model, epochs=10, batch_size=32)
    
    # Option C: One-line training
    trainer.train_from_raw_data(data, labels, model=model, epochs=10)
    
    # Make predictions
    predictions = trainer.predict(new_data)
    """)
    
    print("\n✓ Training API examples completed successfully!")
    print("\nKey takeaway: This library provides a direct API to train your data!")


if __name__ == "__main__":
    main()
