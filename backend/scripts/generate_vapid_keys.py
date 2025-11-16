#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push API.

Usage:
    python scripts/generate_vapid_keys.py

This script generates a VAPID key pair and outputs them in the format
needed for environment variables.
"""

import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def generate_vapid_keys():
    """Generate VAPID key pair."""
    # Generate private key
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Get public key
    public_key = private_key.public_key()

    # Serialize private key to PEM format
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    # Serialize public key to DER format
    public_key_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    # Convert to base64 (URL-safe for public key)
    private_key_base64 = base64.b64encode(private_key_pem).decode("utf-8")
    public_key_base64 = (
        base64.urlsafe_b64encode(public_key_der).decode("utf-8").rstrip("=")
    )

    return private_key_base64, public_key_base64


if __name__ == "__main__":
    print("Generating VAPID keys for Web Push API...\n")

    private_key, public_key = generate_vapid_keys()

    print("VAPID Keys Generated Successfully!\n")
    print("Add these to your .env file:\n")
    print(f'VAPID_PRIVATE_KEY="{private_key}"')
    print(f'VAPID_PUBLIC_KEY="{public_key}"')
    print('VAPID_EMAIL="mailto:admin@yourdomain.com"\n')
    print('Note: Replace "admin@yourdomain.com" with your actual email address.')
