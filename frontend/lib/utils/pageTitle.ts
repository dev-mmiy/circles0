/**
 * Utility function to set page title with format: "Lifry - [Page Function]"
 */

export function setPageTitle(title: string) {
  if (typeof window !== 'undefined') {
    document.title = `Lifry - ${title}`;
  }
}

