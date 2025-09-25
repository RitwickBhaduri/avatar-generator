class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  try {
    const [currentStep, setCurrentStep] = React.useState(1);
    const [selfieImage, setSelfieImage] = React.useState(null);
    const [selectedTheme, setSelectedTheme] = React.useState(null);
    const [generatedAvatar, setGeneratedAvatar] = React.useState(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [baseSeed, setBaseSeed] = React.useState(null);
    const [variation, setVariation] = React.useState(0);

    const steps = [
      { id: 1, title: 'Upload Selfie', icon: 'camera' },
      { id: 2, title: 'Choose Theme', icon: 'palette' },
      { id: 3, title: 'Generate Avatar', icon: 'user-circle' }
    ];

    const handleSelfieUpload = (image) => {
      setSelfieImage(image);
      setCurrentStep(2);
      setGeneratedAvatar(null);
      setErrorMessage('');
      setBaseSeed(null);
      setVariation(0);
    };

    const handleThemeSelect = (theme) => {
      setSelectedTheme(theme);
      setErrorMessage('');
    };

    const handleGenerateAvatar = async (opts = { isRegenerate: false }) => {
      if (!selfieImage || !selectedTheme) return;
      
      setIsGenerating(true);
      setCurrentStep(3);
      setErrorMessage('');
      
      try {
        // initialize base seed on first generation
        const seedToUse = opts.isRegenerate ? (baseSeed ?? Date.now()) : (baseSeed ?? Date.now());
        if (!baseSeed) setBaseSeed(seedToUse);
        const variationToUse = opts.isRegenerate ? variation + 1 : 0;
        const avatar = await generateAvatar(selfieImage, selectedTheme, { seed: seedToUse, variation: variationToUse });
        setGeneratedAvatar(avatar);
        setVariation(variationToUse);
      } catch (error) {
        console.error('Avatar generation failed:', error);
        setErrorMessage(error?.message || 'Failed to generate avatar. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    };

    const handleStartOver = () => {
      setCurrentStep(1);
      setSelfieImage(null);
      setSelectedTheme(null);
      setGeneratedAvatar(null);
      setIsGenerating(false);
      setErrorMessage('');
      setBaseSeed(null);
      setVariation(0);
    };

    const completedSteps = React.useMemo(() => {
      if (generatedAvatar) return [1, 2, 3];
      if (selectedTheme && selfieImage) return [1, 2];
      if (selfieImage) return [1];
      return [];
    }, [selfieImage, selectedTheme, generatedAvatar]);

    return (
      <div className="min-h-screen dark-bg py-4 px-4" data-name="app" data-file="app.js">
        <div className="container mx-auto max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Avatar Generator</h1>
            <p className="text-[var(--text-secondary)] text-base">Transform your selfie into amazing avatars</p>
          </div>

          {/* Step Indicator removed */}

          {/* Main Content */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-6 mt-6">
            {currentStep === 1 && (
              <SelfieUpload onUpload={handleSelfieUpload} />
            )}

            {currentStep === 2 && (
              <ThemeSelector 
                selectedTheme={selectedTheme}
                onThemeSelect={handleThemeSelect}
                onGenerate={() => handleGenerateAvatar({ isRegenerate: false })}
                selfieImage={selfieImage}
                isGenerating={isGenerating}
              />
            )}

            {currentStep === 3 && (
              <AvatarPreview
                avatar={generatedAvatar}
                isGenerating={isGenerating}
                selectedTheme={selectedTheme}
                onStartOver={handleStartOver}
                onRegenerateWithTheme={() => handleGenerateAvatar({ isRegenerate: true })}
              />
            )}
          </div>
          {errorMessage && (
            <div className="mt-4" role="alert" aria-live="assertive">
              <div className="bg-red-500/15 border border-[var(--error-color)] text-[var(--text-primary)] rounded-lg p-3 text-sm">
                {errorMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);