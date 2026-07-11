export default function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>Curation for Abigail · Carefully prescribed, freshly picked.</span>
        <div className="footer-links">
          <button type="button" onClick={() => go("about")}>
            About
          </button>
          <button type="button" onClick={() => go("acknowledgements")}>
            Acknowledgements
          </button>
          <button type="button" onClick={() => go("contact")}>
            Contact
          </button>
          <a href="https://github.com/shrlak/curation" target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
