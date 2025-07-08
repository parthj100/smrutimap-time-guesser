import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, MessageSquare, CheckCircle, Database, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useFocusManagement, useKeyboardNavigation } from '@/hooks/useAccessibility';
import { submitFeedback, validateFeedback, type FeedbackCategory } from '@/services/feedbackService';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormStep = 'category' | 'message' | 'email' | 'submit' | 'success';

const categoryOptions = [
  { value: 'general' as FeedbackCategory, label: 'General Feedback', emoji: '💭', description: 'Share your thoughts about SmrutiMap' },
  { value: 'bug' as FeedbackCategory, label: 'Bug Report', emoji: '🐛', description: 'Report something that isn\'t working' },
  { value: 'feature' as FeedbackCategory, label: 'Feature Request', emoji: '✨', description: 'Suggest new features or improvements' },
  { value: 'ui' as FeedbackCategory, label: 'User Interface', emoji: '🎨', description: 'Feedback about the design and layout' },
  { value: 'performance' as FeedbackCategory, label: 'Performance', emoji: '⚡', description: 'Report speed or performance issues' },
  { value: 'content' as FeedbackCategory, label: 'Game Content', emoji: '🗺️', description: 'Feedback about photos, locations, or gameplay' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('category');
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { trapFocus, restoreFocus } = useFocusManagement();

  const steps: FormStep[] = ['category', 'message', 'email', 'submit'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const cleanup = trapFocus(modalRef.current);
      return () => {
        cleanup();
        restoreFocus(previousFocusRef.current);
      };
    }
  }, [isOpen, trapFocus, restoreFocus]);

  // Keyboard navigation
  useKeyboardNavigation(
    undefined,
    onClose,
    undefined
  );

  const resetForm = () => {
    setCurrentStep('category');
    setFeedback('');
    setEmail('');
    setCategory('general');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    const validation = validateFeedback({
      category,
      message: feedback,
      email: email || undefined
    });

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedback({
        category,
        message: feedback,
        email: email || undefined,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      });

      if (result.success) {
        setCurrentStep('success');
        toast.success('Thank you for your feedback! We\'ve received your message and will review it soon.');
        
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        toast.error(result.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'category':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What's on your mind? 🤔
              </h2>
              <p className="text-lg text-gray-600">
                Choose the category that best describes your feedback
              </p>
            </div>
            
            <div className="grid gap-4">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setCategory(option.value);
                    nextStep();
                  }}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-200 text-left hover:border-[#ea384c] hover:shadow-lg hover:scale-[1.02] ${
                    category === option.value 
                      ? 'border-[#ea384c] bg-red-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">{option.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#ea384c] transition-colors">
                        {option.label}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {option.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#ea384c] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tell us more ✍️
              </h2>
              <p className="text-lg text-gray-600">
                Share your thoughts, ideas, or describe the issue you're experiencing
              </p>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                maxLength={2000}
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none resize-none transition-colors placeholder-gray-400"
                autoFocus
              />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{feedback.length}/2000 characters</span>
                <span className="text-xs">Press Enter to continue</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={prevStep}
                variant="outline"
                className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={!feedback.trim()}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Want us to follow up? 📧
              </h2>
              <p className="text-lg text-gray-600">
                Leave your email if you'd like us to respond (optional)
              </p>
            </div>
            
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                autoFocus
              />
              <p className="text-sm text-gray-500 text-center">
                We'll only use this to respond to your feedback
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={prevStep}
                variant="outline"
                className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'submit':
        const selectedCategory = categoryOptions.find(opt => opt.value === category);
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ready to send? 🚀
              </h2>
              <p className="text-lg text-gray-600">
                Review your feedback before submitting
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Category</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{selectedCategory?.emoji}</span>
                    <span className="text-lg font-medium">{selectedCategory?.label}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Message</h3>
                  <p className="text-gray-900 bg-white p-4 rounded-xl border">{feedback}</p>
                </div>
                
                {email && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Email</h3>
                    <p className="text-gray-900">{email}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={prevStep}
                variant="outline"
                className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Thanks for your feedback! 🎉
                </h2>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Your message has been saved securely and our team will review it soon. 
                  You're helping make SmrutiMap better!
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                <Database size={16} />
                <span>Stored securely in our database</span>
                <Sparkles size={16} className="text-yellow-500" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        {/* Header with Progress */}
        {currentStep !== 'success' && (
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#ea384c] rounded-full flex items-center justify-center">
                  <MessageSquare size={16} className="text-white" />
            </div>
                <span className="font-semibold text-gray-700">SmrutiMap Feedback</span>
          </div>
          <Button
                onClick={handleClose}
            variant="ghost"
            size="sm"
                className="text-gray-400 hover:text-gray-600 rounded-full"
            aria-label="Close feedback form"
          >
            <X size={20} />
          </Button>
        </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#ea384c] to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
          </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Step {currentStepIndex + 1} of {steps.length}
          </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-8">
          <div className="min-h-[400px] flex flex-col justify-center">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm; 