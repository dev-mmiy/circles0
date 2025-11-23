#!/usr/bin/env python3
"""
Performance testing script for optimized endpoints.

This script measures the performance of get_feed and get_conversations endpoints
to verify the N+1 query optimization improvements.

Usage:
    python scripts/performance_test.py [--endpoint feed|conversations|all] [--iterations N]
"""

import argparse
import asyncio
import time
from typing import Dict, List
import httpx
import os
import sys

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
AUTH_TOKEN = os.getenv("TEST_AUTH_TOKEN", "")


async def test_feed_performance(
    client: httpx.AsyncClient, iterations: int = 5
) -> Dict[str, float]:
    """Test get_feed endpoint performance."""
    print(f"\n{'='*60}")
    print("Testing get_feed endpoint performance")
    print(f"{'='*60}")
    
    times = []
    for i in range(iterations):
        start_time = time.time()
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/v1/posts",
                params={"skip": 0, "limit": 20, "filter_type": "all"},
                timeout=30.0,
            )
            elapsed = time.time() - start_time
            times.append(elapsed)
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else 0
                print(
                    f"  Iteration {i+1}: {elapsed:.3f}s - "
                    f"Status: {response.status_code}, Posts: {count}"
                )
            else:
                print(
                    f"  Iteration {i+1}: {elapsed:.3f}s - "
                    f"Status: {response.status_code}, Error: {response.text[:100]}"
                )
        except Exception as e:
            elapsed = time.time() - start_time
            times.append(elapsed)
            print(f"  Iteration {i+1}: {elapsed:.3f}s - Error: {str(e)}")
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        print(f"\n  Results: avg={avg_time:.3f}s, min={min_time:.3f}s, max={max_time:.3f}s")
        return {
            "avg": avg_time,
            "min": min_time,
            "max": max_time,
            "times": times,
        }
    return {}


async def test_conversations_performance(
    client: httpx.AsyncClient, iterations: int = 5
) -> Dict[str, float]:
    """Test get_conversations endpoint performance."""
    print(f"\n{'='*60}")
    print("Testing get_conversations endpoint performance")
    print(f"{'='*60}")
    
    if not AUTH_TOKEN:
        print("  Warning: AUTH_TOKEN not set, skipping authenticated endpoint")
        return {}
    
    times = []
    for i in range(iterations):
        start_time = time.time()
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/v1/messages/conversations",
                params={"skip": 0, "limit": 20},
                headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
                timeout=30.0,
            )
            elapsed = time.time() - start_time
            times.append(elapsed)
            
            if response.status_code == 200:
                data = response.json()
                count = (
                    len(data.get("conversations", []))
                    if isinstance(data, dict)
                    else 0
                )
                print(
                    f"  Iteration {i+1}: {elapsed:.3f}s - "
                    f"Status: {response.status_code}, Conversations: {count}"
                )
            else:
                print(
                    f"  Iteration {i+1}: {elapsed:.3f}s - "
                    f"Status: {response.status_code}, Error: {response.text[:100]}"
                )
        except Exception as e:
            elapsed = time.time() - start_time
            times.append(elapsed)
            print(f"  Iteration {i+1}: {elapsed:.3f}s - Error: {str(e)}")
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        print(f"\n  Results: avg={avg_time:.3f}s, min={min_time:.3f}s, max={max_time:.3f}s")
        return {
            "avg": avg_time,
            "min": min_time,
            "max": max_time,
            "times": times,
        }
    return {}


async def main():
    parser = argparse.ArgumentParser(description="Performance testing script")
    parser.add_argument(
        "--endpoint",
        choices=["feed", "conversations", "all"],
        default="all",
        help="Endpoint to test (default: all)",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=5,
        help="Number of iterations to run (default: 5)",
    )
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print("Performance Testing Script")
    print(f"{'='*60}")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Iterations: {args.iterations}")
    print(f"Endpoint: {args.endpoint}")
    
    async with httpx.AsyncClient() as client:
        results = {}
        
        if args.endpoint in ["feed", "all"]:
            results["feed"] = await test_feed_performance(client, args.iterations)
        
        if args.endpoint in ["conversations", "all"]:
            results["conversations"] = await test_conversations_performance(
                client, args.iterations
            )
        
        # Summary
        print(f"\n{'='*60}")
        print("Summary")
        print(f"{'='*60}")
        for endpoint, result in results.items():
            if result:
                print(
                    f"{endpoint.capitalize()}: "
                    f"avg={result['avg']:.3f}s, "
                    f"min={result['min']:.3f}s, "
                    f"max={result['max']:.3f}s"
                )
        print()


if __name__ == "__main__":
    asyncio.run(main())

