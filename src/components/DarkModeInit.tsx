export default function DarkModeInit() {
  const script = `
    (function() {
      try {
        var saved = localStorage.getItem('shopradar-mode');
        if (saved === 'light') {
          document.documentElement.removeAttribute('data-mode');
        } else {
          document.documentElement.setAttribute('data-mode', 'dark');
        }
      } catch(e) {
        document.documentElement.setAttribute('data-mode', 'dark');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
