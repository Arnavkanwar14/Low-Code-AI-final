"""
Deployment module for model serving and management
"""
from deployment.registry import ModelRegistry
from deployment.predictor import ModelPredictor

__all__ = ['ModelRegistry', 'ModelPredictor']
