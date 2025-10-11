"""
Full stack integration tests for the Disease Community API
"""
import time

import pytest
import requests
from fastapi.testclient import TestClient

from app.main import app


class TestFullStackIntegration:
    """Full stack integration tests"""

    def setup_method(self):
        """Set up test client for each test"""
        self.client = TestClient(app)

    def test_application_startup(self):
        """Test that the application starts up correctly"""
        # Test that all endpoints are accessible
        endpoints = ["/", "/health", "/info", "/docs", "/redoc", "/openapi.json"]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            assert response.status_code == 200, f"Endpoint {endpoint} failed"

    def test_application_metadata(self):
        """Test application metadata consistency"""
        # Test that all endpoints return consistent metadata
        response = self.client.get("/")
        root_data = response.json()

        response = self.client.get("/info")
        info_data = response.json()

        # Check version consistency
        assert root_data["version"] == info_data["version"]
        assert root_data["version"] == "1.0.0"

        # Check environment consistency
        assert root_data["environment"] == info_data["environment"]

    def test_error_handling(self):
        """Test error handling for non-existent endpoints"""
        response = self.client.get("/nonexistent")
        assert response.status_code == 404

    def test_response_headers(self):
        """Test that response headers are properly set"""
        response = self.client.get("/")

        # Check content type
        assert "application/json" in response.headers.get("content-type", "")

        # Check that response is not empty
        assert len(response.content) > 0

    def test_concurrent_requests(self):
        """Test that the application can handle concurrent requests"""
        import queue
        import threading

        results = queue.Queue()

        def make_request():
            response = self.client.get("/")
            results.put(response.status_code)

        # Create multiple threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Check that all requests succeeded
        while not results.empty():
            status_code = results.get()
            assert status_code == 200

    def test_application_performance(self):
        """Test basic application performance"""
        start_time = time.time()

        # Make multiple requests
        for _ in range(10):
            response = self.client.get("/")
            assert response.status_code == 200

        end_time = time.time()
        duration = end_time - start_time

        # Basic performance check (should complete within reasonable time)
        assert duration < 5.0, f"Performance test took too long: {duration}s"
