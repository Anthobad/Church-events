import React from 'react';

export const MosaicBackground: React.FC = () => {
  return (
    <div
      id="church-background-container"
      className="church-mosaic-bg"
      aria-hidden="true"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base warm deep cathedral gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#181124] via-[#221326] to-[#0f172a]" />

          {/* Stained Glass Geometric Mosaic SVG with rich jewel facets */}
          <svg
            className="absolute inset-0 w-full h-full object-cover opacity-85"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Cathedral Color Palette Gradients */}
              <linearGradient id="facetGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="facetAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="facetRuby" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="facetCrimson" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="facetSapphire" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="facetCobalt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="facetEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="facetAmethyst" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#581c87" stopOpacity="0.8" />
              </linearGradient>

              {/* Stained Glass Texture Filter */}
              <filter id="glassTexture" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
                <feComposite in2="SourceGraphic" in="glaze" operator="in" />
              </filter>
            </defs>

            {/* Leaded Metal Framework and Tessellated Mosaic Tiles */}
            <g stroke="#1a151b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
              {/* Central Gothic Rose Motif */}
              {/* Core Star / Rosette */}
              <polygon points="720,80 670,180 770,180" fill="url(#facetAmber)" />
              <polygon points="670,180 720,240 770,180" fill="url(#facetGold)" />
              <polygon points="720,240 670,300 770,300" fill="url(#facetRuby)" />
              <polygon points="670,180 610,240 670,300" fill="url(#facetSapphire)" />
              <polygon points="770,180 830,240 770,300" fill="url(#facetEmerald)" />

              {/* Radial Arch Petals */}
              <polygon points="720,80 600,120 670,180" fill="url(#facetSapphire)" />
              <polygon points="720,80 770,180 840,120" fill="url(#facetRuby)" />
              <polygon points="600,120 540,210 610,240" fill="url(#facetEmerald)" />
              <polygon points="840,120 830,240 900,210" fill="url(#facetAmethyst)" />
              <polygon points="610,240 540,330 670,300" fill="url(#facetCrimson)" />
              <polygon points="830,240 770,300 900,330" fill="url(#facetCobalt)" />
              <polygon points="670,300 720,390 770,300" fill="url(#facetGold)" />

              {/* Upper Left Cathedral Vault Mosaic */}
              <polygon points="0,0 240,0 160,120 0,100" fill="url(#facetCobalt)" />
              <polygon points="240,0 440,0 360,130 160,120" fill="url(#facetRuby)" />
              <polygon points="440,0 600,120 360,130" fill="url(#facetAmber)" />
              <polygon points="0,100 160,120 90,240 0,220" fill="url(#facetGold)" />
              <polygon points="160,120 360,130 260,250 90,240" fill="url(#facetEmerald)" />
              <polygon points="360,130 540,210 400,270 260,250" fill="url(#facetSapphire)" />
              <polygon points="0,220 90,240 0,360" fill="url(#facetCrimson)" />
              <polygon points="90,240 260,250 160,370 0,360" fill="url(#facetAmethyst)" />
              <polygon points="260,250 400,270 300,390 160,370" fill="url(#facetAmber)" />
              <polygon points="400,270 540,330 430,420 300,390" fill="url(#facetRuby)" />

              {/* Upper Right Cathedral Vault Mosaic */}
              <polygon points="1440,0 1200,0 1280,120 1440,100" fill="url(#facetRuby)" />
              <polygon points="1200,0 1000,0 1080,130 1280,120" fill="url(#facetSapphire)" />
              <polygon points="1000,0 840,120 1080,130" fill="url(#facetGold)" />
              <polygon points="1440,100 1280,120 1350,240 1440,220" fill="url(#facetEmerald)" />
              <polygon points="1280,120 1080,130 1180,250 1350,240" fill="url(#facetAmber)" />
              <polygon points="1080,130 900,210 1040,270 1180,250" fill="url(#facetCobalt)" />
              <polygon points="1440,220 1350,240 1440,360" fill="url(#facetGold)" />
              <polygon points="1350,240 1180,250 1280,370 1440,360" fill="url(#facetRuby)" />
              <polygon points="1180,250 1040,270 1140,390 1280,370" fill="url(#facetAmethyst)" />
              <polygon points="1040,270 900,330 1010,420 1140,390" fill="url(#facetEmerald)" />

              {/* Mid-Section Mosaic Arc Band */}
              <polygon points="430,420 540,330 670,300 600,430" fill="url(#facetSapphire)" />
              <polygon points="670,300 720,390 770,300 720,440" fill="url(#facetAmber)" />
              <polygon points="770,300 900,330 1010,420 840,430" fill="url(#facetRuby)" />
              <polygon points="600,430 720,440 660,540 540,510" fill="url(#facetEmerald)" />
              <polygon points="720,440 840,430 900,510 780,540" fill="url(#facetCobalt)" />
              <polygon points="660,540 720,440 780,540 720,620" fill="url(#facetGold)" />

              {/* Flanking Mid Left Mosaic */}
              <polygon points="0,360 160,370 70,500 0,480" fill="url(#facetCobalt)" />
              <polygon points="160,370 300,390 220,520 70,500" fill="url(#facetRuby)" />
              <polygon points="300,390 430,420 360,530 220,520" fill="url(#facetAmber)" />
              <polygon points="430,420 600,430 540,510 360,530" fill="url(#facetGold)" />
              <polygon points="0,480 70,500 0,630" fill="url(#facetEmerald)" />
              <polygon points="70,500 220,520 140,640 0,630" fill="url(#facetAmethyst)" />
              <polygon points="220,520 360,530 280,660 140,640" fill="url(#facetCrimson)" />
              <polygon points="360,530 540,510 450,650 280,660" fill="url(#facetSapphire)" />

              {/* Flanking Mid Right Mosaic */}
              <polygon points="1440,360 1280,370 1370,500 1440,480" fill="url(#facetAmber)" />
              <polygon points="1280,370 1140,390 1220,520 1370,500" fill="url(#facetEmerald)" />
              <polygon points="1140,390 1010,420 1080,530 1220,520" fill="url(#facetCobalt)" />
              <polygon points="1010,420 840,430 900,510 1080,530" fill="url(#facetGold)" />
              <polygon points="1440,480 1370,500 1440,630" fill="url(#facetRuby)" />
              <polygon points="1370,500 1220,520 1300,640 1440,630" fill="url(#facetSapphire)" />
              <polygon points="1220,520 1080,530 1160,660 1300,640" fill="url(#facetAmethyst)" />
              <polygon points="1080,530 900,510 990,650 1160,660" fill="url(#facetAmber)" />

              {/* Lower Foundation Mosaic Tiles */}
              <polygon points="0,630 140,640 50,770 0,760" fill="url(#facetAmber)" />
              <polygon points="140,640 280,660 200,780 50,770" fill="url(#facetSapphire)" />
              <polygon points="280,660 450,650 360,790 200,780" fill="url(#facetRuby)" />
              <polygon points="450,650 540,510 660,540 570,720" fill="url(#facetCobalt)" />
              <polygon points="570,720 660,540 720,620 650,760" fill="url(#facetGold)" />
              <polygon points="720,620 780,540 870,720 790,760" fill="url(#facetAmethyst)" />
              <polygon points="780,540 900,510 990,650 870,720" fill="url(#facetEmerald)" />
              <polygon points="990,650 1160,660 1080,790 950,780" fill="url(#facetRuby)" />
              <polygon points="1160,660 1300,640 1240,780 1080,790" fill="url(#facetAmber)" />
              <polygon points="1300,640 1440,630 1440,760 1390,770" fill="url(#facetCobalt)" />

              {/* Ground Border Mosaic Baseline */}
              <polygon points="0,760 50,770 0,900" fill="url(#facetRuby)" />
              <polygon points="50,770 200,780 130,900 0,900" fill="url(#facetGold)" />
              <polygon points="200,780 360,790 290,900 130,900" fill="url(#facetEmerald)" />
              <polygon points="360,790 500,800 440,900 290,900" fill="url(#facetSapphire)" />
              <polygon points="500,800 650,760 610,900 440,900" fill="url(#facetAmber)" />
              <polygon points="650,760 720,830 610,900" fill="url(#facetRuby)" />
              <polygon points="720,830 790,760 830,900 610,900" fill="url(#facetGold)" />
              <polygon points="790,760 940,800 830,900" fill="url(#facetCobalt)" />
              <polygon points="940,800 1080,790 1150,900 830,900" fill="url(#facetEmerald)" />
              <polygon points="1080,790 1240,780 1310,900 1150,900" fill="url(#facetAmethyst)" />
              <polygon points="1240,780 1390,770 1440,900 1310,900" fill="url(#facetAmber)" />
              <polygon points="1390,770 1440,760 1440,900" fill="url(#facetRuby)" />
            </g>
          </svg>

          {/* Warm Cathedral Light Beam from central rosette */}
          <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-1/4 w-[500px] h-[400px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        </div>

      {/* Very light transparent veil so mosaic colors shine brightly while keeping text readable */}
      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
    </div>
  );
};
