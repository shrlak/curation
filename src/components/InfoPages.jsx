import { motion } from "framer-motion";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const I = {
  shield: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M4 12h16M12 4v16" />
    </svg>
  ),
  responsive: (
    <svg viewBox="0 0 24 24" {...s}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5V2M12 22v-3M5 12H2M22 12h-3" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 21s8-4.5 8-11a4.5 4.5 0 0 0-8-2.5A4.5 4.5 0 0 0 4 10c0 6.5 8 11 8 11Z" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M7 3h10v18l-5-3-5 3Z" />
      <path d="m9.5 9 1.6 1.6L15 7" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M4 4h16v16H4Z" />
      <path d="m4 15 4-4 4 4 3-3 5 5" />
      <circle cx="15" cy="8" r="1.5" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M5 19 19 5M8 5h11v11" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M4 5h16v14H4Z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M8 9h8M8 13h5" />
      <path d="M5 4h14v14H9l-4 3Z" />
    </svg>
  ),
  repo: (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
};

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function InfoShell({ eyebrow, title, lead, children }) {
  return (
    <section className="view">
      <div className="container">
        <motion.div className="info-hero" initial="hidden" animate="show" variants={rise}>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lead kw">{lead}</p>
        </motion.div>
        <motion.div
          className="info-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.08 }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

const Card = ({ icon, wide, children }) => (
  <motion.article className={`info-card ${wide ? "wide" : ""}`} variants={rise}>
    <span className="info-icon">{icon}</span>
    {children}
  </motion.article>
);

export function About() {
  return (
    <InfoShell
      eyebrow="About"
      title="A quieter way to compare what matters."
      lead="Curation for Abigail은 약학도의 꼼꼼한 시선과 파머스 마켓의 따뜻한 발견 경험을 결합한 개인 큐레이션 프로젝트입니다. Carefully prescribed, freshly picked라는 마음으로 선택에 필요한 핵심만 정리합니다."
    >
      <Card icon={I.shield} wide>
        <h2>Designed around clarity.</h2>
        <p className="kw">제품명, 가격, 핵심 사양, 판매처를 같은 구조로 정리해 카테고리가 달라도 익숙하게 비교할 수 있습니다.</p>
      </Card>
      <Card icon={I.plus}>
        <h3>Expandable</h3>
        <p className="kw">새로운 제품군과 데이터 파일을 추가하기 쉬운 구조입니다.</p>
      </Card>
      <Card icon={I.responsive}>
        <h3>Responsive</h3>
        <p className="kw">휴대전화, 태블릿, 데스크톱에서 동일한 정보 구조를 유지합니다.</p>
      </Card>
      <Card icon={I.heart}>
        <h3>Personal</h3>
        <p className="kw">마음에 드는 제품은 브라우저에 저장해 나중에 다시 볼 수 있습니다.</p>
      </Card>
    </InfoShell>
  );
}

export function Acknowledgements() {
  return (
    <InfoShell
      eyebrow="Acknowledgements"
      title="Built from many sources, presented with care."
      lead="이 사이트는 브랜드와 판매처의 공개 제품 페이지를 비교 목적으로 연결합니다. 모든 상표, 제품명, 이미지의 권리는 각 소유자에게 있습니다."
    >
      <Card icon={I.bookmark} wide>
        <h2>Product and image sources</h2>
        <ul className="info-list kw">
          <li>목걸이 정보: Zigzag 및 각 판매처 제품 페이지</li>
          <li>시계 정보: Coach, Rosefield, Macy's, Nordstrom, Dillard's 등 연결된 판매처</li>
          <li>렌즈 정보: B&amp;H Photo와 각 제조사 또는 판매처</li>
          <li>스크럽 정보: FIGS 공식 웹사이트</li>
          <li>제품 이미지는 판매 페이지의 공개 메타데이터 이미지를 우선 사용하며, 불러오지 못할 경우 아이콘으로 대체합니다.</li>
        </ul>
      </Card>
      <Card icon={I.image}>
        <h3>Image policy</h3>
        <p className="kw">이미지는 비교와 판매처 이동을 돕기 위한 미리보기입니다. 사이트에서 이미지를 재판매하거나 소유권을 주장하지 않습니다.</p>
      </Card>
      <Card icon={I.target}>
        <h3>Data accuracy</h3>
        <p className="kw">가격, 색상, 재고는 바뀔 수 있습니다. 구매 전 연결된 공식 판매 페이지에서 최종 정보를 확인해야 합니다.</p>
      </Card>
      <Card icon={I.external}>
        <h3>Independent project</h3>
        <p className="kw">이 프로젝트는 표시된 브랜드 또는 판매처와 제휴하거나 후원받지 않았습니다.</p>
      </Card>
    </InfoShell>
  );
}

export function Contact({ notify }) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      notify?.("Website link copied.");
    } catch {
      notify?.("Copy is not available in this browser.");
    }
  };

  return (
    <InfoShell
      eyebrow="Contact"
      title="Found a better option or a broken link?"
      lead="새로운 제품 제안, 잘못된 가격, 열리지 않는 링크, 이미지 오류는 GitHub를 통해 남길 수 있습니다."
    >
      <Card icon={I.mail} wide>
        <h2>Send feedback.</h2>
        <p className="kw">문제의 제품명과 카테고리, 올바른 링크를 함께 적어주면 더 빠르게 반영할 수 있습니다.</p>
        <div className="contact-actions">
          <a
            className="btn primary"
            href="https://github.com/shrlak/curation/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open a GitHub issue <span className="arrow">↗</span>
          </a>
          <button className="btn ghost" type="button" onClick={copyLink}>
            Copy website link
          </button>
        </div>
      </Card>
      <Card icon={I.chat}>
        <h3>Report an issue</h3>
        <a
          className="link-card"
          href="https://github.com/shrlak/curation/issues/new?labels=bug&title=Broken%20product%20link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Broken link or image</span>
          <b>Open ↗</b>
        </a>
        <a
          className="link-card"
          href="https://github.com/shrlak/curation/issues/new?labels=enhancement&title=Product%20suggestion"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Suggest a product</span>
          <b>Open ↗</b>
        </a>
      </Card>
      <Card icon={I.repo}>
        <h3>Repository</h3>
        <p className="kw">웹사이트 코드와 데이터는 GitHub에서 관리됩니다.</p>
        <a className="link-card" href="https://github.com/shrlak/curation" target="_blank" rel="noopener noreferrer">
          <span>View source repository</span>
          <b>GitHub ↗</b>
        </a>
      </Card>
    </InfoShell>
  );
}
