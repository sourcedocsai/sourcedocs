'use client';

import { useState } from 'react';

interface SurveyModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const ROLES = [
  'Solo Developer',
  'Team Developer',
  'Tech Lead / Manager',
  'Founder / CEO',
  'Student',
  'Other',
];

const TEAM_SIZES = [
  'Just me',
  '2-5',
  '6-20',
  '21-100',
  '100+',
];

const DOC_FREQUENCIES = [
  'Daily',
  'Weekly',
  'Monthly',
  'Rarely',
  'Starting a new project now',
];

const DOC_TYPES = [
  'README',
  'CHANGELOG',
  'CONTRIBUTING',
  'LICENSE',
  'CODE_OF_CONDUCT',
  'API Documentation',
  'Code Comments',
];

const WOULD_PAY_OPTIONS = [
  'Yes, definitely',
  'Yes, if it saves me time',
  'Maybe, need to try more',
  'No, I\'d use the free tier only',
  'No, I\'d find an alternative',
];

export function SurveyModal({ onClose, onComplete }: SurveyModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    role: '',
    team_size: '',
    doc_frequency: '',
    important_docs: [] as string[],
    would_pay: '',
    feedback: '',
    email: '',
  });

  const toggleDoc = (doc: string) => {
    setForm(prev => ({
      ...prev,
      important_docs: prev.important_docs.includes(doc)
        ? prev.important_docs.filter(d => d !== doc)
        : [...prev.important_docs, doc],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        onComplete();
      }
    } catch (error) {
      console.error('Survey submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return form.role && form.team_size;
    if (step === 2) return form.doc_frequency && form.important_docs.length > 0;
    if (step === 3) return form.would_pay;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Quick Feedback</h2>
            <p className="text-zinc-400 text-sm">Help us build what you need (30 sec)</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl"
          >
            ×
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded ${s <= step ? 'bg-white' : 'bg-zinc-700'}`}
            />
          ))}
        </div>

        {/* Step 1: Role & Team */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">What's your role?</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setForm(prev => ({ ...prev, role }))}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      form.role === role
                        ? 'bg-white text-zinc-900'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Team size?</label>
              <div className="flex flex-wrap gap-2">
                {TEAM_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setForm(prev => ({ ...prev, team_size: size }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      form.team_size === size
                        ? 'bg-white text-zinc-900'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Usage */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">How often do you write docs?</label>
              <div className="space-y-2">
                {DOC_FREQUENCIES.map(freq => (
                  <button
                    key={freq}
                    onClick={() => setForm(prev => ({ ...prev, doc_frequency: freq }))}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      form.doc_frequency === freq
                        ? 'bg-white text-zinc-900'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Which docs matter most? (select all)</label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map(doc => (
                  <button
                    key={doc}
                    onClick={() => toggleDoc(doc)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      form.important_docs.includes(doc)
                        ? 'bg-white text-zinc-900'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {doc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Would you pay $8/month for unlimited docs?
            </label>
            <div className="space-y-2">
              {WOULD_PAY_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => setForm(prev => ({ ...prev, would_pay: option }))}
                  className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    form.would_pay === option
                      ? 'bg-white text-zinc-900'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Optional Feedback */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What's missing or could be better? (optional)
              </label>
              <textarea
                value={form.feedback}
                onChange={(e) => setForm(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="I wish it could..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email for early Pro access (optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Skip
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
