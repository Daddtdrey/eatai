import React, { useState, useEffect } from 'react';

// ─── Premium food images (real photos via Unsplash CDN) ───
const FOOD_IMAGES = [
    {
        src: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&q=80&auto=format&fit=crop',
        alt: 'Burger', x: 8, y: 10, size: 72, delay: 1.55, rot: -6,
    },
    {
        src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&q=80&auto=format&fit=crop',
        alt: 'Pizza', x: 72, y: 8, size: 68, delay: 1.75, rot: 7,
    },
    {
        src: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&q=80&auto=format&fit=crop',
        alt: 'Chicken', x: 82, y: 38, size: 64, delay: 1.9, rot: 5,
    },
    {
        src: 'https://images.unsplash.com/photo-1512058454905-6b841e7ad132?w=160&q=80&auto=format&fit=crop',
        alt: 'Rice & Stew', x: 4, y: 42, size: 70, delay: 1.7, rot: -8,
    },
    {
        src: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=160&q=80&auto=format&fit=crop',
        alt: 'Jollof Rice', x: 38, y: 5, size: 62, delay: 2.05, rot: 3,
    },
    {
        src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&q=80&auto=format&fit=crop',
        alt: 'Food spread', x: 58, y: 55, size: 66, delay: 2.15, rot: -4,
    },
];

// Vendor location badges — Ekpoma only
const VENDOR_BADGES = [
    { label: '🏪 Vendors in Ekpoma', wide: true },
];

export default function OnboardingScreen({ onGetStarted, onLogin, onBrowseAsGuest }) {
    const [phase, setPhase] = useState('logo');
    // phases: logo → bike → reveal → cta

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('bike'), 900);
        const t2 = setTimeout(() => setPhase('reveal'), 2000);
        const t3 = setTimeout(() => setPhase('cta'), 2500);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    const isRevealed = phase === 'reveal' || phase === 'cta';
    const isCtaVisible = phase === 'cta';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                // Fanta premium: deep navy-to-near-black with vivid orange glow
                background: 'linear-gradient(160deg, #050d1f 0%, #0a1832 40%, #0e0400 100%)',
                fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            }}
        >
            {/* ── Ambient Glows ── */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {/* Orange radial glow — top-right */}
                <div style={{
                    position: 'absolute', top: '-80px', right: '-100px',
                    width: '420px', height: '420px',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 65%)',
                    borderRadius: '50%',
                }} />
                {/* Blue radial glow — bottom-left */}
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '-80px',
                    width: '360px', height: '360px',
                    background: 'radial-gradient(circle, rgba(29,78,216,0.28) 0%, transparent 65%)',
                    borderRadius: '50%',
                }} />
                {/* Thin orange arc line across centre */}
                <div style={{
                    position: 'absolute', top: '38%', left: '-10%', right: '-10%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 5%, rgba(249,115,22,0.2) 30%, rgba(29,78,216,0.2) 70%, transparent 95%)',
                    opacity: isRevealed ? 1 : 0,
                    transition: 'opacity 1s',
                }} />
            </div>

            {/* ── Top 2/3: Animation Stage ── */}
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

                {/* EatAi Logo (from /public) */}
                <div style={{
                    transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                    transform: phase === 'logo'
                        ? 'scale(1) translateY(0)'
                        : isRevealed
                            ? 'scale(0.72) translateY(-88px)'
                            : 'scale(1.08) translateY(-14px)',
                    opacity: phase === 'logo' ? 0 : 1,
                    animation: phase === 'logo' ? 'eatai-pop-in 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' : 'none',
                    textAlign: 'center',
                    zIndex: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                    <img
                        src="/eatai_logo_4-removebg-preview.png"
                        alt="EatAi"
                        style={{
                            width: '140px',
                            height: 'auto',
                            filter: 'drop-shadow(0 0 28px rgba(249,115,22,0.55)) drop-shadow(0 0 60px rgba(29,78,216,0.25))',
                        }}
                    />
                    <div style={{
                        fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.45)',
                        letterSpacing: '5px',
                        fontWeight: 600,
                        marginTop: '8px',
                        textTransform: 'uppercase',
                        opacity: isRevealed ? 0 : 1,
                        transition: 'opacity 0.4s',
                    }}>
                        Cravings to&nbsp;Doorsteps
                    </div>
                </div>

                {/* Tagline — appears after reveal */}
                <div style={{
                    position: 'absolute',
                    top: '22%',
                    textAlign: 'center',
                    opacity: isRevealed ? 1 : 0,
                    transform: isRevealed ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'all 0.5s ease 2.1s',
                    zIndex: 12,
                }}>
                    <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.75)',
                        letterSpacing: '0.5px',
                    }}>
                        Cravings&nbsp;
                        <span style={{
                            background: 'linear-gradient(90deg, #f97316, #fb923c)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>to&nbsp;Doorsteps</span>
                    </div>
                </div>

                {/* ── Bike Track ── */}
                <div style={{
                    position: 'absolute', bottom: '26%', left: 0, right: 0,
                    height: '60px', overflow: 'visible', pointerEvents: 'none',
                }}>
                    {/* Road line */}
                    <div style={{
                        position: 'absolute', bottom: '3px', left: 0, right: 0,
                        height: '1.5px',
                        background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.45) 30%, rgba(29,78,216,0.35) 70%, transparent)',
                        opacity: phase !== 'logo' ? 1 : 0,
                        transition: 'opacity 0.4s',
                    }} />

                    {/* Bike */}
                    <div style={{
                        position: 'absolute', bottom: '5px',
                        left: phase === 'bike' ? '110%' : '-15%',
                        transition: phase === 'bike' ? 'left 1.05s cubic-bezier(0.42,0,0.18,1)' : 'none',
                        fontSize: '2.8rem', lineHeight: 1,
                        filter: 'drop-shadow(0 2px 14px rgba(249,115,22,0.65))',
                        opacity: phase === 'logo' ? 0 : 1,
                    }}>
                        🛵
                        {/* Speed lines */}
                        <span style={{
                            position: 'absolute', right: '100%', top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            opacity: phase === 'bike' ? 0.8 : 0,
                            transition: 'opacity 0.2s',
                        }}>
                            {[30, 20, 12].map((w, i) => (
                                <div key={i} style={{
                                    width: `${w}px`, height: '2px',
                                    background: i === 0
                                        ? 'rgba(249,115,22,0.7)'
                                        : 'rgba(29,78,216,0.5)',
                                    borderRadius: '2px', marginRight: '4px',
                                }} />
                            ))}
                        </span>
                    </div>
                </div>

                {/* ── Food Photos Grid (scattered) ── */}
                {FOOD_IMAGES.map((item, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.size}px`,
                        height: `${item.size}px`,
                        borderRadius: '18px',
                        overflow: 'hidden',
                        opacity: isRevealed ? 1 : 0,
                        transform: isRevealed
                            ? `scale(1) rotate(${item.rot}deg)`
                            : `scale(0) rotate(${item.rot * 2}deg)`,
                        transition: `all 0.55s cubic-bezier(0.34,1.56,0.64,1) ${item.delay}s`,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.55), 0 0 0 2px rgba(249,115,22,0.25)',
                        // Floating animation handled via animationName below
                        animationName: isCtaVisible ? `float-${i % 3}` : 'none',
                        animationDuration: '3.5s',
                        animationTimingFunction: 'ease-in-out',
                        animationDelay: `${item.delay + 0.3}s`,
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate',
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}>
                        <img
                            src={item.src}
                            alt={item.alt}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="eager"
                        />
                        {/* Subtle color overlay per card */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: i % 2 === 0
                                ? 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, transparent 60%)'
                                : 'linear-gradient(135deg, rgba(29,78,216,0.12) 0%, transparent 60%)',
                        }} />
                    </div>
                ))}

                {/* ── Vendor Badges ── */}
                <div style={{
                    position: 'absolute', bottom: '10%', left: 0, right: 0,
                    display: 'flex', justifyContent: 'center',
                    gap: '10px', padding: '0 24px',
                    pointerEvents: 'none',
                }}>
                    {VENDOR_BADGES.map((v, i) => (
                        <div key={i} style={{
                            background: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(29,78,216,0.18))',
                            border: '1.5px solid rgba(249,115,22,0.4)',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            borderRadius: '100px',
                            padding: '8px 22px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            opacity: isRevealed ? 1 : 0,
                            transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.85)',
                            transition: `all 0.55s cubic-bezier(0.34,1.56,0.64,1) 2.4s`,
                            boxShadow: '0 2px 20px rgba(249,115,22,0.2), 0 0 0 1px rgba(255,255,255,0.05)',
                        }}>
                            {v.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Bottom 1/3: CTA Panel ── */}
            <div style={{
                flexShrink: 0,
                padding: '28px 24px 52px',
                background: 'linear-gradient(0deg, rgba(5,13,31,0.98) 55%, transparent 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                opacity: isCtaVisible ? 1 : 0,
                transform: isCtaVisible ? 'translateY(0)' : 'translateY(48px)',
                transition: 'all 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.05s',
            }}>
                {/* Divider with Fanta accent */}
                <div style={{
                    width: '48px', height: '3px', borderRadius: '3px',
                    background: 'linear-gradient(90deg, #f97316, #1d4ed8)',
                    marginBottom: '4px',
                }} />

                <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.88rem', fontWeight: 500,
                    margin: 0, letterSpacing: '0.2px',
                }}>
                    Don't have an account?
                </p>

                {/* Primary CTA */}
                <button
                    onClick={onGetStarted}
                    style={{
                        width: '100%', maxWidth: '380px',
                        padding: '17px 24px',
                        borderRadius: '16px', border: 'none',
                        cursor: 'pointer', fontWeight: 800, fontSize: '1rem',
                        letterSpacing: '0.3px',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #c2410c 100%)',
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(249,115,22,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
                        transition: 'all 0.15s',
                        position: 'relative', overflow: 'hidden',
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(249,115,22,0.35)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.45), 0 0 0 1px rgba(255,255,255,0.08)'; }}
                    onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {/* Shine sweep */}
                    <span style={{
                        position: 'absolute', top: 0, left: '-75%', width: '50%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                        animation: 'shine-sweep 2.5s ease-in-out 3s infinite',
                        pointerEvents: 'none',
                    }} />
                    🚀&nbsp;&nbsp;Create Free Account
                </button>

                {/* Secondary CTA */}
                <button
                    onClick={onLogin}
                    style={{
                        width: '100%', maxWidth: '380px',
                        padding: '15px 24px',
                        borderRadius: '16px',
                        border: '1.5px solid rgba(29,78,216,0.5)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                        background: 'rgba(29,78,216,0.12)',
                        color: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.15s',
                        boxShadow: '0 0 0 1px rgba(29,78,216,0.2)',
                    }}
                    onMouseDown={e => { e.currentTarget.style.background = 'rgba(29,78,216,0.25)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { e.currentTarget.style.background = 'rgba(29,78,216,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onTouchStart={e => { e.currentTarget.style.background = 'rgba(29,78,216,0.25)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onTouchEnd={e => { e.currentTarget.style.background = 'rgba(29,78,216,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    Already have an account?&nbsp;
                    <span style={{ color: '#60a5fa', fontWeight: 800 }}>Log In</span>
                </button>

                {/* Guest CTA */}
                <button
                    onClick={onBrowseAsGuest}
                    style={{
                        width: '100%', maxWidth: '380px',
                        padding: '14px 24px',
                        borderRadius: '16px',
                        border: '1.5px solid rgba(255,255,255,0.22)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.92rem',
                        background: 'rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.82)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.15s',
                        letterSpacing: '0.2px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseDown={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onTouchStart={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onTouchEnd={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    👀 Browse Menu as Guest
                </button>

                <p style={{
                    color: 'rgba(255,255,255,0.18)',
                    fontSize: '0.68rem', margin: 0, textAlign: 'center',
                }}>
                    By continuing, you agree to our Terms &amp; Privacy Policy
                </p>
            </div>

            {/* ── Global CSS Keyframes ── */}
            <style>{`
                @keyframes eatai-pop-in {
                    0%   { opacity: 0; transform: scale(0.35) translateY(30px); }
                    75%  { opacity: 1; transform: scale(1.06) translateY(-5px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes float-0 {
                    from { transform: translateY(0px) rotate(var(--rot, -6deg)); }
                    to   { transform: translateY(-10px) rotate(calc(var(--rot, -6deg) + 4deg)); }
                }
                @keyframes float-1 {
                    from { transform: translateY(0px) rotate(var(--rot, 5deg)); }
                    to   { transform: translateY(-8px) rotate(calc(var(--rot, 5deg) - 3deg)); }
                }
                @keyframes float-2 {
                    from { transform: translateY(0px) rotate(var(--rot, 3deg)); }
                    to   { transform: translateY(-13px) rotate(calc(var(--rot, 3deg) + 5deg)); }
                }
                @keyframes shine-sweep {
                    0%   { left: -75%; }
                    50%, 100% { left: 130%; }
                }
            `}</style>
        </div>
    );
}
