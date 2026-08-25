'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import styles from './PitchPresenter.module.css';

type DeckState = {
  slide: number;
  playbookStage: number;
  graphStage: number;
  blackout: boolean;
};

const slides = [
  {
    title: 'The one-page playbook',
    note: 'Start here. This is the team’s operating contract: a thin working journey, clear ownership, small PRs, and time left to rehearse.',
  },
  {
    title: 'The hidden graph',
    note: 'Ask which work can safely start right now. Let the floating issues establish the problem, then reveal the schedule.',
    titleStage: {
      title: 'Lattice',
      note: 'Let the settled graph resolve into the project title, then advance to the shared schedule.',
    },
  },
  {
    title: 'The system architecture',
    note: 'Walk the spine left to right: GitHub in, one inference pass, one graph. Then the split — a view for people, MCP for agents. Land on the return arrow: agents report what they discover, so the graph gets better as work happens. Say out loud that nothing is written back to GitHub.',
  },
  {
    title: 'Top-down meets bottom-up.',
    note: 'Point at the screenshots, keep it short. Left: start from ready work, everything it unblocks lights up. Right: pick a target, the graph orders its prerequisites — agents follow that path.',
  },
];

function ClockIcon({ reset = false }: { reset?: boolean }) {
  return reset ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" /></svg>
  );
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.7 10.8a2 2 0 0 0 2.5 2.5M5.3 6.6C3.8 8.3 3 10.3 3 12c0 2.8 3.7 7 9 7 1 0 2-.2 2.9-.6M9.8 4.2c.7-.2 1.4-.2 2.2-.2 5.3 0 9 4.2 9 8 0 1.4-.6 3-1.7 4.4" /></svg>;
}

function IssueOpenedIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.2" />
      <circle cx="10" cy="10" r="1.65" />
    </svg>
  );
}

function Preview({ index, graphStage = 0, playbookStage = 0 }: { index: number; graphStage?: number; playbookStage?: number }) {
  if (index === 0) {
    const points = [
      'Write the demo story',
      'Deploy before lunch',
      'Write the house rules',
      'One issue per agent',
      'Green tests before main',
      'Parallelize independent work',
      'Freeze, rehearse, submit',
    ];
    return (
      <div className={`${styles.previewSlide} ${styles.previewPlaybook}`}>
        <div className={styles.previewPlaybookHeader}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="m7.5 12.2 3 3 6-6.2" /></svg>
          <strong>THE ONE-PAGE PLAYBOOK</strong>
        </div>
        <div className={styles.previewPlaybookRule} />
        <ol className={styles.previewPlaybookList}>
          {points.map((point, pointIndex) => (
            <li key={point}>
              <b>{pointIndex + 1}</b>
              <span className={pointIndex === 5 && playbookStage > 0 ? styles.previewHighlight : undefined}>{point}</span>
            </li>
          ))}
        </ol>
        <p>If there&apos;s one slide to screenshot, this is it.</p>
      </div>
    );
  }

  if (index === 1) {
    const organized = graphStage > 0;
    const titleStage = graphStage === 2;
    return (
      <div className={`${styles.previewSlide} ${styles.previewIntro} ${titleStage ? styles.previewTitleStage : ''}`}>
        <div className={`${styles.previewIssues} ${organized ? styles.previewOrganized : ''}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="preview-graph-arrow" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto">
                <path d="M0 0 3 1.5 0 3Z" />
              </marker>
            </defs>
            <path d="M23 18 C23 25 20 27 20 31 M23 18 C27 25 35 27 35 31 M42 18 C42 25 50 27 50 31 M61 18 C60 25 50 27 50 31 M61 18 C64 25 67 27 67 31 M81 18 C80 25 67 27 67 31 M81 18 C84 25 84 27 84 31" />
            <path d="M20 36 C20 43 25 45 25 49 M35 36 C36 43 45 45 45 49 M50 36 C50 43 45 45 45 49 M50 36 C54 43 65 45 65 49 M67 36 C67 43 65 45 65 49 M67 36 C72 43 83 45 83 49 M84 36 C84 43 83 45 83 49" />
            <path d="M25 54 C26 61 45 63 45 67 M45 54 C45 61 45 63 45 67 M65 54 C65 61 65 63 65 67 M83 54 C80 61 65 63 65 67 M65 54 C72 61 83 63 83 67" />
            <path d="M45 72 C46 79 55 80 55 84 M65 72 C64 79 55 80 55 84 M83 72 C75 79 55 80 55 84" />
          </svg>
          <div className={styles.previewWaveLabels} aria-hidden="true">
            <span>Wave 0<small>ready now · 4</small></span>
            <span>Wave 1<small>after wave 0 · 5</small></span>
            <span>Wave 2<small>after wave 1 · 4</small></span>
            <span>Wave 3<small>after wave 2 · 3</small></span>
            <span>Wave 4<small>after wave 3 · 1</small></span>
          </div>
          {['#01', '#03', '#05', '#06', '#13', '#14', '#17', '#19', '#20', '#25', '#30', '#31', '#35', '#37', '#41', '#51', '#49'].map((issue) => (
            <span key={issue} aria-label={`GitHub issue ${issue}`}>
              <IssueOpenedIcon />
              {issue}
            </span>
          ))}
        </div>
        <div className={styles.previewProjectTitle}>
          <Logo />
          <span>Lattice</span>
        </div>
        <div className={styles.previewProjectFooter}>
          Alba · Albert · Jonathan · Nicolas · Tong
          <br />
          Microsoft Summer Mini-Hackathon 2026
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className={`${styles.previewSlide} ${styles.previewSystem}`}>
        <div className={styles.previewKicker}>ONE PASS. A SHARED SCHEDULE.</div>
        <strong>TURN ISSUE TEXT INTO<br /><em>SAFE PARALLEL WORK.</em></strong>
        <div className={styles.previewSteps}>
          <span>01<br /><b>READ</b></span>
          <span>02<br /><b>PROVE</b></span>
          <span>03<br /><b>SCHEDULE</b></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.previewSlide} ${styles.previewSystem}`}>
      <div className={styles.previewKicker}>TWO WAYS TO READ ONE GRAPH</div>
      <strong>TOP-DOWN MEETS<br /><em>BOTTOM-UP.</em></strong>
      <div className={styles.previewSteps}>
        <span>⇉<br /><b>WAVES</b></span>
        <span>↳<br /><b>DEPS</b></span>
      </div>
    </div>
  );
}

function formatElapsed(value: number) {
  const seconds = Math.floor(value / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PitchPresenter() {
  const [deck, setDeck] = useState<DeckState>({ slide: 0, playbookStage: 0, graphStage: 0, blackout: false });
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState(slides[0].note);
  const channel = useRef<BroadcastChannel | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const broadcast = new BroadcastChannel('lattice-pitch-presenter');
    channel.current = broadcast;
    broadcast.onmessage = ({ data }) => {
      if (!data || data.source !== 'lattice-pitch-deck' || data.type !== 'state') return;
      setDeck({
        slide: data.slide,
        playbookStage: data.slide === 0 ? Math.max(0, Math.min(1, Number(data.playbookStage) || 0)) : 0,
        graphStage: data.slide === 1 ? Math.max(0, Math.min(2, Number(data.graphStage) || 0)) : 0,
        blackout: data.blackout,
      });
      setConnected(true);
    };
    broadcast.postMessage({ source: 'lattice-pitch-presenter', type: 'request-state' });

    const disconnectTimer = window.setTimeout(() => setConnected((live) => live), 1000);
    return () => {
      window.clearTimeout(disconnectTimer);
      broadcast.close();
      channel.current = null;
    };
  }, []);

  const currentSlide = slides[deck.slide];
  const graphSlide = slides[1]!;
  const graphTitleStage = graphSlide.titleStage!;
  const inTitleStage = deck.slide === 1 && deck.graphStage === 2;
  const currentTitle = inTitleStage ? graphTitleStage.title : currentSlide!.title;
  const currentNote = inTitleStage ? graphTitleStage.note : currentSlide!.note;

  useEffect(() => {
    const noteKey = inTitleStage ? `${deck.slide}-title` : String(deck.slide);
    const saved = window.localStorage.getItem(`lattice-pitch-note-${noteKey}`);
    setNotes(saved ?? currentNote);
  }, [currentNote, deck.slide, inTitleStage]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => window.clearInterval(interval);
  }, [running]);

  const goTo = (slide: number) => {
    channel.current?.postMessage({
      source: 'lattice-pitch-presenter',
      type: 'go-to',
      slide,
      playbookStage: 0,
      graphStage: 0,
    });
  };

  const toggleTimer = () => {
    if (running) {
      setElapsed(performance.now() - startedAt.current);
      setRunning(false);
      return;
    }
    startedAt.current = performance.now() - elapsed;
    setRunning(true);
  };

  const resetTimer = () => {
    setElapsed(0);
    startedAt.current = performance.now();
  };

  const toggleBlackout = () => {
    channel.current?.postMessage({
      source: 'lattice-pitch-presenter',
      type: 'blackout',
      enabled: !deck.blackout,
    });
  };

  const saveNotes = (value: string) => {
    setNotes(value);
    const noteKey = inTitleStage ? `${deck.slide}-title` : String(deck.slide);
    window.localStorage.setItem(`lattice-pitch-note-${noteKey}`, value);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;
      if (event.key.toLowerCase() === 's') toggleTimer();
      if (event.key.toLowerCase() === 'r') resetTimer();
      if (event.key.toLowerCase() === 'b') toggleBlackout();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const next = deck.slide === 0 && deck.playbookStage < 1
    ? { slide: 0, playbookStage: 1, graphStage: 0, title: 'Highlight parallel work' }
    : deck.slide === 1 && deck.graphStage < 2
      ? {
          slide: 1,
          playbookStage: 0,
          graphStage: deck.graphStage + 1,
          title: deck.graphStage === 0 ? 'Organize the graph' : graphTitleStage.title,
        }
      : deck.slide < slides.length - 1
        ? { slide: deck.slide + 1, playbookStage: 0, graphStage: 0, title: slides[deck.slide + 1]!.title }
        : null;

  return (
    <main className={styles.presenter}>
      <header className={styles.topbar}>
        <div>
          <strong className={styles.brand}>LATTICE / PRESENTER</strong>
          <span className={`${styles.connection} ${connected ? styles.live : ''}`}>
            {connected ? 'Connected to audience view' : 'Waiting for audience view'}
          </span>
        </div>
        <div className={styles.timer}>
          <button onClick={toggleTimer} type="button" aria-label={running ? 'Pause timer' : 'Start timer'}>
            <ClockIcon />
          </button>
          <output>{formatElapsed(elapsed)}</output>
          <button onClick={resetTimer} type="button" aria-label="Reset timer">
            <ClockIcon reset />
          </button>
        </div>
        <div className={styles.actions}>
          <time>{new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date())}</time>
          <button className={deck.blackout ? styles.activeBlackout : ''} onClick={toggleBlackout} type="button">
            <EyeIcon /> Blackout
          </button>
          <button onClick={() => window.close()} type="button" aria-label="Close presenter view">×</button>
        </div>
      </header>

      <section className={styles.workspace}>
        <article className={`${styles.panel} ${styles.currentPanel}`}>
          <header><span>Current slide</span><b>{currentTitle}</b></header>
          <div className={styles.previewWrap}><Preview index={deck.slide} graphStage={deck.graphStage} playbookStage={deck.playbookStage} /></div>
          <div className={styles.progress}><span style={{ width: `${((deck.slide + 1) / slides.length) * 100}%` }} /></div>
        </article>

        <div className={styles.sideColumn}>
          <article className={`${styles.panel} ${styles.nextPanel}`}>
            <header><span>Next</span><b>{next === null ? 'End of presentation' : next.title}</b></header>
            <div className={styles.previewWrap}>
              {next === null ? <p className={styles.end}>End of presentation</p> : <Preview index={next.slide} graphStage={next.graphStage} playbookStage={next.playbookStage} />}
            </div>
          </article>
          <article className={`${styles.panel} ${styles.notesPanel}`}>
            <header><span>Speaker notes</span><b>Saved in this browser</b></header>
            <textarea value={notes} onChange={(event) => saveNotes(event.target.value)} aria-label="Speaker notes" />
          </article>
        </div>
      </section>

      <nav className={styles.filmstrip} aria-label="Slides">
        <header><span>All slides</span><b>{String(deck.slide + 1).padStart(2, '0')}</b></header>
        <div>
          {slides.map((slide, index) => (
            <button
              className={index === deck.slide ? styles.activeThumbnail : undefined}
              key={slide.title}
              onClick={() => goTo(index)}
              type="button"
              aria-label={`Go to ${slide.title}`}
            >
              <Preview index={index} />
              <span>{String(index + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
