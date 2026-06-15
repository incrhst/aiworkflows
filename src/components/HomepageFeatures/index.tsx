import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  renderIcon: () => ReactNode;
  description: ReactNode;
};

const ProductiveSvg = () => (
  <svg className={styles.featureSvg} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="20" width="70" height="60" rx="8" stroke="var(--incrementic-red)" strokeWidth="4" fill="none"/>
    <path d="M30 40 L45 50 L30 60" stroke="var(--incrementic-red)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="53" y1="60" x2="70" y2="60" stroke="var(--ifm-text-color)" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const ShapeShipSvg = () => (
  <svg className={styles.featureSvg} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="75" r="8" fill="var(--ifm-text-color)" opacity="0.6"/>
    <path d="M25 75 C 45 75, 50 25, 75 25" stroke="var(--ifm-color-emphasis-300)" strokeWidth="3" fill="none"/>
    <path d="M25 75 L 75 25" stroke="var(--incrementic-red)" strokeWidth="4" strokeDasharray="6 6"/>
    <circle cx="75" cy="25" r="10" fill="var(--incrementic-red)"/>
  </svg>
);

const PeoplePixelsSvg = () => (
  <svg className={styles.featureSvg} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="35" r="18" stroke="var(--incrementic-red)" strokeWidth="4"/>
    <path d="M20 80 C 20 60, 35 55, 50 55 C 65 55, 80 60, 80 80" stroke="var(--ifm-text-color)" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const FeatureList: FeatureItem[] = [
  {
    title: 'Plain & Productive',
    renderIcon: ProductiveSvg,
    description: (
      <>
        We value plain over clever. No jargon, no unnecessary abstractions. Just production-ready AI pipelines, clear patterns, and actionable blueprints.
      </>
    ),
  },
  {
    title: 'Shape & Ship',
    renderIcon: ShapeShipSvg,
    description: (
      <>
        The shortest distance to your next AI build. We focus on curating highly-optimized workflows that let you design, build, and deploy with absolute confidence.
      </>
    ),
  },
  {
    title: 'People over Pixels',
    renderIcon: PeoplePixelsSvg,
    description: (
      <>
        AI in service of human outcomes. We believe in building technology that enhances developer capabilities, respects the reader's time, and solves real problems.
      </>
    ),
  },
];

function Feature({title, renderIcon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-vert--md">
        {renderIcon()}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3" style={{ fontFamily: 'var(--ifm-heading-font-family)', fontWeight: 600 }}>{title}</Heading>
        <p style={{ color: 'var(--ifm-text-color)', opacity: 0.85, fontSize: '0.95rem' }}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
