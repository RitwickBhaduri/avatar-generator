function StepIndicator({ steps, currentStep, completedSteps }) {
  try {
    return (
      <div className="flex justify-center items-center space-x-4" data-name="step-indicator" data-file="components/StepIndicator.js">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div style={{"paddingTop":"0px","paddingRight":"0px","paddingBottom":"0px","paddingLeft":"0px","marginTop":"0px","marginRight":"0px","marginBottom":"0px","marginLeft":"0px","fontSize":"16px","color":"rgb(255, 255, 255)","backgroundColor":"rgba(0, 0, 0, 0)","textAlign":"center","fontWeight":"400","objectFit":"fill","display":"flex","position":"static","top":"auto","left":"auto","right":"auto","bottom":"auto"}} className="flex flex-col items-center">
              <div className={`step-indicator ${
                completedSteps.includes(step.id) ? 'completed' :
                currentStep === step.id ? 'active' : 'inactive'
              }`}>
                {completedSteps.includes(step.id) ? (
                  <div className="icon-check text-sm"></div>
                ) : (
                  <div className={`icon-${step.icon} text-sm`}></div>
                )}
              </div>
              <span className={`text-sm mt-2 font-medium ${
                currentStep === step.id ? 'text-white' : 'text-white/70'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-16 h-0.5 bg-white/30 mx-4 mt-[-20px]"></div>
            )}
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('StepIndicator component error:', error);
    return null;
  }
}