"""
Unit tests for the Trainer class.
"""

import numpy as np
import pytest
from rasterizer import Trainer


class MockModel:
    """Mock model for testing."""
    
    def __init__(self):
        self.fitted = False
        self.history = {'loss': [0.5, 0.3, 0.1]}
    
    def fit(self, X, y, **kwargs):
        self.fitted = True
        return self
    
    def predict(self, X):
        return np.random.rand(len(X), 2)


class TestTrainer:
    """Test cases for the Trainer class."""
    
    def test_initialization(self):
        """Test Trainer initialization."""
        trainer = Trainer(width=256, height=256, resolution=1.0)
        assert trainer.width == 256
        assert trainer.height == 256
        assert trainer.model is None
        assert len(trainer.training_history) == 0
    
    def test_prepare_training_data(self):
        """Test data preparation."""
        trainer = Trainer(width=128, height=128)
        
        data = [
            {'type': 'points', 'data': np.array([[10, 20], [30, 40]]), 'radius': 2.0},
            {'type': 'points', 'data': np.array([[50, 60], [70, 80]]), 'radius': 2.0}
        ]
        labels = np.array([0, 1])
        
        X, y = trainer.prepare_training_data(data, labels, normalize=True)
        
        # Check shapes
        assert X.shape == (2, 128, 128, 1)  # Batch, height, width, channels
        assert y.shape == (2,)
        # Check normalization
        assert X.min() >= 0 and X.max() <= 1
    
    def test_prepare_training_data_without_labels(self):
        """Test data preparation without labels."""
        trainer = Trainer(width=100, height=100)
        
        data = [
            {'type': 'points', 'data': np.array([[25, 25]]), 'radius': 2.0}
        ]
        
        X, y = trainer.prepare_training_data(data, labels=None)
        
        assert X.shape == (1, 100, 100, 1)
        assert y is None
    
    def test_train_without_model(self):
        """Test training without providing a model."""
        trainer = Trainer(width=64, height=64)
        
        X = np.random.rand(10, 64, 64, 1)
        y = np.array([0, 1] * 5)
        
        result = trainer.train(X, y, model=None)
        
        assert result['status'] == 'data_prepared'
        assert result['X_shape'] == X.shape
        assert result['y_shape'] == y.shape
    
    def test_train_with_model(self):
        """Test training with a mock model."""
        trainer = Trainer(width=64, height=64)
        model = MockModel()
        
        X = np.random.rand(10, 64, 64, 1)
        y = np.array([0, 1] * 5)
        
        result = trainer.train(X, y, model=model, epochs=5, batch_size=2)
        
        assert result['status'] == 'training_complete'
        assert result['epochs'] == 5
        assert model.fitted
        assert trainer.model is model
        assert len(trainer.training_history) == 1
    
    def test_train_from_raw_data(self):
        """Test complete training pipeline from raw data."""
        trainer = Trainer(width=64, height=64)
        model = MockModel()
        
        raw_data = [
            {'type': 'points', 'data': np.array([[10, 10], [20, 20]]), 'radius': 2.0},
            {'type': 'points', 'data': np.array([[30, 30], [40, 40]]), 'radius': 2.0}
        ]
        labels = np.array([0, 1])
        
        result = trainer.train_from_raw_data(raw_data, labels, model=model, epochs=3)
        
        assert result['status'] == 'training_complete'
        assert model.fitted
    
    def test_predict_without_model(self):
        """Test prediction without training a model."""
        trainer = Trainer(width=64, height=64)
        data = [{'type': 'points', 'data': np.array([[10, 10]]), 'radius': 2.0}]
        
        with pytest.raises(ValueError, match="No model has been trained"):
            trainer.predict(data)
    
    def test_predict_with_model(self):
        """Test prediction with a trained model."""
        trainer = Trainer(width=64, height=64)
        model = MockModel()
        model.fitted = True
        trainer.model = model
        
        data = [
            {'type': 'points', 'data': np.array([[10, 10]]), 'radius': 2.0},
            {'type': 'points', 'data': np.array([[20, 20]]), 'radius': 2.0}
        ]
        
        predictions = trainer.predict(data)
        
        assert predictions.shape == (2, 2)
    
    def test_get_training_history(self):
        """Test getting training history."""
        trainer = Trainer(width=64, height=64)
        model = MockModel()
        
        X = np.random.rand(5, 64, 64, 1)
        y = np.array([0, 1, 0, 1, 0])
        
        # Train twice
        trainer.train(X, y, model=model, epochs=2)
        trainer.train(X, y, model=model, epochs=3)
        
        history = trainer.get_training_history()
        assert len(history) == 2
        assert history[0]['epochs'] == 2
        assert history[1]['epochs'] == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
