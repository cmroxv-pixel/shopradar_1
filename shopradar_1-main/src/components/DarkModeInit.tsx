export default function DarkModeInit() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('shopradar-mode');
        if (saved === 'dark') {
          document.documentElement.setAttribute('data-mode', 'dark');
        }
        // default is light (no attribute needed)
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
