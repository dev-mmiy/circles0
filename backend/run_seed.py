#!/usr/bin/env python3
"""Run seed script manually."""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import and run seed script
from scripts.seed_final_master_data import main

if __name__ == "__main__":
    main()
