export function LoginAnimation() {
  return (
    <div className="login-anim-wrap">
      <style>{`
        .login-anim-wrap {
          position: relative;
          height: 130px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .login-anim-ground {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255,255,255,0.15);
        }
        .login-anim-character {
          position: relative;
          animation: la-walk-in 1.1s ease-out forwards, la-idle-bob 2.4s ease-in-out 1.1s infinite;
          transform: translateX(-100px);
        }
        .login-anim-bag {
          animation: la-bag-in 1.1s ease-out forwards;
          opacity: 0;
          margin-left: -8px;
        }
        @keyframes la-walk-in {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(0); }
        }
        @keyframes la-bag-in {
          0%, 60% { opacity: 0; transform: translateY(6px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes la-idle-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      <div className="login-anim-ground" />

      <div className="login-anim-character">
        <svg width="78" height="114" viewBox="0 0 96 140" fill="none">
          <rect x="34" y="92" width="10" height="34" rx="4" fill="#1e293b" />
          <rect x="52" y="92" width="10" height="34" rx="4" fill="#1e293b" />
          <ellipse cx="39" cy="128" rx="8" ry="4" fill="#0f172a" />
          <ellipse cx="57" cy="128" rx="8" ry="4" fill="#0f172a" />
          <rect x="28" y="52" width="40" height="44" rx="14" fill="#e2c078" />
          <rect x="20" y="56" width="10" height="34" rx="5" fill="#e2c078" />
          <rect x="66" y="56" width="10" height="34" rx="5" fill="#e2c078" />
          <circle cx="48" cy="34" r="22" fill="#f2c9a0" />
          <path d="M26 30c0-14 10-22 22-22s22 8 22 22c-6-4-14-6-22-6s-16 2-22 6z" fill="#2c2420" />
          <circle cx="40" cy="36" r="2.4" fill="#1e293b" />
          <circle cx="56" cy="36" r="2.4" fill="#1e293b" />
          <path d="M40 44c3 3 13 3 16 0" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </div>

      <div className="login-anim-bag">
        <svg width="30" height="26" viewBox="0 0 34 30" fill="none">
          <rect x="2" y="10" width="30" height="18" rx="3" fill="#c99a3f" />
          <rect x="11" y="4" width="12" height="8" rx="3" stroke="#c99a3f" strokeWidth="3" fill="none" />
          <rect x="14" y="16" width="6" height="6" rx="1" fill="#a15c3a" />
        </svg>
      </div>
    </div>
  );
}
