/**
 * Configuration utilities for the frontend
 */

/**
 * Get the API base URL based on the environment
 */
export function getApiBaseUrl(): string {
  // Check for environment variable first (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // In browser environment, use the runtime API URL from ApiContext
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For localhost, try to use WSL2 IP if available, otherwise use localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Try to detect if we're in WSL2 environment and use WSL2 IP
      // This can be set via environment variable: NEXT_PUBLIC_WSL2_IP
      // For WSL2, you can get the IP with: ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
      const wsl2Ip = process.env.NEXT_PUBLIC_WSL2_IP;
      if (wsl2Ip) {
        console.log(`[getApiBaseUrl] Using WSL2 IP: ${wsl2Ip}`);
        return `http://${wsl2Ip}:8000`;
      }
      // Try to use the WSL2 host IP (Windows can access WSL2 via this)
      // WSL2 host IP is typically the first IP in the WSL2 network range
      // For now, default to localhost (should work with WSL2 port forwarding)
      // If this doesn't work, set NEXT_PUBLIC_WSL2_IP environment variable
      console.log('[getApiBaseUrl] Using localhost:8000 (if this fails, set NEXT_PUBLIC_WSL2_IP)');
      return 'http://localhost:8000';
    }
    
    // For other hostnames, use production API
    return 'https://api.lifry.com';
  }

  // In server-side rendering, use environment variable or default
  return 'http://localhost:8000';
}
