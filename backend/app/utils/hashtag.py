"""
Utility functions for hashtag extraction and processing.
"""

import re
from typing import List


def extract_hashtags(text: str) -> List[str]:
    """
    Extract hashtags from text.

    Hashtags are words prefixed with '#' that contain only alphanumeric characters
    and underscores. Minimum length is 1 character after the '#'.

    Examples:
        "#hello" -> ["hello"]
        "#hello_world" -> ["hello_world"]
        "#hello world" -> ["hello"]
        "hello #world" -> ["world"]
        "#123" -> ["123"]
        "##double" -> ["double"]  # Only one '#' is considered
        "#" -> []  # Empty hashtag is ignored
        "#hello-world" -> ["hello"]  # Hyphen breaks the hashtag

    Args:
        text: The text to extract hashtags from.

    Returns:
        A list of unique hashtag names (without the '#' prefix), in lowercase.
    """
    # Pattern: # followed by one or more alphanumeric characters or underscores
    # The pattern uses word boundary to ensure we don't match mid-word
    pattern = r"#([a-zA-Z0-9_]+)"
    matches = re.findall(pattern, text)

    # Convert to lowercase and remove duplicates while preserving order
    seen = set()
    unique_hashtags = []
    for tag in matches:
        tag_lower = tag.lower()
        if tag_lower not in seen:
            seen.add(tag_lower)
            unique_hashtags.append(tag_lower)

    return unique_hashtags


def normalize_hashtag(hashtag: str) -> str:
    """
    Normalize a hashtag name.

    Converts to lowercase and removes any leading '#' if present.

    Args:
        hashtag: The hashtag to normalize.

    Returns:
        The normalized hashtag (lowercase, no leading '#').
    """
    hashtag = hashtag.strip()
    if hashtag.startswith("#"):
        hashtag = hashtag[1:]
    return hashtag.lower()


