import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

interface Step {
  number: number;
  title: string;
}

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const steps: Step[] = [
    { number: 1, title: "Connect" },
    { number: 2, title: "Configure" },
    { number: 3, title: "Execute" },
    { number: 4, title: "Results" }
  ];

  return (
    <div className="mb-8 py-4">
      <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 sm:text-base">
        {steps.map((step, index) => (
          <li 
            key={step.number}
            className={`flex md:w-full items-center 
              ${index < steps.length - 1 ? 
                "after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-200 after:border-1 after:hidden sm:after:inline-block after:mx-6 xl:after:mx-10" : ""} 
              ${currentStep >= step.number ? "text-primary" : ""}`}
            onClick={() => {
              // Allow clicking on any step for improved navigation
              if (onStepClick) {
                onStepClick(step.number);
              }
            }}
          >
            <span 
              className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 cursor-pointer transition-colors duration-200 
                ${currentStep >= step.number ? "bg-primary-light text-white hover:bg-primary-dark" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{step.number}</span>
              )}
            </span>
            <span className="hidden sm:inline-flex sm:ml-2 hover:underline cursor-pointer">{step.title}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
