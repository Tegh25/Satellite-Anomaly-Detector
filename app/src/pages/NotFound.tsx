export function NotFound({ what = 'This page' }: { what?: string }) {
  return (
    <section className="empty empty--page">
      <h1>{what} was not found</h1>
      <p><a href="#/">Go to the segment explorer</a></p>
    </section>
  );
}
