function LoadingSpinner() {
  try {
    return (
      <div className="flex flex-col items-center space-y-4" data-name="loading-spinner" data-file="components/LoadingSpinner.js">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--text-primary)]">Creating your avatar...</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">This may take a few moments</p>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-[var(--primary-color)] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[var(--primary-color)] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-[var(--primary-color)] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('LoadingSpinner component error:', error);
    return null;
  }
}
