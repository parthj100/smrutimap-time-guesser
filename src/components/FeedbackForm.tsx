import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useFocusManagement, useKeyboardNavigation } from '@/hooks/useAccessibility';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { trapFocus, restoreFocus } = useFocusManagement();

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Trap focus within the modal
      const cleanup = trapFocus(modalRef.current);
      
      return () => {
        cleanup();
        // Restore focus when modal closes
        restoreFocus(previousFocusRef.current);
      };
    }
  }, [isOpen, trapFocus, restoreFocus]);

  // Keyboard navigation
  useKeyboardNavigation(
    undefined, // onEnter
    onClose,   // onEscape
    undefined  // onArrowKeys
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create mailto link with feedback details
      const subject = encodeURIComponent(`SmrutiMap Feedback - ${category.charAt(0).toUpperCase() + category.slice(1)}`);
      const body = encodeURIComponent(
        `Feedback Category: ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n` +
        `Feedback:\n${feedback}\n\n` +
        (email ? `Contact Email: ${email}\n\n` : '') +
        `Sent from SmrutiMap Game`
      );
      
      const mailtoLink = `mailto:smrutimap@gmail.com?subject=${subject}&body=${body}`;
      
      // Open email client
      window.location.href = mailtoLink;
      
      // Show success message and reset form
      toast.success('Thank you for your feedback! Your email client should open shortly.');
      setFeedback('');
      setEmail('');
      setCategory('general');
      onClose();
    } catch (error) {
      toast.error('Failed to open email client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        aria-describedby="feedback-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ea384c] rounded-full flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h2 id="feedback-title" className="text-xl font-bold text-gray-900">Send Feedback</h2>
              <p id="feedback-description" className="text-sm text-gray-600">Help us improve SmrutiMap</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close feedback form"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ea384c] focus:border-[#ea384c] outline-none"
            >
              <option value="general">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="ui">User Interface</option>
              <option value="performance">Performance</option>
              <option value="content">Game Content</option>
            </select>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ea384c] focus:border-[#ea384c] outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave your email if you'd like us to respond
            </p>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Feedback *
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you think about SmrutiMap..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ea384c] focus:border-[#ea384c] outline-none resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {feedback.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              className="flex-1 bg-[#ea384c] hover:bg-red-600 text-white flex items-center gap-2"
            >
              <Send size={16} />
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> This will open your email client to send feedback to smrutimap@gmail.com. 
              No data is stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm; 