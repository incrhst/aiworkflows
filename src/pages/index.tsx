import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.eyebrow}>AI Workflows</div>
        <Heading as="h1" className={styles.heroTitle}>
          The shortest distance to your next AI build.
        </Heading>
        <p className={styles.heroSubtitle}>
          {siteConfig.tagline} — shaped and shipped under the Incrementic brand guidelines.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started">
            Get Started 🚀
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/blog">
            Read Blog
          </Link>
        </div>
        <div className={styles.sigWrap} aria-hidden="true">
          <svg className={styles.pathSvg} viewBox="0 0 680 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="88" r="6" fill="var(--ifm-text-color)" opacity="0.6"/>
            <text x="12" y="74" fill="var(--ifm-text-color)" opacity="0.6" fontFamily="var(--ifm-font-family-monospace)" fontSize="10">here</text>
            <path d="M22 88 C 170 88, 190 14, 340 14 S 510 88, 658 22" stroke="var(--ifm-color-emphasis-300)" strokeWidth="2" fill="none"/>
            <path className={styles.dash} d="M22 88 L 658 22" stroke="var(--incrementic-red)" strokeWidth="2.5" fill="none"/>
            <circle cx="658" cy="22" r="8" fill="var(--incrementic-red)"/>
            <text x="560" y="13" fill="var(--incrementic-red)" fontFamily="var(--ifm-font-family-monospace)" fontSize="10">next big workflow</text>
          </svg>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="AI Workflows by Incrementic"
      description="Learnings and workflows for modern AI development, branded and shaped for Incrementic.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
