"""
Utilities for extracting mentions from text content.
"""

import re
from typing import List


def extract_mentions(content: str) -> List[str]:
    """
    Extract @mentions from text content.

    Mentions are in the format @username or @nickname.
    Usernames/nicknames can contain letters, numbers, underscores, and hyphens.
    Minimum length: 1 character, maximum length: 50 characters.

    Args:
        content: The text content to extract mentions from.

    Returns:
        List of mentioned usernames/nicknames (without @ symbol).

    Examples:
        >>> extract_mentions("Hello @john, how are you? @jane_doe")
        ['john', 'jane_doe']
        >>> extract_mentions("No mentions here")
        []
    """
    # Pattern: @ followed by alphanumeric, underscore, or hyphen
    # Minimum 1 character, maximum 50 characters
    pattern = r"@([a-zA-Z0-9_-]{1,50})"

    matches = re.findall(pattern, content)

    # Remove duplicates while preserving order
    seen = set()
    unique_mentions = []
    for mention in matches:
        if mention.lower() not in seen:
            seen.add(mention.lower())
            unique_mentions.append(mention)

    return unique_mentions


def normalize_mention(mention: str) -> str:
    """
    Normalize a mention string.

    Currently just converts to lowercase for consistency.
    In the future, this could handle more complex normalization.

    Args:
        mention: The mention string to normalize.

    Returns:
        Normalized mention string.
    """
    return mention.lower().strip()
