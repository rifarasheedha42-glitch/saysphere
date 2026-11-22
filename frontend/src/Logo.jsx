export default function Logo({ className = 'w-10 h-10' }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SaySphere Logo"
    >
      <defs>
        <linearGradient id="ssGlobe" x1="34" y1="36" x2="86" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="ssCap" x1="36" y1="14" x2="84" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="ssBook" x1="20" y1="78" x2="100" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      {/* Dark rounded badge background */}
      <rect x="2" y="2" width="116" height="116" rx="26" fill="#0B0F19" stroke="#1E293B" strokeWidth="3" />

      {/* Sparkle stars */}
      <path d="M95 66L97 71L102 73L97 75L95 80L93 75L88 73L93 71L95 66Z" fill="#818CF8" />
      <circle cx="24" cy="70" r="2.2" fill="#38BDF8" />
      <circle cx="88" cy="24" r="2" fill="#C084FC" />

      {/* Left: Minimalist Lightbulb */}
      <g stroke="#818CF8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 48C17.5 48 14 44.5 14 40C14 35.5 17.5 32 22 32C26.5 32 30 35.5 30 40C30 42.8 28.6 45.2 26.5 46.6L25.5 51H18.5L17.5 46.6C15.4 45.2 14 42.8 14 40" />
        <line x1="19" y1="54.5" x2="25" y2="54.5" />
        <line x1="22" y1="25" x2="22" y2="28" />
        <line x1="10" y1="40" x2="7" y2="40" />
        <line x1="13" y1="30" x2="11" y2="28" />
      </g>

      {/* Right: Paper Airplane */}
      <g stroke="#60A5FA" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M107 30L88 39L95 43L107 30Z" />
        <path d="M107 30L99 49L95 43" />
        <path d="M95 43V49L98 46" />
      </g>

      {/* Center: Glowing Sphere / Globe */}
      <circle cx="60" cy="59" r="23" fill="url(#ssGlobe)" />
      {/* Subtle continents */}
      <path
        d="M46 47C50 45 54 47 55 51C56 54 52 57 53 61C54 65 50 70 46 69C43 65 42 54 46 47Z"
        fill="#A855F7"
        fillOpacity="0.65"
      />
      <path
        d="M66 44C72 44 77 49 77 55C77 61 72 67 67 68C64 65 65 59 63 55C61 51 62 46 66 44Z"
        fill="#A855F7"
        fillOpacity="0.6"
      />

      {/* Top: Graduation Cap + Gold Tassel */}
      <path d="M60 14L86 25L60 36L34 25L60 14Z" fill="url(#ssCap)" />
      <path
        d="M46 30.5V38.5C46 38.5 52 42 60 42C68 42 74 38.5 74 38.5V30.5"
        fill="#1E1B4B"
        stroke="#6366F1"
        strokeWidth="2"
      />
      {/* Gold Tassel */}
      <line x1="41" y1="28" x2="41" y2="43" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38.5 43H43.5L44.5 49H37.5L38.5 43Z" fill="#F59E0B" />

      {/* Bottom: Open Book */}
      <path
        d="M23 82C35 78 49 80 60 88C71 80 85 78 97 82V96C85 92 71 94 60 101C49 94 35 92 23 96V82Z"
        fill="#F8FAFC"
        stroke="#312E81"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line x1="60" y1="88" x2="60" y2="101" stroke="#4F46E5" strokeWidth="2.5" />
      <path
        d="M19 98C33 94 48 96 60 103C72 96 87 94 101 98"
        stroke="url(#ssBook)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}