export interface ThemeClasses {
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentGlow: string;
  hoverBg: string;
  progressText: string;
  activeTabBorder: string;
  glowPulse: string;
  bgGlowGradient: string;
  buttonGradient: string;
  focusBorder: string;
}

export const getThemeClasses = (color: string | null | undefined): ThemeClasses => {
  switch (color) {
    case 'violet':
      return {
        accentText: 'text-violet-400',
        accentBg: 'bg-violet-600 text-white font-semibold',
        accentBorder: 'border-violet-500/20',
        accentGlow: 'bg-violet-900/10',
        hoverBg: 'hover:bg-violet-700',
        progressText: 'text-violet-300',
        activeTabBorder: 'border-violet-600 text-violet-400',
        glowPulse: 'bg-violet-500',
        bgGlowGradient: 'bg-violet-900/10',
        buttonGradient: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/10 hover:shadow-violet-600/20 text-white',
        focusBorder: 'focus:border-violet-500'
      };
    case 'emerald':
      return {
        accentText: 'text-emerald-400',
        accentBg: 'bg-emerald-600 text-white font-semibold',
        accentBorder: 'border-emerald-500/20',
        accentGlow: 'bg-emerald-950/15',
        hoverBg: 'hover:bg-emerald-700',
        progressText: 'text-emerald-300',
        activeTabBorder: 'border-emerald-600 text-emerald-400',
        glowPulse: 'bg-emerald-500',
        bgGlowGradient: 'bg-emerald-900/10',
        buttonGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/10 hover:shadow-emerald-600/20 text-white',
        focusBorder: 'focus:border-emerald-500'
      };
    case 'blue':
      return {
        accentText: 'text-sky-400',
        accentBg: 'bg-sky-600 text-white font-semibold',
        accentBorder: 'border-sky-500/20',
        accentGlow: 'bg-sky-950/15',
        hoverBg: 'hover:bg-sky-700',
        progressText: 'text-sky-300',
        activeTabBorder: 'border-sky-600 text-sky-400',
        glowPulse: 'bg-sky-500',
        bgGlowGradient: 'bg-sky-900/10',
        buttonGradient: 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-600/10 hover:shadow-sky-600/20 text-white',
        focusBorder: 'focus:border-sky-500'
      };
    case 'yellow':
    default: // Yellow & Gray
      return {
        accentText: 'text-yellow-400',
        accentBg: 'bg-yellow-500 text-slate-950 font-bold',
        accentBorder: 'border-yellow-500/20',
        accentGlow: 'bg-yellow-500/10',
        hoverBg: 'hover:bg-yellow-600',
        progressText: 'text-yellow-300',
        activeTabBorder: 'border-yellow-500 text-yellow-400',
        glowPulse: 'bg-yellow-500',
        bgGlowGradient: 'bg-yellow-500/5',
        buttonGradient: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 shadow-yellow-500/10 hover:shadow-yellow-500/20 text-slate-950 font-bold',
        focusBorder: 'focus:border-yellow-500'
      };
  }
};
