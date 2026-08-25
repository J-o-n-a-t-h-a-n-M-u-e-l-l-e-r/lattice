'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  tone?: 'blue' | 'coral';
};

const issues: IssueCard[] = [
  { number: 1, title: 'Types contract', chaos: [12, 15], graph: [14, 18], drift: [15, -12], arc: [-10, 8], duration: '6.2s', phase: '-2.6s', tilt: -2 },
  { number: 3, title: 'Graph store', chaos: [37, 12], graph: [38, 18], drift: [-14, 13], arc: [11, -8], duration: '7.4s', phase: '-5.1s', tilt: 3 },
  { number: 5, title: 'Ingest issues', chaos: [62, 16], graph: [62, 18], drift: [13, 15], arc: [-9, -10], duration: '5.8s', phase: '-1.7s', tilt: -4 },
  { number: 6, title: 'Read deps', chaos: [87, 13], graph: [86, 18], drift: [-16, -11], arc: [10, 9], duration: '7.8s', phase: '-4.3s', tilt: 5 },
  { number: 13, title: 'LLM extraction', chaos: [12, 37], graph: [14, 39], drift: [14, 12], arc: [-11, -9], duration: '6.7s', phase: '-3.4s', tilt: 2 },
  { number: 14, title: 'Validators', chaos: [38, 34], graph: [38, 39], drift: [-13, -15], arc: [9, 10], duration: '5.5s', phase: '-0.9s', tilt: -5 },
  { number: 17, title: 'Tarjan', chaos: [63, 38], graph: [10, 60], drift: [16, -13], arc: [-10, 10], duration: '7.1s', phase: '-5.8s', tilt: 4, tone: 'coral' },
  { number: 19, title: 'Work waves', chaos: [87, 35], graph: [30, 60], drift: [-15, 12], arc: [10, -8], duration: '6.4s', phase: '-2.2s', tilt: -3 },
  { number: 20, title: 'Critical path', chaos: [12, 61], graph: [14, 81], drift: [13, -16], arc: [-9, 11], duration: '7.6s', phase: '-4.7s', tilt: 5, tone: 'coral' },
  { number: 25, title: 'Graph view', chaos: [38, 57], graph: [62, 39], drift: [-14, 14], arc: [10, -9], duration: '5.9s', phase: '-3.1s', tilt: -4 },
  { number: 30, title: 'MCP route', chaos: [62, 62], graph: [86, 39], drift: [15, -12], arc: [-11, 8], duration: '6.8s', phase: '-1.4s', tilt: 3 },
  { number: 31, title: 'Agent tools', chaos: [88, 58], graph: [90, 60], drift: [-12, 15], arc: [8, -10], duration: '7.3s', phase: '-5.4s', tilt: -5 },
  { number: 35, title: 'Simulate', chaos: [12, 83], graph: [50, 60], drift: [14, -13], arc: [-10, 9], duration: '5.7s', phase: '-2.8s', tilt: 4 },
  { number: 37, title: 'Dispatch', chaos: [38, 79], graph: [70, 60], drift: [-15, -12], arc: [11, 8], duration: '7.7s', phase: '-4.1s', tilt: -3 },
  { number: 41, title: 'Demo mode', chaos: [63, 85], graph: [38, 81], drift: [12, 16], arc: [-9, -11], duration: '6.1s', phase: '-0.5s', tilt: 2 },
  { number: 49, title: 'Runs UI', chaos: [87, 81], graph: [62, 81], drift: [-16, -11], arc: [10, 8], duration: '7.2s', phase: '-3.7s', tilt: -4 },
  { number: 51, title: 'Serialize', chaos: [62, 73], graph: [86, 81], drift: [13, 14], arc: [-10, -9], duration: '5.6s', phase: '-2s', tilt: 3 },
];

const waves = [
  { index: 0, y: 5, label: 'Wave 0', detail: 'start now · 4' },
  { index: 1, y: 27, label: 'Wave 1', detail: 'after wave 0 · 4' },
  { index: 2, y: 48, label: 'Wave 2', detail: 'after wave 1 · 5' },
  { index: 3, y: 69, label: 'Wave 3', detail: 'after wave 2 · 4' },
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
  const [revealed, setRevealed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const presenterChannel = useRef<BroadcastChannel | null>(null);
  const deckState = useRef({ slide, revealed, blackout });
  deckState.current = { slide, revealed, blackout };

  const next = () => {
    if (slide === 0 && !revealed) {
      setRevealed(true);
      return;
    }
    setSlide((current) => Math.min(current + 1, 2));
  };

  const previous = () => {
    if (slide === 0 && revealed) {
      setRevealed(false);
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
        const destination = Math.max(0, Math.min(2, Number(data.slide)));
        setSlide(destination);
        setRevealed(destination === 0 ? Boolean(data.revealed) : false);
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
      revealed,
      blackout,
    });
  }, [slide, revealed, blackout]);

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
  }, [slide, revealed]);

  return (
    <main className={styles.deck} aria-label="Lattice pitch deck">
      <header className={styles.topbar}>
        <div className={styles.wordmark}>
          <Mark />
          <span>LATTICE</span>
          <span className={styles.deckLabel}>PITCH / 03 MIN</span>
        </div>
      </header>

      <section className={`${styles.slide} ${slide === 0 ? styles.active : ''}`} aria-hidden={slide !== 0}>
        <div
          className={`${styles.issueField} ${revealed ? styles.revealed : ''}`}
          role="group"
          aria-label={revealed ? 'GitHub issues arranged into work waves' : 'GitHub issues awaiting a work schedule'}
        >
          <svg className={styles.edges} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="graph-arrow" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
                <path d="M0 0 3 1.5 0 3Z" />
              </marker>
            </defs>
            <path d="M14 20 14 37M14 20 38 37M38 20 38 37M62 20 62 37M62 20 86 37M86 20 86 37" />
            <path d="M14 41 10 58M14 41 30 58M38 41 30 58M38 41 50 58M62 41 50 58M62 41 70 58M86 41 70 58M86 41 90 58" />
            <path d="M10 62 14 79M30 62 14 79M30 62 38 79M50 62 38 79M50 62 62 79M70 62 62 79M70 62 86 79M90 62 86 79" />
            <path className={styles.criticalEdge} d="M10 62 14 79M50 62 62 79" />
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
                className={`${styles.issueCard} ${issue.tone === 'coral' ? styles.issueCoral : ''}`}
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
      </section>

      <section className={`${styles.slide} ${slide === 1 ? styles.active : ''}`} aria-hidden={slide !== 1}>
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

      <section className={`${styles.slide} ${slide === 2 ? styles.active : ''}`} aria-hidden={slide !== 2}>
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

      {blackout && <div className={styles.blackout} aria-label="Audience screen blacked out" />}
    </main>
  );
}
