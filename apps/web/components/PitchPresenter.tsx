'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PitchPresenter.module.css';

type DeckState = {
  slide: number;
  revealed: boolean;
  blackout: boolean;
};

const slides = [
  {
    title: 'The hidden graph',
    note: 'Ask which work can safely start right now. Let the floating issues establish the problem, then reveal the schedule.',
  },
  {
    title: 'One pass. A shared schedule.',
    note: 'The point is not visualization. One reasoning pass produces an auditable schedule that humans and agents share.',
  },
  {
    title: 'Watch it become executable.',
    note: 'Play the 75-second recording. Show the issue event, evidence trail, work wave, and agent feedback loop.',
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

function Preview({ index, revealed = false }: { index: number; revealed?: boolean }) {
  if (index === 0) {
    return (
      <div className={`${styles.previewSlide} ${styles.previewIntro}`}>
        <div className={`${styles.previewIssues} ${revealed ? styles.previewRevealed : ''}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M14 20 14 37M14 20 38 37M38 20 38 37M62 20 62 37M62 20 86 37M86 20 86 37" />
            <path d="M14 41 10 58M14 41 30 58M38 41 30 58M38 41 50 58M62 41 50 58M62 41 70 58M86 41 70 58M86 41 90 58" />
            <path d="M10 62 14 79M30 62 14 79M30 62 38 79M50 62 38 79M50 62 62 79M70 62 62 79M70 62 86 79M90 62 86 79" />
          </svg>
          {['#01', '#05', '#13', '#17', '#19', '#25', '#30', '#37', '#49'].map((issue) => (
            <span key={issue} aria-label={`GitHub issue ${issue}`}>
              <IssueOpenedIcon />
              {issue}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (index === 1) {
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
    <div className={`${styles.previewSlide} ${styles.previewDemo}`}>
      <div className={styles.previewKicker}>THE DEMO / 01:20</div>
      <strong>WATCH THE PLAN<br />BECOME EXECUTABLE.</strong>
      <div className={styles.previewVideo}>ISSUE → GRAPH → AGENT</div>
    </div>
  );
}

function formatElapsed(value: number) {
  const seconds = Math.floor(value / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PitchPresenter() {
  const [deck, setDeck] = useState<DeckState>({ slide: 0, revealed: false, blackout: false });
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
      setDeck({ slide: data.slide, revealed: data.revealed, blackout: data.blackout });
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

  useEffect(() => {
    const saved = window.localStorage.getItem(`lattice-pitch-note-${deck.slide}`);
    setNotes(saved ?? slides[deck.slide].note);
  }, [deck.slide]);

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
      revealed: false,
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
    window.localStorage.setItem(`lattice-pitch-note-${deck.slide}`, value);
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

  const next = deck.slide < slides.length - 1 ? deck.slide + 1 : null;

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
          <header><span>Current slide</span><b>{slides[deck.slide].title}</b></header>
          <div className={styles.previewWrap}><Preview index={deck.slide} revealed={deck.revealed} /></div>
          <div className={styles.progress}><span style={{ width: `${((deck.slide + 1) / slides.length) * 100}%` }} /></div>
        </article>

        <div className={styles.sideColumn}>
          <article className={`${styles.panel} ${styles.nextPanel}`}>
            <header><span>Next slide</span><b>{next === null ? 'End of presentation' : slides[next].title}</b></header>
            <div className={styles.previewWrap}>
              {next === null ? <p className={styles.end}>End of presentation</p> : <Preview index={next} />}
            </div>
          </article>
          <article className={`${styles.panel} ${styles.notesPanel}`}>
            <header><span>Speaker notes</span><b>Saved in this browser</b></header>
            <textarea value={notes} onChange={(event) => saveNotes(event.target.value)} aria-label="Speaker notes" />
          </article>
        </div>
      </section>

      <nav className={styles.filmstrip} aria-label="Slides">
        <header><span>All slides</span><b>{String(deck.slide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</b></header>
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
