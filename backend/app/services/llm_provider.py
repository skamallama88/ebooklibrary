"""
LLM Provider abstraction layer for AI-powered book analysis.
Supports multiple LLM backends with primary focus on local Ollama integration.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
import httpx
import json
from pydantic import BaseModel


class LLMModel(BaseModel):
    """Represents an available LLM model"""
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None


class LLMResponse(BaseModel):
    """Standardized LLM response"""
    text: str
    confidence: float = 1.0
    metadata: Dict[str, Any] = {}


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_url = config.get("base_url", "")
        self.model_name = config.get("model_name", "")
        self.temperature = config.get("temperature", 0.7)
        self.max_tokens = config.get("max_tokens", 2048)
    
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is available and working"""
        pass
    
    @abstractmethod
    async def list_models(self) -> List[LLMModel]:
        """List available models"""
        pass


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider - PRIMARY IMPLEMENTATION"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        # Default to localhost if not specified
        if not self.base_url:
            self.base_url = "http://localhost:11434"
        # Remove trailing slash if present
        self.base_url = self.base_url.rstrip('/')
    
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        """
        Generate text using Ollama's generate API
        
        Args:
            prompt: The input prompt
            **kwargs: Additional parameters (temperature, max_tokens, etc.)
        
        Returns:
            LLMResponse with generated text
        """
        url = f"{self.base_url}/api/generate"
        
        temperature = kwargs.get("temperature", self.temperature)
        max_tokens = kwargs.get("max_tokens", self.max_tokens)
        
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,  # Non-streaming for simplicity
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                data = response.json()
                generated_text = data.get("response", "")
                
                # Extract metadata
                metadata = {
                    "model": data.get("model"),
                    "total_duration": data.get("total_duration"),
                    "load_duration": data.get("load_duration"),
                    "prompt_eval_count": data.get("prompt_eval_count"),
                    "eval_count": data.get("eval_count"),
                }
                
                return LLMResponse(
                    text=generated_text,
                    confidence=1.0,  # Ollama doesn't provide confidence
                    metadata=metadata
                )
        except httpx.HTTPError as e:
            raise ConnectionError(f"Failed to connect to Ollama at {self.base_url}: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Error generating text with Ollama: {str(e)}")
    
    async def health_check(self) -> bool:
        """
        Check if Ollama is running and model is available
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            # Check if Ollama is running
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                
                # Check if our model is available
                data = response.json()
                models = data.get("models", [])
                model_names = [m.get("name", "").split(":")[0] for m in models]
                
                # Check if our model exists (with or without tag)
                model_base = self.model_name.split(":")[0]
                return model_base in model_names
                
        except Exception:
            return False
    
    async def list_models(self) -> List[LLMModel]:
        """
        List all available models from Ollama
        
        Returns:
            List of LLMModel objects
        """
        url = f"{self.base_url}/api/tags"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                models = data.get("models", [])
                
                return [
                    LLMModel(
                        name=model.get("name", ""),
                        size=model.get("size"),
                        modified_at=model.get("modified_at")
                    )
                    for model in models
                ]
        except httpx.HTTPError as e:
            raise ConnectionError(f"Failed to list models from Ollama at {self.base_url}: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Error listing Ollama models: {str(e)}")


class OpenAIProvider(LLMProvider):
    """OpenAI API provider - OPTIONAL FUTURE ENHANCEMENT"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        # Will be implemented when needed
    
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("OpenAI provider not yet implemented")
    
    async def health_check(self) -> bool:
        raise NotImplementedError("OpenAI provider not yet implemented")
    
    async def list_models(self) -> List[LLMModel]:
        raise NotImplementedError("OpenAI provider not yet implemented")


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider - OPTIONAL FUTURE ENHANCEMENT"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get("api_key", "")
        # Will be implemented when needed
    
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        raise NotImplementedError("Anthropic provider not yet implemented")
    
    async def health_check(self) -> bool:
        raise NotImplementedError("Anthropic provider not yet implemented")
    
    async def list_models(self) -> List[LLMModel]:
        raise NotImplementedError("Anthropic provider not yet implemented")


def create_provider(provider_type: str, config: Dict[str, Any]) -> LLMProvider:
    """
    Factory function to create LLM providers
    
    Args:
        provider_type: Type of provider ('ollama', 'openai', 'anthropic')
        config: Provider configuration dictionary
    
    Returns:
        LLMProvider instance
    """
    providers = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }
    
    provider_class = providers.get(provider_type.lower())
    if not provider_class:
        raise ValueError(f"Unknown provider type: {provider_type}")
    
    return provider_class(config)
