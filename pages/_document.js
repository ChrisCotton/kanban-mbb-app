import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        {/* Appended after #__next so createPortal targets here stack above page content */}
        <div id="modal-root" />
      </body>
    </Html>
  )
}
