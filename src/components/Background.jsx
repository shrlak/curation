import { useEffect } from "react";

/** Fixed animated backdrop: aurora blobs, drifting grid, noise + pointer spotlight. */
export default function Background() {
  useEffect(() => {
    if (matchMedia("(pointer:coarse)").matches) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
        document.documentElement.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="bg" aria-hidden="true">
        <span className="blob a" />
        <span className="blob b" />
        <span className="blob c" />
        <span className="bg-grid" />
        <span className="bg-noise" />
      </div>
      <div className="spotlight" aria-hidden="true" />
    </>
  );
}
