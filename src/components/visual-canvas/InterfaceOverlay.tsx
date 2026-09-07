import styles from "./InterfaceOverlay.module.css";

export function InterfaceOverlay() {
  return (
    <section
      className={styles.interface}
      aria-label="Texcra Continuum Craft visualizer"
    >
      <div className={styles.frame} aria-hidden="true">
        <span className={`${styles.frameNotch} ${styles.frameNotchTop}`} />
        <span className={`${styles.frameNotch} ${styles.frameNotchBottom}`} />
      </div>

      <header className={styles.masthead}>
        <div>
          <p className={styles.wordmark}>TEXCRA</p>
          <p className={styles.brandLine}>Technology&nbsp; / &nbsp;Craftsmanship</p>
        </div>
        <div className={styles.observation}>
          <p>Observation TC–01</p>
          <p>A system of care</p>
        </div>
      </header>

      <div className={styles.heroCopy}>
        <span className={styles.heroRule} aria-hidden="true" />
        <p className={styles.eyebrow}>Material study / 01</p>
        <h1>
          Continuum
          <br />
          Craft
        </h1>
        <p className={styles.tagline}>Precision becomes atmosphere</p>
      </div>

      <div className={styles.continuityPanel}>
        <span className={styles.panelHeading}>
          Continuity index
          <span className={styles.signal} />
        </span>
        <span className={styles.metric}>
          100.00
          <small>%</small>
        </span>
        <span className={styles.panelDivider} />
        <span className={styles.panelMeta}>
          △ 0.0001&nbsp;&nbsp; / &nbsp;&nbsp;R ∞
        </span>
      </div>

      <footer className={styles.footerData}>
        <p>Persistence&nbsp; · &nbsp;Precision&nbsp; · &nbsp;Scale</p>
        <div className={styles.sequence} aria-hidden="true">
          <span>01</span>
          <span>02</span>
          <span>03</span>
          <span>05</span>
          <span>08</span>
        </div>
      </footer>

      <p className={styles.interactionHint}>
        Drag the ring&nbsp; / &nbsp;move to refract
      </p>
    </section>
  );
}
