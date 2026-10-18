import { copy } from '../copy';

export function PipelineStrip() {
  return (
    <ol className="pipeline" aria-label="How the pipeline works">
      {copy.pipeline.map((step, i) => (
        <li key={step.title} className="pipeline__step">
          <span className="pipeline__n" aria-hidden="true">{i + 1}</span>
          <div>
            <p className="pipeline__title">{step.title}</p>
            <p className="pipeline__body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
