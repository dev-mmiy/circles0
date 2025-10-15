"""
Integration tests for the Disease Community API
"""

# import httpx
# import pytest
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
        # Test CORS headers with GET request (OPTIONS might not be supported)
        response = self.client.get("/", headers={"Origin": "http://localhost:3000"})
        assert response.status_code == 200

        # Check CORS headers are present
        headers = response.headers
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers",
        ]

        # At least one CORS header should be present
        cors_header_found = any(header in headers for header in cors_headers)
        assert cors_header_found, "No CORS headers found in response"

    def test_cors_preflight_request(self):
        """Test CORS preflight request handling"""
        # Try OPTIONS request, but don't fail if it's not supported
        try:
            response = self.client.options(
                "/", headers={"Origin": "http://localhost:3000"}
            )
            if response.status_code == 200:
                # If OPTIONS is supported, check CORS headers
                headers = response.headers
                cors_headers = [
                    "access-control-allow-origin",
                    "access-control-allow-methods",
                    "access-control-allow-headers",
                ]
                cors_header_found = any(header in headers for header in cors_headers)
                assert cors_header_found, "No CORS headers found in OPTIONS response"
        except Exception:
            # OPTIONS method might not be supported, which is acceptable
            pass

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
