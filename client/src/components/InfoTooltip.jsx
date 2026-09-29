import React, { useState, useRef, useEffect } from "react";
import { Info, Sparkles, BookOpen, ShieldCheck, X, Zap } from "lucide-react";

/**
 * @component InfoTooltip
 * @description State-of-the-art interactive judicial guidance tooltip.
 * Highlights:
 * 1. Modern interactive trigger with sleek badge & subtle pulse indicator.
 * 2. Smart viewport-aware alignment (prevents edge clipping).
 * 3. 3-Part structured breakdown:
 *    - What This Does (اس کا کام / Functionality)
 *    - Pakistani Court Law (ضابطہ و قانون / Procedural Rule)
 *    - Blockchain Security (حفاظت و تصدیق / Cryptographic Guarantee)
 */
export default function InfoTooltip({
  title,
  whatItDoes,
  procedure,
  blockchain,
  align = "auto"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState({ horizontal: "center", vertical: "top" });
  const wrapperRef = useRef(null);
  const cardRef = useRef(null);

  // Smart repositioning to avoid clipping outside screen boundaries
  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const cardWidth = 350;
    const cardHeight = 280;

    let h = "center";
    let v = "top";

    // Horizontal check
    if (rect.left + cardWidth / 2 > window.innerWidth - 20) {
      h = "right";
    } else if (rect.left - cardWidth / 2 < 20) {
      h = "left";
    }

    // Vertical check (flip downwards if too close to top of viewport)
    if (rect.top - cardHeight < 20 && rect.bottom + cardHeight < window.innerHeight - 20) {
      v = "bottom";
    }

    setPlacement({ horizontal: h, vertical: v });
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Determine dynamic placement classes
  const positionClass = `placement-${placement.vertical}-${placement.horizontal}`;

  return (
    <span
      className="modern-tooltip-wrapper"
      ref={wrapperRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        type="button"
        className={`modern-info-trigger ${isOpen ? "active" : ""}`}
        onClick={handleToggle}
        aria-label={`Detailed legal guidance on ${title}`}
        aria-expanded={isOpen}
        title="Click or hover to inspect legal statute and blockchain verification details"
      >
        <Info size={13} className="info-icon" />
      </button>

      {isOpen && (
        <div
          ref={cardRef}
          className={`modern-tooltip-card ${positionClass}`}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Gradient Border */}
          <div className="tooltip-top-accent" />

          {/* Header */}
          <div className="modern-tooltip-header">
            <div className="modern-tooltip-title-group">
              <span className="tooltip-badge-icon">
                <ShieldCheck size={15} />
              </span>
              <div>
                <strong className="tooltip-title-text">{title}</strong>
                <span className="tooltip-subtitle-badge">Court Statute & Ledger Guide • رہنمائی</span>
              </div>
            </div>
            <button
              type="button"
              className="tooltip-close-btn"
              onClick={handleClose}
              aria-label="Close tooltip"
              title="Close guide"
            >
              <X size={13} />
            </button>
          </div>

          {/* Structured Guidance Sections */}
          <div className="modern-tooltip-body">
            {/* 1. What This Does */}
            {whatItDoes && (
              <div className="tooltip-section functionality-section">
                <div className="tooltip-section-header">
                  <Zap size={13} className="section-icon zap" />
                  <span className="tooltip-tag functionality">What This Does (اس کا کام)</span>
                </div>
                <p>{whatItDoes}</p>
              </div>
            )}

            {/* 2. Pakistani Court Law */}
            {procedure && (
              <div className="tooltip-section procedure-section">
                <div className="tooltip-section-header">
                  <BookOpen size={13} className="section-icon book" />
                  <span className="tooltip-tag procedure">Pakistani Court Law (قانون و ضابطہ)</span>
                </div>
                <p>{procedure}</p>
              </div>
            )}

            {/* 3. Blockchain Security */}
            {blockchain && (
              <div className="tooltip-section blockchain-section">
                <div className="tooltip-section-header">
                  <ShieldCheck size={13} className="section-icon shield" />
                  <span className="tooltip-tag blockchain">Blockchain Guarantee (بلاک چین تحفظ)</span>
                </div>
                <p>{blockchain}</p>
              </div>
            )}
          </div>

          {/* Institutional Footer */}
          <div className="tooltip-institutional-footer">
            <span>Islamia College University Peshawar (ICP)</span>
            <span>BDMS National Node</span>
          </div>
        </div>
      )}
    </span>
  );
}
