'use client';

import { useState } from 'react';

interface PricingModalProps {
  currentPlan: string;
  onClose: () => void;
  onSelectPlan: (plan: string) => void;
}

const PLANS = [
  {
    id: 'web_pro',
    name: 'Web Pro',
    price: '$8',
    period: '/month',
    description: 'Unlimited web generations',
    features: [
      'Unlimited README generations',
      'Unlimited CHANGELOG generations',
      'Unlimited CONTRIBUTING generations',
      'Unlimited LICENSE generations',
      'Unlimited CODE_OF_CONDUCT generations',
    ],
    cta: 'Get Web Pro',
    popular: false,
  },
  {
    id: 'bundle',
    name: 'Bundle',
    price: '$20',
    period: '/month',
    description: 'Web + API access',
    features: [
      'Everything in Web Pro',
      '100 API calls/month',
      'API key access',
      'MCP server support',
      'Priority support',
    ],
    cta: 'Get Bundle',
    popular: true,
  },
  {
    id: 'api_pro',
    name: 'API Pro',
    price: '$15',
    period: '/month',
    description: 'API access only',
    features: [
      '100 API calls/month',
      'API key access',
      'MCP server support',
      '1 web generation/month',
    ],
    cta: 'Get API Pro',
    popular: false,
  },
];

export function PricingModal({ currentPlan, onClose, onSelectPlan }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    if (planId === currentPlan) return;
    
    setLoading(planId);
    try {
      await onSelectPlan(planId);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
            <p className="text-zinc-400 text-sm">Choose the plan that works for you</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 ${
                plan.popular
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-zinc-800 bg-zinc-800/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-black text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-zinc-500 text-sm">{plan.description}</p>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-zinc-500">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading !== null || plan.id === currentPlan}
                className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                  plan.id === currentPlan
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-green-500 hover:bg-green-400 text-black'
                    : 'bg-white hover:bg-zinc-200 text-zinc-900'
                } disabled:opacity-50`}
              >
                {loading === plan.id
                  ? 'Loading...'
                  : plan.id === currentPlan
                  ? 'Current Plan'
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-xs mt-6">
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
