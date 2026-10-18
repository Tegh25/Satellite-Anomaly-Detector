import { config } from '../config';
import { copy } from '../copy';

export function About() {
  const a = copy.about;
  return (
    <article className="prose">
      <h1>About and limitations</h1>

      <h2>What this is</h2>
      <p>{a.whatThisIs}</p>

      <h2>How it was built</h2>
      <p>{a.howBuilt}</p>

      <h2>What the evidence says</h2>
      <p>{a.evidence} <a href="#/results">Go to Results</a>.</p>

      <h2>Limitations</h2>
      <ul>{a.limitations.map((l) => <li key={l}>{l}</li>)}</ul>

      <h2>Credits</h2>
      <ul>
        <li>
          Dataset: OPSSAT-AD. {config.dataset.citation} Licence: {config.dataset.licence}.
        </li>
        <li>{copy.credits.baseModel}</li>
        <li>{copy.credits.teacher}</li>
      </ul>
      <p>{copy.footerBuiltBy(config.ownerName)}</p>
    </article>
  );
}
