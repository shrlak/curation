/* Shared SVG icon set. Line-art at 24 or 100 viewBoxes; sized via CSS. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
const thick = { fill: "none", stroke: "currentColor", strokeWidth: 7.5, strokeLinecap: "round", strokeLinejoin: "round" };

export const icons = {
  home: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </svg>
  ),
  necklace: (
    <svg viewBox="0 0 100 100" {...thick}>
      <path d="M22 14c1 20 8 33 28 33s27-13 28-33" />
      <circle cx="50" cy="49" r="3.4" fill="currentColor" stroke="none" />
      <path d="M50 52c-4.4 0-7.5 2.4-8.6 6.4-1.6 5.8 1.4 13.6 5.6 17.8 1.2 1.2 2.1 1.8 3 1.8s1.8-.6 3-1.8c4.2-4.2 7.2-12 5.6-17.8-1.1-4-4.2-6.4-8.6-6.4Z" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 100 100" {...thick}>
      <path d="M38 20 40 8h20l2 12M38 80l2 12h20l2-12" />
      <ellipse cx="50" cy="50" rx="27" ry="30" />
      <path d="M50 33v17l13 8" />
      <path d="M77 46h5v8h-5Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  lens: (
    <svg viewBox="0 0 100 100" {...thick}>
      <circle cx="50" cy="50" r="34" />
      <circle cx="50" cy="50" r="22" />
      <path d="M39 31a26 26 0 0 1 10-4.4" />
      <path d="M50 40 59 45.5v9L50 60l-9-5.5v-9Z" />
    </svg>
  ),
  scrub: (
    <svg viewBox="0 0 100 100" {...thick}>
      <path d="M38 10c-9 1-16 5-20 12l9 9-3 8v46a3 3 0 0 0 3 3h46a3 3 0 0 0 3-3V39l-3-8 9-9c-4-7-11-11-20-12" />
      <path d="M38 10c0 7 5 12 12 12s12-5 12-12" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  ),
  ack: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M7 3h10v18l-5-3-5 3Z" />
      <path d="m9.5 9 1.6 1.6L15 7" />
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 5h16v14H4Z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.25 3a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.115.362.279l2.57 9.712a2.25 2.25 0 0 0 2.175 1.679h7.478a2.25 2.25 0 0 0 2.166-1.645l1.622-5.792a.75.75 0 0 0-.722-.958H6.03l-.542-2.048A1.87 1.87 0 0 0 3.636 3H2.25Z" />
      <path d="M8.25 21a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25ZM17.25 21a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M12 20.4S3.6 15.36 3.6 9.36A4.56 4.56 0 0 1 8.16 4.8c1.5 0 2.94.72 3.84 1.92 0.9-1.2 2.34-1.92 3.84-1.92a4.56 4.56 0 0 1 4.56 4.56C20.4 15.36 12 20.4 12 20.4Z" />
    </svg>
  ),
  heartFilled: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 20.4S3.6 15.36 3.6 9.36A4.56 4.56 0 0 1 8.16 4.8c1.5 0 2.94.72 3.84 1.92 0.9-1.2 2.34-1.92 3.84-1.92a4.56 4.56 0 0 1 4.56 4.56C20.4 15.36 12 20.4 12 20.4Z" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M12 5v14M5 12h14" />
      <path d="m18.5 3 .5 1.5L20.5 5 19 5.5 18.5 7 18 5.5 16.5 5 18 4.5Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  sun: (
    <svg className="sun" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  moon: (
    <svg className="moon" viewBox="0 0 24 24" {...stroke}>
      <path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8a8.5 8.5 0 1 0 11.8 11.8Z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M7 7l1 14h8l1-14" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 6h6l2 2h8v11H4Z" />
      <path d="M8 13h8" />
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <circle cx="9" cy="10" r="2" />
      <path d="m5 18 5-5 3 3 2-2 4 4" />
      <path d="M12 2v5m-2-2 2 2 2-2" />
    </svg>
  ),
};

export const fallbackArt = {
  watch: (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 20 40 8h20l2 12M38 80l2 12h20l2-12" />
      <ellipse cx="50" cy="50" rx="27" ry="30" />
      <path d="M50 33v17l13 8" />
      <path d="M77 46h5v8h-5Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  lens: (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="34" />
      <circle cx="50" cy="50" r="22" />
      <path d="M39 31a26 26 0 0 1 10-4.4" />
      <path d="M50 40 59 45.5v9L50 60l-9-5.5v-9Z" />
      <path d="M50 22v6M50 72v6M22 50h6M72 50h6M31 31l4 4M69 31l-4 4M31 69l4-4M69 69l-4-4" />
    </svg>
  ),
  scrub: (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 10c-9 1-16 5-20 12l9 9-3 8v46a3 3 0 0 0 3 3h46a3 3 0 0 0 3-3V39l-3-8 9-9c-4-7-11-11-20-12" />
      <path d="M38 10c0 7 5 12 12 12s12-5 12-12" />
      <rect x="40" y="55" width="13" height="15" rx="2.5" />
    </svg>
  ),
  necklace: (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 14c1 20 8 33 28 33s27-13 28-33" />
      <circle cx="50" cy="49" r="3.4" fill="currentColor" stroke="none" />
      <path d="M50 52c-4.4 0-7.5 2.4-8.6 6.4-1.6 5.8 1.4 13.6 5.6 17.8 1.2 1.2 2.1 1.8 3 1.8s1.8-.6 3-1.8c4.2-4.2 7.2-12 5.6-17.8-1.1-4-4.2-6.4-8.6-6.4Z" />
    </svg>
  ),
  custom: (
    <svg viewBox="0 0 180 180" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M43 63h94l-8 88H51Z" />
      <path d="M68 68V50c0-15 9-25 22-25s22 10 22 25v18" />
      <path d="M73 105h34M90 88v34" />
    </svg>
  ),
};

export const FallbackIcon = ({ type }) => fallbackArt[type] || fallbackArt.necklace;
