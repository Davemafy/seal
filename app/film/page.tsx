import "./film.css";

const claims = ["COURT DATE", "REQUIRED ACTION", "SENDER", "HEARING DETAILS"];
const sources = ["Official court notice", "Court directory", "Docket record"];

export default function SealFilmPage() {
  return (
    <main className="film" aria-label="SEAL fifteen second motion film">
      <div className="film__grain" />
      <div className="film__vignette" />
      <div className="film__counter" aria-hidden="true">00:15</div>

      <section className="scene scene--open">
        <div className="brand">SEAL</div>
        <p>VERIFY WHAT&apos;S<br />ACTUALLY THERE.</p>
        <i />
      </section>

      <section className="scene scene--message">
        <div className="paper paper--hero">
          <span>STATE COURT</span>
          <b>NOTICE TO APPEAR</b>
          <p>You are required to appear in court on <mark>Mar 14, 2024</mark>.</p>
          <p>Failure to appear may result in further action.</p>
        </div>
        <h1>A COURT<br />MESSAGE</h1>
        <strong>CAN CHANGE<br />YOUR LIFE.</strong>
      </section>

      <section className="scene scene--extract">
        <div className="extract-copy">
          <span>EXTRACT</span><span>UNDERSTAND</span><span>VERIFY</span><span>CITE</span>
        </div>
        <div className="claim-stack">
          {claims.map((claim, i) => <div className={`claim claim--${i + 1}`} key={claim}>{claim}</div>)}
        </div>
        <div className="scan-line" />
      </section>

      <section className="scene scene--source">
        <div className="source-space">
          {sources.map((source, i) => (
            <div className={`source-card source-card--${i + 1}`} key={source}>
              <small>SOURCE 0{i + 1}</small><b>{source}</b><span>courts.state.gov</span>
            </div>
          ))}
        </div>
        <div className="flight-claim"><small>CLAIM</small><b>Court date: Mar 14, 2024</b></div>
      </section>

      <section className="scene scene--match">
        <div className="match-ring"><div /></div>
        <div className="match-copy"><small>CLAIM × SOURCE</small><b>MATCH</b><span>Official evidence located</span></div>
      </section>

      <section className="scene scene--ui">
        <div className="ui-shell">
          <header><b>SEAL</b><span>Court message review</span></header>
          <div className="ui-grid">
            <div className="ui-doc"><small>NOTICE TO APPEAR</small><p>You are required to appear in court on <mark>Mar 14, 2024</mark>.</p><i /></div>
            <div className="ui-result"><small>WHAT IT MEANS</small><h2>You need to appear in court on Mar 14, 2024.</h2><div className="verified">VERIFIED · OFFICIAL SOURCE</div><hr/><small>NEXT STEP</small><p>Confirm the hearing with the court using the official contact details.</p></div>
          </div>
        </div>
      </section>

      <section className="scene scene--type">
        <div className="type-line type-line--1">WHAT IT SAYS.</div>
        <div className="type-line type-line--2">WHAT THE COURT SAYS.</div>
        <div className="type-line type-line--3">WHAT YOU DO NEXT.</div>
      </section>

      <section className="scene scene--final">
        <div className="final-rule" />
        <h2>SEAL</h2>
        <p>EVIDENCE BEFORE CONFIDENCE.</p>
      </section>

      <div className="film__progress" />
    </main>
  );
}
