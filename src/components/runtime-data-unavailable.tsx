export function RuntimeDataUnavailable({
  title = "Demo data is temporarily unavailable",
}: {
  title?: string;
}) {
  return (
    <section
      className="mx-auto max-w-3xl rounded-lg border border-rose-300 bg-rose-50 px-4 py-5 text-sm text-rose-950"
      role="alert"
    >
      <h1 className="font-semibold">{title}</h1>
      <p className="mt-2">
        Runtime demo records could not be loaded. Check the database connection
        and migrations, then try again. No seed-only totals are shown as a
        complete result.
      </p>
    </section>
  );
}
