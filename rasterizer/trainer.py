"""
Trainer class providing high-level API for training with rasterized data.
"""

import numpy as np
from typing import Optional, Callable, Dict, Any, List, Tuple
from .rasterizer import Rasterizer


class Trainer:
    """
    High-level API for training machine learning models with rasterized data.
    
    This class provides a simple interface to:
    1. Rasterize vector data
    2. Prepare data for training
    3. Train models (or prepare data for external model training)
    
    Example:
        >>> trainer = Trainer(width=256, height=256)
        >>> X_train, y_train = trainer.prepare_training_data(vector_data, labels)
        >>> trainer.train(X_train, y_train, model=my_model)
    """
    
    def __init__(self, width: int = 256, height: int = 256, resolution: float = 1.0):
        """
        Initialize the Trainer.
        
        Args:
            width: Width of rasterized images
            height: Height of rasterized images
            resolution: Resolution factor for rasterization
        """
        self.rasterizer = Rasterizer(width=width, height=height, resolution=resolution)
        self.width = width
        self.height = height
        self.model = None
        self.training_history = []
        
    def prepare_training_data(self, 
                             data: List[dict], 
                             labels: Optional[np.ndarray] = None,
                             normalize: bool = True) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Prepare vector data for training by rasterizing it.
        
        Args:
            data: List of data dictionaries with 'type' and 'data' keys
            labels: Optional array of labels for supervised learning
            normalize: Whether to normalize the output images
            
        Returns:
            Tuple of (X_train, y_train) where X_train is rasterized images
            and y_train is the labels (or None if not provided)
        """
        # Rasterize the data
        X = self.rasterizer.batch_rasterize(data)
        
        # Normalize if requested
        if normalize:
            X = X.astype(np.float32)
            X_min, X_max = X.min(), X.max()
            # Only normalize if there's a range; otherwise values are already uniform
            if X_max > X_min and (X_max != 0 or X_min != 0):
                X = (X - X_min) / (X_max - X_min)
            elif X_max == X_min and X_max != 0:
                # All values are the same non-zero value, normalize to 1
                X = np.ones_like(X)
        
        # Add channel dimension if needed (for CNN compatibility)
        if len(X.shape) == 3:
            X = X[:, :, :, np.newaxis]
        
        return X, labels
    
    def train(self, 
              X_train: np.ndarray,
              y_train: np.ndarray,
              model: Optional[Any] = None,
              epochs: int = 10,
              batch_size: int = 32,
              validation_split: float = 0.2,
              callbacks: Optional[List[Callable]] = None,
              **kwargs) -> Dict[str, Any]:
        """
        Train a model on rasterized data.
        
        This method provides a simple training interface. If no model is provided,
        it returns the prepared data for use with external training frameworks.
        
        Args:
            X_train: Training data (rasterized images)
            y_train: Training labels
            model: Optional model object with fit() method (e.g., Keras model)
            epochs: Number of training epochs
            batch_size: Batch size for training
            validation_split: Fraction of data to use for validation
            callbacks: Optional list of callback functions
            **kwargs: Additional arguments to pass to model.fit()
            
        Returns:
            Dictionary containing training history and metrics
        """
        if model is None:
            # No model provided, return data shape info
            return {
                'status': 'data_prepared',
                'X_shape': X_train.shape,
                'y_shape': y_train.shape if y_train is not None else None,
                'message': 'Data prepared. Pass to your preferred ML framework for training.'
            }
        
        # Store the model
        self.model = model
        
        # Train the model
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=callbacks,
            **kwargs
        )
        
        # Store training history
        # Keras/TensorFlow models return a History object with .history attribute
        # scikit-learn models return the model itself
        # Handle both cases gracefully
        if hasattr(history, 'history'):
            # Keras/TensorFlow format
            history_data = history.history
        elif hasattr(history, '__dict__'):
            # Try to extract as dictionary
            history_data = history.__dict__
        else:
            # Fallback: store the history object as-is
            history_data = history
            
        training_result = {
            'status': 'training_complete',
            'epochs': epochs,
            'history': history_data
        }
        self.training_history.append(training_result)
        
        return training_result
    
    def train_from_raw_data(self,
                           raw_data: List[dict],
                           labels: np.ndarray,
                           model: Optional[Any] = None,
                           normalize: bool = True,
                           **train_kwargs) -> Dict[str, Any]:
        """
        Complete training pipeline: rasterize data and train in one call.
        
        This is the main API method that handles the entire pipeline from
        raw vector data to trained model.
        
        Args:
            raw_data: List of data dictionaries with 'type' and 'data' keys
            labels: Array of labels for supervised learning
            model: Optional model object with fit() method
            normalize: Whether to normalize rasterized images
            **train_kwargs: Additional arguments for training (epochs, batch_size, etc.)
            
        Returns:
            Dictionary containing training results
            
        Example:
            >>> data = [
            ...     {'type': 'points', 'data': np.array([[0, 0], [1, 1]])},
            ...     {'type': 'points', 'data': np.array([[2, 2], [3, 3]])}
            ... ]
            >>> labels = np.array([0, 1])
            >>> result = trainer.train_from_raw_data(data, labels, model=my_model)
        """
        # Prepare the data
        X_train, y_train = self.prepare_training_data(raw_data, labels, normalize)
        
        # Train the model
        return self.train(X_train, y_train, model=model, **train_kwargs)
    
    def predict(self, data: List[dict], normalize: bool = True) -> np.ndarray:
        """
        Make predictions on new vector data.
        
        Args:
            data: List of data dictionaries to rasterize and predict
            normalize: Whether to normalize the rasterized images
            
        Returns:
            Model predictions
        """
        if self.model is None:
            raise ValueError("No model has been trained yet. Call train() first.")
        
        # Prepare the data
        X, _ = self.prepare_training_data(data, labels=None, normalize=normalize)
        
        # Make predictions
        return self.model.predict(X)
    
    def save_model(self, filepath: str):
        """
        Save the trained model to disk.
        
        Args:
            filepath: Path where the model should be saved
        """
        if self.model is None:
            raise ValueError("No model to save. Train a model first.")
        
        if hasattr(self.model, 'save'):
            self.model.save(filepath)
        else:
            raise NotImplementedError("Model does not have a save() method")
    
    def set_model(self, model: Any):
        """
        Set a pre-trained or loaded model.
        
        Use this method to set a model that you've loaded using your
        framework's loading method (e.g., keras.models.load_model(),
        torch.load(), pickle.load(), etc.)
        
        Args:
            model: A model object with predict() method
            
        Example:
            >>> import tensorflow as tf
            >>> loaded_model = tf.keras.models.load_model('my_model.h5')
            >>> trainer.set_model(loaded_model)
            >>> predictions = trainer.predict(data)
        """
        self.model = model
    
    def get_training_history(self) -> List[Dict[str, Any]]:
        """
        Get the history of all training runs.
        
        Returns:
            List of training history dictionaries
        """
        return self.training_history
