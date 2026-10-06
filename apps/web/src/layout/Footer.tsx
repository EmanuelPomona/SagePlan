/**
 * Attribution is a licence obligation, not decoration: Hyperschedule is
 * BSD-3-Clause and the brief commits to crediting it in the UI.
 */
export function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="footer">
      {children}
      <p className="attribution">
        Course and section data from{" "}
        <a href="https://hyperschedule.io" rel="noreferrer noopener">
          Hyperschedule
        </a>{" "}
        (BSD-3-Clause) and the Pomona College Catalog. GradGuide is a student
        project and is not affiliated with, endorsed by, or operated by Pomona
        College.
      </p>
      <p className="attribution">
        Your record stays in this browser. It is never uploaded, and this page
        makes no network requests except for its own files.
      </p>
    </footer>
  );
}
