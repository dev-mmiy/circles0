"""
Integration tests for the Disease Community API
"""
import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app


class TestAPIIntegration:
    """Integration tests for API endpoints"""
    
    def setup_method(self):
        """Set up test client for each test"""
        self.client = TestClient(app)
    
    def test_root_endpoint_integration(self):
        """Test root endpoint with full integration"""
        response = self.client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "environment" in data
        assert "version" in data
        assert data["message"] == "Hello World!"
        assert data["version"] == "1.0.0"
    
    def test_health_endpoint_integration(self):
        """Test health endpoint with full integration"""
        response = self.client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "environment" in data
        assert "service" in data
        assert data["status"] == "healthy"
        assert data["service"] == "disease-community-api"
    
    def test_info_endpoint_integration(self):
        """Test info endpoint with full integration"""
        response = self.client.get("/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "environment" in data
        assert "log_level" in data
        assert data["service"] == "Disease Community API"
        assert data["version"] == "1.0.0"
    
    def test_cors_headers_integration(self):
        """Test CORS headers are properly set"""
        response = self.client.options("/", headers={"Origin": "http://localhost:3000"})
        assert response.status_code == 200
        
        # Check CORS headers
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers
    
    def test_api_documentation_integration(self):
        """Test API documentation endpoints in development mode"""
        # In development mode, docs should be available
        response = self.client.get("/docs")
        assert response.status_code == 200
        
        response = self.client.get("/redoc")
        assert response.status_code == 200
    
    def test_openapi_schema_integration(self):
        """Test OpenAPI schema endpoint"""
        response = self.client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert schema["info"]["title"] == "Disease Community API"
        assert schema["info"]["version"] == "1.0.0"
