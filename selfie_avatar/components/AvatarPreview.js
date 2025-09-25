function AvatarPreview({ avatar, isGenerating, selectedTheme, onStartOver, onRegenerateWithTheme }) {
  try {
    const [showShareOptions, setShowShareOptions] = React.useState(false);

    const downloadAvatar = () => {
      if (!avatar) return;
      
      const link = document.createElement('a');
      link.download = `avatar-${selectedTheme?.name || 'generated'}.png`;
      link.href = avatar;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const shareToSocial = (platform) => {
      const text = `Check out my new ${selectedTheme?.name} avatar!`;
      const pageUrl = window.location.href;
      const hashtags = 'AvatarGenerator,PersonalizedAvatar';
      
      const urls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}&hashtags=${hashtags}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + pageUrl)}`,
        instagram: `https://www.instagram.com/`
      };
      
      if (urls[platform]) {
        window.open(urls[platform], '_blank', 'width=600,height=400');
      }
    };

    return (
      <div className="text-center" data-name="avatar-preview" data-file="components/AvatarPreview.js">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Your Avatar</h2>
        {isGenerating && (
          <p className="text-[var(--text-secondary)] mb-6">
            Generating your personalized avatar...
          </p>
        )}

        <div className="mb-6">
          {isGenerating ? (
            <div className="w-full aspect-square bg-[var(--accent-color)] rounded-2xl flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : avatar ? (
            <div className="relative">
              <img 
                src={avatar} 
                alt={`${selectedTheme?.name} avatar`}
                className="w-full aspect-square object-cover rounded-2xl shadow-xl border-4 border-[var(--primary-color)]"
              />
              <div className="absolute top-4 right-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${selectedTheme?.gradient} rounded-full flex items-center justify-center border-2 border-black`}>
                  <div className={`icon-${selectedTheme?.icon} text-xl text-white`}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square bg-[var(--accent-color)] rounded-2xl flex items-center justify-center">
              <div className="text-[var(--text-secondary)]">
                <div className="icon-image text-4xl mb-2 text-[var(--primary-color)]"></div>
                <p>Avatar will appear here</p>
              </div>
            </div>
          )}
        </div>

        {avatar && !isGenerating && (
          <div className="space-y-6">
            <div className="flex gap-2 justify-center flex-nowrap overflow-x-auto py-1">
              <button onClick={downloadAvatar} className="btn-primary px-4 py-2 text-sm" aria-label="Download avatar as PNG">
                <div className="icon-download text-base"></div>
                Download
              </button>
              <button 
                onClick={() => setShowShareOptions(!showShareOptions)}
                className="btn-secondary px-4 py-2 text-sm"
                aria-expanded={showShareOptions ? 'true' : 'false'}
                aria-controls="share-options"
              >
                <div className="icon-share-2 text-base"></div>
                Share
              </button>
              <button onClick={onRegenerateWithTheme} className="btn-secondary px-4 py-2 text-sm" disabled={isGenerating} aria-disabled={isGenerating ? 'true' : 'false'} aria-busy={isGenerating ? 'true' : 'false'}>
                <div className="icon-refresh-cw text-base"></div>
                Regenerate
              </button>
            </div>

            {showShareOptions && (
              <div id="share-options" className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4" role="region" aria-label="Share options">
                <p className="text-sm text-[var(--text-secondary)] mb-4">Share your avatar</p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => shareToSocial('twitter')}
                    className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                    aria-label="Share on Twitter"
                  >
                    <div className="icon-twitter text-lg"></div>
                  </button>
                  <button 
                    onClick={() => shareToSocial('facebook')}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                    aria-label="Share on Facebook"
                  >
                    <div className="icon-facebook text-lg"></div>
                  </button>
                  <button 
                    onClick={() => shareToSocial('linkedin')}
                    className="w-10 h-10 bg-blue-700 text-white rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors"
                    aria-label="Share on LinkedIn"
                  >
                    <div className="icon-linkedin text-lg"></div>
                  </button>
                  <button 
                    onClick={() => shareToSocial('whatsapp')}
                    className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                    aria-label="Share on WhatsApp"
                  >
                    <div className="icon-message-square text-lg"></div>
                  </button>
                  <button 
                    onClick={() => shareToSocial('instagram')}
                    className="w-10 h-10 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors"
                    aria-label="Open Instagram"
                  >
                    <div className="icon-instagram text-lg"></div>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button onClick={onStartOver} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <div className="icon-arrow-left text-lg inline mr-2"></div>
                Create Another Avatar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('AvatarPreview component error:', error);
    return null;
  }
}