import React, {type ReactNode, useState} from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Target Docusaurus primary doc content elements
    const docElement = document.querySelector('.theme-doc-markdown') || document.querySelector('article');
    if (!docElement) {
      alert('Could not locate page content to copy.');
      return;
    }

    // Retrieve clean text content
    const text = docElement.innerText || docElement.textContent || '';

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy page contents: ', err);
      });
  };

  return (
    <>
      <div style={{
        marginTop: '3rem',
        marginBottom: '2rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: '1px dashed var(--ifm-color-emphasis-300)',
        backgroundColor: 'var(--ifm-background-flat-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <strong style={{ fontFamily: 'var(--ifm-heading-font-family)', fontSize: '0.95rem', color: 'var(--ifm-heading-color)' }}>
            Share with your AI Agent
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ifm-text-color)', opacity: 0.8, lineHeight: '1.5' }}>
          Copy the full text content of this guide formatted for ingestion by LLMs and programming assistants (like Claude, Cursor, or ChatGPT).
        </p>
        <button
          onClick={handleCopy}
          className="button button--secondary button--sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderColor: copied ? 'var(--ifm-color-success)' : 'var(--incrementic-red)',
            color: copied ? 'var(--ifm-color-success)' : 'var(--incrementic-red)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: '0.4rem 0.8rem',
            fontSize: '0.8rem',
          }}
        >
          {copied ? '✓ Copied to Clipboard!' : '📋 Copy Page Content'}
        </button>
      </div>
      <Footer {...props} />
    </>
  );
}
