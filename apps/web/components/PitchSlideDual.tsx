// Slide: two readings of the same graph, shown with real product screenshots.
// Left = top-down, right = bottom-up. Labels only; the speaker explains.
import styles from './PitchDeck.module.css';

export function PitchSlideDual() {
  return (
    <>
      <div className={`${styles.systemHeading} ${styles.dualHeading}`}>
        <p className={styles.kicker}>TWO WAYS TO READ ONE GRAPH</p>
        <h2>
          Top-down meets
          <br />
          <em>bottom-up.</em>
        </h2>
      </div>

      <div className={styles.dualMap}>
        <figure className={styles.dualShot}>
          <figcaption>
            <b>TOP-DOWN</b>
          </figcaption>
          <img
            src="/pitch/top-down.png"
            alt="Graph view: issue #1 highlighted with every downstream issue it unblocks"
          />
        </figure>

        <figure className={styles.dualShot}>
          <figcaption>
            <b>BOTTOM-UP</b>
          </figcaption>
          <img
            src="/pitch/bottom-up.png"
            alt="Graph view: target issue #24 highlighted with its ordered prerequisites"
          />
        </figure>
      </div>
    </>
  );
}
