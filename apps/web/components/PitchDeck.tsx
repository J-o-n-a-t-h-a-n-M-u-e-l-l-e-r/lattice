'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Logo } from './Logo';
import styles from './PitchDeck.module.css';

type IssueCard = {
  number: number;
  title: string;
  chaos: [number, number];
  graph: [number, number];
  drift: [number, number];
  arc: [number, number];
  duration: string;
  phase: string;
  tilt: number;
};

const issues: IssueCard[] = [
  { number: 1, title: 'Register Entra application', chaos: [12, 15], graph: [23, 15], drift: [15, -12], arc: [-10, 8], duration: '6.2s', phase: '-2.6s', tilt: -2 },
  { number: 3, title: 'Create Teams bot manifest', chaos: [37, 12], graph: [42, 15], drift: [-14, 13], arc: [11, -8], duration: '7.4s', phase: '-5.1s', tilt: 3 },
  { number: 5, title: 'Provision Key Vault secrets', chaos: [62, 16], graph: [61, 15], drift: [13, 15], arc: [-9, -10], duration: '5.8s', phase: '-1.7s', tilt: -4 },
  { number: 6, title: 'Configure Graph permissions', chaos: [87, 13], graph: [81, 15], drift: [-16, -11], arc: [10, 9], duration: '7.8s', phase: '-4.3s', tilt: 5 },
  { number: 13, title: 'Handle shared channel events', chaos: [12, 37], graph: [20, 33], drift: [14, 12], arc: [-11, -9], duration: '6.7s', phase: '-3.4s', tilt: 2 },
  { number: 14, title: 'Validate Graph webhooks', chaos: [38, 34], graph: [35, 33], drift: [-13, -15], arc: [9, 10], duration: '5.5s', phase: '-0.9s', tilt: -5 },
  { number: 17, title: 'Apply Purview retention labels', chaos: [63, 38], graph: [50, 33], drift: [16, -13], arc: [-10, 10], duration: '7.1s', phase: '-5.8s', tilt: 4 },
  { number: 19, title: 'Sync Teams messages', chaos: [87, 35], graph: [67, 33], drift: [-15, 12], arc: [10, -8], duration: '6.4s', phase: '-2.2s', tilt: -3 },
  { number: 20, title: 'Handle Conditional Access', chaos: [12, 61], graph: [84, 33], drift: [13, -16], arc: [-9, 11], duration: '7.6s', phase: '-4.7s', tilt: 5 },
  { number: 25, title: 'Sync Exchange calendars', chaos: [38, 57], graph: [25, 51], drift: [-14, 14], arc: [10, -9], duration: '5.9s', phase: '-3.1s', tilt: -4 },
  { number: 30, title: 'Add adaptive card actions', chaos: [62, 62], graph: [45, 51], drift: [15, -12], arc: [-11, 8], duration: '6.8s', phase: '-1.4s', tilt: 3 },
  { number: 31, title: 'Link SharePoint documents', chaos: [88, 58], graph: [65, 51], drift: [-12, 15], arc: [8, -10], duration: '7.3s', phase: '-5.4s', tilt: -5 },
  { number: 35, title: 'Add Azure Monitor telemetry', chaos: [12, 83], graph: [83, 51], drift: [14, -13], arc: [-10, 9], duration: '5.7s', phase: '-2.8s', tilt: 4 },
  { number: 37, title: 'Build admin consent workflow', chaos: [38, 79], graph: [45, 69], drift: [-15, -12], arc: [11, 8], duration: '7.7s', phase: '-4.1s', tilt: -3 },
  { number: 41, title: 'Route Defender audit alerts', chaos: [63, 85], graph: [65, 69], drift: [12, 16], arc: [-9, -11], duration: '6.1s', phase: '-0.5s', tilt: 2 },
  { number: 49, title: 'Enable tenant-wide rollout', chaos: [87, 81], graph: [55, 86], drift: [-16, -11], arc: [10, 8], duration: '7.2s', phase: '-3.7s', tilt: -4 },
  { number: 51, title: 'Configure deployment rings', chaos: [62, 73], graph: [83, 69], drift: [13, 14], arc: [-10, -9], duration: '5.6s', phase: '-2s', tilt: 3 },
];

const waves = [
  { index: 0, y: 15, label: 'Wave 0', detail: 'ready now · 4 issues' },
  { index: 1, y: 33, label: 'Wave 1', detail: 'after wave 0 · 5 issues' },
  { index: 2, y: 51, label: 'Wave 2', detail: 'after wave 1 · 4 issues' },
  { index: 3, y: 69, label: 'Wave 3', detail: 'after wave 2 · 3 issues' },
  { index: 4, y: 86, label: 'Wave 4', detail: 'after wave 3 · 1 issue' },
];

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return direction === 'left' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 5-7 7 7 7M8 12h9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.5 5 7 7-7 7M16 12H7" />
    </svg>
  );
}

function Mark() {
  return (
    <svg className={styles.mark} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.7 17.3 5.9v8.2L10 18.3l-7.3-4.2V5.9L10 1.7Z" />
      <path d="M10 1.7v16.6M2.7 5.9l14.6 8.2M17.3 5.9 2.7 14.1" />
    </svg>
  );
}

function IssueOpenedIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.2" />
      <circle cx="10" cy="10" r="1.65" className={styles.issueIconDot} />
    </svg>
  );
}

export function PitchDeck() {
  const [slide, setSlide] = useState(0);
  const [graphStage, setGraphStage] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const presenterChannel = useRef<BroadcastChannel | null>(null);
  const deckState = useRef({ slide, graphStage, blackout });
  deckState.current = { slide, graphStage, blackout };
  const graphOrganized = graphStage > 0;
  const titleStage = graphStage === 2;

  const next = () => {
    if (slide === 1 && graphStage < 2) {
      setGraphStage((stage) => stage + 1);
      return;
    }
    setSlide((current) => Math.min(current + 1, 3));
  };

  const previous = () => {
    if (slide === 1 && graphStage > 0) {
      setGraphStage((stage) => stage - 1);
      return;
    }
    setSlide((current) => Math.max(current - 1, 0));
  };

  const openPresenter = () => {
    window.open(
      '/pitch/presenter',
      'lattice-pitch-presenter',
      'popup=yes,width=1500,height=960,resizable=yes,scrollbars=no',
    );
  };

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('lattice-pitch-presenter');
    presenterChannel.current = channel;
    channel.onmessage = ({ data }) => {
      if (!data || data.source !== 'lattice-pitch-presenter') return;

      if (data.type === 'request-state') {
        channel.postMessage({ source: 'lattice-pitch-deck', type: 'state', ...deckState.current });
      }
      if (data.type === 'go-to') {
        const destination = Math.max(0, Math.min(3, Number(data.slide)));
        setSlide(destination);
        setGraphStage(destination === 1 ? Math.max(0, Math.min(2, Number(data.graphStage) || 0)) : 0);
      }
      if (data.type === 'blackout') setBlackout(Boolean(data.enabled));
    };

    return () => {
      channel.close();
      presenterChannel.current = null;
    };
  }, []);

  useEffect(() => {
    presenterChannel.current?.postMessage({
      source: 'lattice-pitch-deck',
      type: 'state',
      slide,
      graphStage,
      blackout,
    });
  }, [slide, graphStage, blackout]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPresenter();
        return;
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setBlackout((visible) => !visible);
        return;
      }
      if (target instanceof HTMLVideoElement) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        next();
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        previous();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slide, graphStage]);

  return (
    <main className={styles.deck} aria-label="Lattice pitch deck">
      <section className={`${styles.slide} ${slide === 0 ? styles.active : ''}`} aria-hidden={slide !== 0}>
        <article className={styles.playbookSurface}>
          <header className={styles.playbookHeader}>
            <svg className={styles.playbookIcon} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
              <path d="m7.5 12.2 3 3 6-6.2" />
            </svg>
            <h1>THE ONE-PAGE PLAYBOOK</h1>
          </header>
          <div className={styles.playbookRule} />
          <ol className={styles.playbookList}>
            <li><b>1</b><p><strong>Before 11:20:</strong> write the demo story, assign roles, create 5–8 small issues.</p></li>
            <li><b>2</b><p><strong>Deploy before lunch:</strong> configure CI/CD and ship the thinnest working journey.</p></li>
            <li><b>3</b><p><strong>Write the house rules (AGENTS.md):</strong> stack, conventions, build, and tests.</p></li>
            <li><b>4</b><p><strong>One issue per agent:</strong> clear acceptance criteria, constraints, own branch.</p></li>
            <li><b>5</b><p><strong>Require a small PR with green tests</strong> before anything reaches main.</p></li>
            <li><b>6</b><p><strong>Start with one or two agents;</strong> parallelize only independent work.</p></li>
            <li><b>7</b><p><strong>Freeze at 16:00:</strong> rehearse the 3-minute pitch, record a backup, submit by 17:00.</p></li>
          </ol>
          <p className={styles.playbookCaption}>If there&apos;s one slide to screenshot, this is it.</p>
        </article>
      </section>

      <section className={`${styles.slide} ${slide === 1 ? styles.active : ''}`} aria-hidden={slide !== 1}>
        <div
          className={`${styles.issueField} ${graphOrganized ? styles.organized : ''} ${titleStage ? styles.titleStage : ''}`}
          role="group"
          aria-label={titleStage
            ? 'Lattice'
            : graphOrganized
              ? 'GitHub issues arranged into work waves'
              : 'GitHub issues awaiting a work schedule'}
        >
          <div className={styles.graphSurface} aria-hidden={titleStage}>
            <svg className={styles.edges} viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="graph-arrow" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
                  <path d="M0 0 3 1.5 0 3Z" />
                </marker>
              </defs>
              <path d="M23 18 C23 25 20 27 20 31 M23 18 C27 25 35 27 35 31 M42 18 C42 25 50 27 50 31 M61 18 C60 25 50 27 50 31 M61 18 C64 25 67 27 67 31 M81 18 C80 25 67 27 67 31 M81 18 C84 25 84 27 84 31" />
              <path d="M20 36 C20 43 25 45 25 49 M35 36 C36 43 45 45 45 49 M50 36 C50 43 45 45 45 49 M50 36 C54 43 65 45 65 49 M67 36 C67 43 65 45 65 49 M67 36 C72 43 83 45 83 49 M84 36 C84 43 83 45 83 49" />
              <path d="M25 54 C26 61 45 63 45 67 M45 54 C45 61 45 63 45 67 M65 54 C65 61 65 63 65 67 M83 54 C80 61 65 63 65 67 M65 54 C72 61 83 63 83 67" />
              <path d="M45 72 C46 79 55 80 55 84 M65 72 C64 79 55 80 55 84 M83 72 C75 79 55 80 55 84" />
            </svg>
            <div className={styles.waveHeaders}>
              {waves.map((wave) => (
                <div
                  className={styles.waveHeader}
                  key={wave.index}
                  style={{ '--wave-y': `${wave.y}%` } as CSSProperties}
                >
                  <b>{wave.label}</b>
                  <span>{wave.detail}</span>
                </div>
              ))}
            </div>
            {issues.map((issue) => {
              const cardStyle = {
                '--chaos-x': `${issue.chaos[0]}%`,
                '--chaos-y': `${issue.chaos[1]}%`,
                '--graph-x': `${issue.graph[0]}%`,
                '--graph-y': `${issue.graph[1]}%`,
                '--drift-x': `${issue.drift[0]}px`,
                '--drift-y': `${issue.drift[1]}px`,
                '--arc-x': `${issue.arc[0]}px`,
                '--arc-y': `${issue.arc[1]}px`,
                '--float-duration': issue.duration,
                '--float-phase': issue.phase,
                '--tilt': `${issue.tilt}deg`,
              } as CSSProperties;
              return (
                <article
                  className={styles.issueCard}
                  style={cardStyle}
                  key={issue.number}
                  aria-label={`GitHub issue #${issue.number}: ${issue.title}`}
                >
                  <span className={styles.issueMeta}>
                    <IssueOpenedIcon />
                    <span>#{String(issue.number).padStart(2, '0')}</span>
                  </span>
                  <b>{issue.title}</b>
                </article>
              );
            })}
          </div>
          <div className={styles.projectTitleReveal} aria-hidden={!titleStage}>
            <div className={styles.projectTitleLockup}>
              <Logo className={styles.projectLogo} />
              <h1>Lattice</h1>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.slide} ${slide === 2 ? styles.active : ''}`} aria-hidden={slide !== 2}>
        <div className={styles.systemHeading}>
          <p className={styles.kicker}>ONE PASS. A SHARED SCHEDULE.</p>
          <h2>
            Turn issue text into
            <br />
            <em>safe parallel work.</em>
          </h2>
          <p>
            Lattice reads the backlog once, infers the graph, and gives every
            teammate the same answer to “what should happen next?”
          </p>
        </div>

        <div className={styles.systemMap}>
          <div className={styles.systemRail} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <article className={styles.systemStep}>
            <div className={styles.stepNumber}>01</div>
            <Mark />
            <h3>Read, never write</h3>
            <p>GitHub issues, native blockers, and sub-issues stay the source of truth.</p>
            <span className={styles.stepFoot}>NO COMMENTS · NO LABELS · NO RISK</span>
          </article>
          <article className={styles.systemStep}>
            <div className={styles.stepNumber}>02</div>
            <Mark />
            <h3>Infer, then prove</h3>
            <p>Every suggested edge needs verbatim evidence. Invalid guesses are rejected.</p>
            <span className={styles.stepFoot}>63 CANDIDATES → 40 VALIDATED</span>
          </article>
          <article className={styles.systemStep}>
            <div className={styles.stepNumber}>03</div>
            <Mark />
            <h3>Schedule the team</h3>
            <p>The graph becomes waves, a critical path, and MCP tools that agents can act on.</p>
            <span className={styles.stepFoot}>GRAPH · REST · MCP</span>
          </article>
        </div>

        <div className={styles.systemProof}>
          <span>THE OUTCOME</span>
          <p>
            One expensive reasoning pass becomes the scheduler for every cheap
            agent run after it.
          </p>
          <div>
            <b>3</b><small>waves</small>
            <b>16</b><small>blocking edges</small>
            <b>0</b><small>GitHub writes</small>
          </div>
        </div>
      </section>

      <section className={`${styles.slide} ${slide === 3 ? styles.active : ''}`} aria-hidden={slide !== 3}>
        <div className={styles.demoHeading}>
          <p className={styles.kicker}>THE DEMO / 01:20</p>
          <h2>Watch the plan<br />become executable.</h2>
          <p>From a GitHub issue edit to an agent-ready work wave, without a human triaging every handoff.</p>
        </div>
        <div className={styles.videoFrame}>
          <video
            controls
            playsInline
            preload="metadata"
            className={`${styles.demoVideo} ${videoReady ? styles.videoReady : ''}`}
            onLoadedData={() => setVideoReady(true)}
            onError={() => setVideoMissing(true)}
          >
            <source src="/pitch/lattice-demo.mp4" type="video/mp4" />
          </video>
          {!videoReady && (
            <div className={styles.videoFallback}>
              <div className={styles.videoFallbackGraph} aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </div>
              <Mark />
              <strong>{videoMissing ? 'DEMO RECORDING READY HERE' : 'LOADING DEMO RECORDING'}</strong>
              <span>
                {videoMissing
                  ? 'Add lattice-demo.mp4 to apps/web/public/pitch/'
                  : 'Issue event → validated graph → agent dispatch'}
              </span>
            </div>
          )}
          <div className={styles.videoStamp}>
            <span>LIVE PATH</span>
            <b>ISSUE → GRAPH → AGENT</b>
          </div>
        </div>
        <div className={styles.demoBeats}>
          <span><b>00</b> Issue changes</span>
          <span><b>20</b> Edges validated</span>
          <span><b>45</b> Wave zero starts</span>
          <span><b>75</b> Graph learns</span>
        </div>
        <p className={styles.demoClose}>
          The graph is not a report. It is the coordination layer.
        </p>
      </section>

      <footer className={styles.pitchFooter}>
        Alba · Albert · Jonathan · Nicolas · Tong&nbsp;&nbsp;—&nbsp;&nbsp;Microsoft Summer Mini-Hackathon 2026
      </footer>
      <output className={styles.slideNumber} aria-label={`Slide ${slide + 1}`}>
        {String(slide + 1).padStart(2, '0')}
      </output>
      {blackout && <div className={styles.blackout} aria-label="Audience screen blacked out" />}
    </main>
  );
}
