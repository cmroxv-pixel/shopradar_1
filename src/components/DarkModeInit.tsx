import Script from 'next/script';

export default function DarkModeInit() {
  return (
    <Script
      id="dark-mode-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
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
        `,
      }}
    />
  );
}
