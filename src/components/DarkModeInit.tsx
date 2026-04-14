// This component injects an inline script into the <head> that sets
// data-mode on the <html> element BEFORE React hydrates, preventing flash.
export default function DarkModeInit() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('shopradar-mode');
        if (saved === 'light') {
          document.documentElement.setAttribute('data-mode', 'light');
        }
        // default is dark (no attribute needed)
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
