function ThemeSelector({ selectedTheme, onThemeSelect, onGenerate, selfieImage, isGenerating }) {
  try {
    const themes = [
      {
        id: 'superhero',
        name: 'Comic Superhero',
        description: 'Heroic and powerful with cape and mask',
        gradient: 'from-red-500 to-blue-600',
        icon: 'zap'
      },
      {
        id: 'professional',
        name: 'LinkedIn Professional',
        description: 'Corporate and business-ready look',
        gradient: 'from-blue-600 to-indigo-700',
        icon: 'briefcase'
      },
      {
        id: 'instagram',
        name: 'Instagram Model',
        description: 'Glamorous and photo-ready style',
        gradient: 'from-pink-500 to-purple-600',
        icon: 'instagram'
      },
      {
        id: 'sports',
        name: 'Sports Person',
        description: 'Athletic and energetic appearance',
        gradient: 'from-green-500 to-emerald-600',
        icon: 'trophy'
      },
      {
        id: 'cyberpunk',
        name: 'Cyberpunk Warrior',
        description: 'Futuristic and tech-enhanced',
        gradient: 'from-purple-600 to-cyan-500',
        icon: 'cpu'
      },
      {
        id: 'popstar',
        name: 'Pop Star',
        description: 'Trendy and music industry style',
        gradient: 'from-yellow-500 to-pink-500',
        icon: 'music'
      },
      {
        id: 'scifi',
        name: 'Sci-Fi Adventurer',
        description: 'Space explorer and futuristic',
        gradient: 'from-indigo-600 to-purple-700',
        icon: 'rocket'
      },
      {
        id: 'meme',
        name: 'Meme Lord',
        description: 'Internet culture and humor',
        gradient: 'from-orange-500 to-red-500',
        icon: 'smile'
      },
      {
        id: 'retro',
        name: 'Retro Vibes',
        description: 'Vintage and nostalgic style',
        gradient: 'from-amber-500 to-orange-600',
        icon: 'radio'
      },
      {
        id: 'anime',
        name: 'Anime Character',
        description: 'Japanese animation style',
        gradient: 'from-rose-500 to-pink-600',
        icon: 'star'
      }
    ];

    return (
      <div className="text-center" data-name="theme-selector" data-file="components/ThemeSelector.js">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Choose Your Style</h2>
        <p className="text-[var(--text-secondary)] mb-6">Select a theme for your avatar transformation</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`theme-card ${selectedTheme?.id === theme.id ? 'selected' : ''}`}
              onClick={() => onThemeSelect(theme)}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${theme.gradient} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <div className={`icon-${theme.icon} text-xl text-white`}></div>
              </div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-1">{theme.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-tight">{theme.description}</p>
            </div>
          ))}
        </div>

        {selfieImage && (
          <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-[var(--accent-color)] rounded-xl">
            <div className="text-center">
              <p className="text-xs text-[var(--text-secondary)] mb-2">Your Selfie</p>
              <img 
                src={selfieImage} 
                alt="Your selfie" 
                className="w-16 h-16 rounded-full object-cover border-2 border-[var(--primary-color)] shadow-lg"
              />
            </div>
            {selectedTheme && (
              <>
                <div className="icon-arrow-right text-xl text-[var(--primary-color)]"></div>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{selectedTheme.name}</p>
                  <div className={`w-16 h-16 bg-gradient-to-br ${selectedTheme.gradient} rounded-full flex items-center justify-center border-2 border-[var(--primary-color)] shadow-lg`}>
                    <div className={`icon-${selectedTheme.icon} text-xl text-white`}></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* spacer to prevent content behind floating CTA */}
        <div className="h-24"></div>
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 w-full max-w-md px-4 z-50">
          <button 
            onClick={onGenerate}
            disabled={!selectedTheme || isGenerating}
            aria-disabled={!selectedTheme || isGenerating}
            className={`btn-primary w-full text-lg py-3 shadow-xl ${(!selectedTheme || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-busy={isGenerating ? 'true' : 'false'}
          >
            {isGenerating ? 'Generating…' : 'Generate Avatar'}
            <div className="icon-wand text-xl"></div>
          </button>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ThemeSelector component error:', error);
    return null;
  }
}