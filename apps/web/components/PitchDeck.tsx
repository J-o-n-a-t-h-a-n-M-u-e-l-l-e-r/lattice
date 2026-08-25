'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './PitchDeck.module.css';

type IssueCard = {
  number: number;
  title: string;
  chaos: [number, number];
  graph: [number, number];
  tone?: 'blue' | 'coral';
};

const issues: IssueCard[] = [
  { number: 1, title: 'Types contract', chaos: [8, 23], graph: [9, 18] },
  { number: 3, title: 'Graph store', chaos: [35, 8], graph: [24, 13] },
  { number: 5, title: 'Ingest issues', chaos: [63, 16], graph: [38, 18] },
  { number: 6, title: 'Read deps', chaos: [90, 13], graph: [9, 47] },
  { number: 13, title: 'LLM extraction', chaos: [22, 34], graph: [24, 42] },
  { number: 14, title: 'Validators', chaos: [49, 28], graph: [39, 47] },
  { number: 17, title: 'Tarjan', chaos: [78, 32], graph: [13, 76], tone: 'coral' },
  { number: 19, title: 'Work waves', chaos: [5, 54], graph: [29, 69] },
  { number: 20, title: 'Critical path', chaos: [34, 55], graph: [45, 76], tone: 'coral' },
  { number: 25, title: 'Graph view', chaos: [61, 48], graph: [64, 18] },
  { number: 30, title: 'MCP route', chaos: [91, 48], graph: [78, 13] },
  { number: 31, title: 'Agent tools', chaos: [17, 70], graph: [93, 23] },
  { number: 35, title: 'Simulate', chaos: [47, 73], graph: [64, 47] },
  { number: 37, title: 'Dispatch', chaos: [72, 66], graph: [82, 42] },
  { number: 41, title: 'Demo mode', chaos: [92, 72], graph: [60, 76] },
  { number: 49, title: 'Runs UI', chaos: [27, 88], graph: [76, 70] },
  { number: 51, title: 'Serialize', chaos: [53, 90], graph: [92, 76] },
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
        <div className={styles.introCopy}>
          <p className={styles.kicker}>THE PLANNING PROBLEM</p>
          <h1>
            A backlog is a flat list
            <br />
            <em>pretending</em> to be a plan.
          </h1>
          <p className={styles.introBody}>
            Humans remember the order. Agents do not. So every run re-discovers
            the same dependencies and still starts work too early.
          </p>
        </div>

        <div className={`${styles.issueField} ${revealed ? styles.revealed : ''}`} aria-hidden="true">
          <svg className={styles.edges} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M9 18 24 13 38 18M9 47 24 42 39 47M13 76 29 69 45 76M64 18 78 13 93 23M64 47 82 42 92 76M60 76 76 70 92 76" />
            <path d="M24 13 24 42M38 18 39 47M29 69 24 42M45 76 39 47M78 13 82 42M82 42 76 70M64 18 64 47 60 76" />
            <path className={styles.criticalEdge} d="M39 47 45 76M64 47 60 76" />
          </svg>
          {issues.map((issue) => {
            const cardStyle = {
              '--chaos-x': `${issue.chaos[0]}%`,
              '--chaos-y': `${issue.chaos[1]}%`,
              '--graph-x': `${issue.graph[0]}%`,
              '--graph-y': `${issue.graph[1]}%`,
            } as CSSProperties;
            return (
              <div
                className={`${styles.issueCard} ${issue.tone === 'coral' ? styles.issueCoral : ''}`}
                style={cardStyle}
                key={issue.number}
              >
                <span>#{String(issue.number).padStart(2, '0')}</span>
                <b>{issue.title}</b>
              </div>
            );
          })}
          <div className={styles.latticeLockup}>
            <span>THE HIDDEN GRAPH</span>
            <strong>LATTICE</strong>
            <small>53 issues → 16 blocking edges → 3 work waves</small>
          </div>
        </div>

        <div className={styles.introFooter}>
          <p>{revealed ? 'Now everyone can see the order.' : '54 issues. No shared plan.'}</p>
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
