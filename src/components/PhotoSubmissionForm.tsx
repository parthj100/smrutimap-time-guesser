import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ArrowRight, ArrowLeft, CheckCircle, Camera, Calendar, MapPin, Info, Sparkles, FileImage, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useFocusManagement, useKeyboardNavigation } from '@/hooks/useAccessibility';
import { 
  submitPhotoWithFile, 
  validatePhotoSubmission, 
  type PhotoSubmissionData,
  type YearConfidence 
} from '@/services/photoSubmissionService';

interface PhotoSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormStep = 'welcome' | 'photo' | 'personal' | 'location' | 'year' | 'details' | 'review' | 'submit' | 'success';

const yearConfidenceOptions: Array<{ value: YearConfidence; label: string; emoji: string; description: string }> = [
  { value: 'exact', label: 'Exact Year', emoji: '🎯', description: 'I know the exact year this photo was taken' },
  { value: 'approximate', label: 'Approximate Year', emoji: '📅', description: 'I have a good estimate (within 1-2 years)' },
  { value: 'decade', label: 'General Decade', emoji: '🗓️', description: 'I know the general decade (e.g., 1980s)' },
  { value: 'unknown', label: 'Unknown Year', emoji: '❓', description: 'I\'m not sure when this photo was taken' }
];

export const PhotoSubmissionForm: React.FC<PhotoSubmissionFormProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<PhotoSubmissionData>>({
    submitterName: '',
    email: '',
    photoFile: undefined,
    locationDescription: '',
    yearTaken: undefined,
    yearConfidence: 'approximate',
    description: '',
    cluesDescription: ''
  });

  const { trapFocus, restoreFocus } = useFocusManagement();

  const steps: FormStep[] = ['welcome', 'photo', 'personal', 'location', 'year', 'details', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = currentStep === 'success' ? 100 : ((currentStepIndex + 1) / steps.length) * 100;

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
    setCurrentStep('welcome');
    setFormData({
      submitterName: '',
      email: '',
      photoFile: undefined,
      locationDescription: '',
      yearTaken: undefined,
      yearConfidence: 'approximate',
      description: '',
      cluesDescription: ''
    });
    setPhotoPreview(null);
    setIsSubmitting(false);
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

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photoFile: file }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = async () => {
    // Check if we have all required data
    if (!formData.submitterName || !formData.email || !formData.photoFile || !formData.locationDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('submit');

    try {
      const result = await submitPhotoWithFile(formData as PhotoSubmissionData);

      if (result.success) {
        setCurrentStep('success');
        toast.success('Your photo has been submitted successfully! We\'ll review it and may feature it in SmrutiMap.');
        
        setTimeout(() => {
          handleClose();
        }, 4000);
      } else {
        throw new Error(result.error || 'Failed to submit photo');
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit photo. Please try again.');
      setCurrentStep('review'); // Go back to review step
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof PhotoSubmissionData, value: string | number | File | YearConfidence | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
                <Camera size={40} className="text-white" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Share Your Photos! 📸
                </h2>
              </div>

              <div className="grid gap-4 max-w-md mx-auto text-left">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">📍</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Clear Location</h3>
                    <p className="text-sm text-gray-600">Photos with identifiable landmarks or addresses</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Time Clues</h3>
                    <p className="text-sm text-gray-600">Elements that help identify when the photo was taken</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={nextStep}
                className="px-8 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white text-lg font-medium"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'photo':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Upload Your Photo 📤
              </h2>
              <p className="text-lg text-gray-600">
                Choose a high-quality photo (JPEG, PNG, or WebP)
              </p>
            </div>

            <div className="space-y-6">
              {!photoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#ea384c] hover:bg-red-50 transition-all cursor-pointer group"
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 group-hover:bg-[#ea384c] rounded-full flex items-center justify-center mx-auto transition-colors">
                      <Upload className="w-8 h-8 text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-gray-900 mb-2">Click to upload photo</p>
                      <p className="text-gray-600">Or drag and drop your image here</p>
                      <p className="text-sm text-gray-500 mt-2">Maximum file size: 10MB</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 right-4">
                      <Button
                        onClick={() => {
                          setPhotoPreview(null);
                          updateFormData('photoFile', undefined);
                        }}
                        variant="secondary"
                        size="sm"
                        className="bg-white/90 hover:bg-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Photo uploaded successfully!</p>
                      <p className="text-sm text-green-700">
                        {formData.photoFile?.name} ({Math.round((formData.photoFile?.size || 0) / 1024)}KB)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
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
                disabled={!formData.photoFile}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tell us about yourself 👋
              </h2>
              <p className="text-lg text-gray-600">
                We'd like to know who's contributing to SmrutiMap
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">Your Name</label>
                <input
                  type="text"
                  value={formData.submitterName || ''}
                  onChange={(e) => updateFormData('submitterName', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 mt-2">
                  We'll contact you if we need more details about your photo
                </p>
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
                disabled={!formData.submitterName?.trim() || !formData.email?.trim()}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Where was this taken? 📍
              </h2>
              <p className="text-lg text-gray-600">
                Describe the location as specifically as possible
              </p>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={formData.locationDescription || ''}
                onChange={(e) => updateFormData('locationDescription', e.target.value)}
                placeholder="e.g., Main Street, Downtown Springfield, Illinois, USA near the old courthouse..."
                rows={5}
                maxLength={500}
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none resize-none transition-colors placeholder-gray-400"
                autoFocus
              />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{(formData.locationDescription || '').length}/500 characters</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Be as specific as possible</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Location Tips</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Include street names, landmarks, or building names</li>
                    <li>• Mention the city, state/province, and country</li>
                    <li>• Note any distinctive features visible in the photo</li>
                  </ul>
                </div>
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
                disabled={!formData.locationDescription?.trim()}
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'year':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                When was this photo taken? 📅
              </h2>
              <p className="text-lg text-gray-600">
                Help us understand the timeframe of your photo
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Year (if known)
                </label>
                <input
                  type="number"
                  value={formData.yearTaken || ''}
                  onChange={(e) => updateFormData('yearTaken', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 1985"
                  min="1800"
                  max={new Date().getFullYear()}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-4">
                  How confident are you about the year?
                </label>
                <div className="grid gap-3">
                  {yearConfidenceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateFormData('yearConfidence', option.value)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left hover:border-[#ea384c] hover:shadow-lg ${
                        formData.yearConfidence === option.value 
                          ? 'border-[#ea384c] bg-red-50' 
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{option.emoji}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{option.label}</h3>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Additional Details ✨
              </h2>
              <p className="text-lg text-gray-600">
                Share more context about your photo (optional)
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Photo Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Tell us about what's happening in the photo, who took it, or any interesting story behind it..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none resize-none transition-colors placeholder-gray-400"
                />
                <div className="text-sm text-gray-500 mt-2">
                  {(formData.description || '').length}/1000 characters
                </div>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Time Period Clues
                </label>
                <textarea
                  value={formData.cluesDescription || ''}
                  onChange={(e) => updateFormData('cluesDescription', e.target.value)}
                  placeholder="What visual clues help identify when this photo was taken? (cars, clothing, architecture, signs, etc.)"
                  rows={4}
                  maxLength={1000}
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none resize-none transition-colors placeholder-gray-400"
                />
                <div className="text-sm text-gray-500 mt-2">
                  {(formData.cluesDescription || '').length}/1000 characters
                </div>
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
                className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'review': {
        const selectedConfidence = yearConfidenceOptions.find(opt => opt.value === formData.yearConfidence);
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Review Your Submission 👀
              </h2>
              <p className="text-lg text-gray-600">
                Please review all details before submitting
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 space-y-6">
                {/* Photo Preview */}
                {photoPreview && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Photo</h3>
                    <div className="relative w-full h-48 rounded-xl overflow-hidden">
                      <img src={photoPreview} alt="Submission preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Personal Info */}
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Submitter</h3>
                  <div className="bg-white p-4 rounded-xl border space-y-2">
                    <p><span className="font-medium">Name:</span> {formData.submitterName}</p>
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Location</h3>
                  <div className="bg-white p-4 rounded-xl border">
                    <p>{formData.locationDescription}</p>
                  </div>
                </div>

                {/* Year */}
                <div>
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Year Information</h3>
                  <div className="bg-white p-4 rounded-xl border space-y-2">
                    <p><span className="font-medium">Year:</span> {formData.yearTaken || 'Not specified'}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Confidence:</span>
                      <span>{selectedConfidence?.emoji}</span>
                      <span>{selectedConfidence?.label}</span>
                    </div>
                  </div>
                </div>

                {/* Optional Details */}
                {(formData.description || formData.cluesDescription) && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Additional Details</h3>
                    <div className="bg-white p-4 rounded-xl border space-y-3">
                      {formData.description && (
                        <div>
                          <span className="font-medium">Description:</span>
                          <p className="mt-1 text-gray-700">{formData.description}</p>
                        </div>
                      )}
                      {formData.cluesDescription && (
                        <div>
                          <span className="font-medium">Time Period Clues:</span>
                          <p className="mt-1 text-gray-700">{formData.cluesDescription}</p>
                        </div>
                      )}
                    </div>
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      }

      case 'submit':
        return (
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Submitting Your Photo... 🚀
                </h2>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Please wait while we process your submission. This may take a few moments.
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                <FileImage size={16} />
                <span>Processing your submission...</span>
              </div>
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
                  Photo Submitted Successfully! 🎉
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Thank you for contributing to SmrutiMap! Your photo has been submitted for review. 
                  If approved, it will be featured in our historic photo collection and may appear in future games.
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
                <h3 className="font-semibold text-green-900 mb-3">What happens next?</h3>
                <ul className="text-sm text-green-800 space-y-2 text-left">
                  <li>• Our team will review your submission</li>
                  <li>• We may contact you if we need more details</li>
                  <li>• Approved photos will be added to SmrutiMap</li>
                  <li>• You'll be credited as the contributor!</li>
                </ul>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                <Database size={16} />
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
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-submission-title"
      >
        {/* Header with Progress */}
        {currentStep !== 'success' && currentStep !== 'submit' && (
          <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#ea384c] rounded-full flex items-center justify-center">
                  <Camera size={16} className="text-white" />
                </div>
                <span className="font-semibold text-gray-700">Submit Photo</span>
              </div>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 rounded-full"
                aria-label="Close photo submission form"
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
          <div className="min-h-[500px] flex flex-col justify-center">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoSubmissionForm; 