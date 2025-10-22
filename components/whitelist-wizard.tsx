"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WelcomeStep } from "./steps/welcome-step"
import { ConfigurationStep } from "./steps/configuration-step"
import { GuidanceStep } from "./steps/guidance-step"
import { CompletionStep } from "./steps/completion-step"
import { ProgressBar } from "./progress-bar"
import { StepIndicator } from "./step-indicator"

export type Language = "tr" | "en"

export interface WizardState {
  currentStep: number
  language: Language
  ipAddresses: string[]
  domains: string[]
  completedSteps: number[]
  screenshots: Array<{
    stepNumber: number
    stepName: string
    timestamp: string
    dataUrl: string
  }>
}

const TOTAL_STEPS = 8

export function WhitelistWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    language: "tr",
    ipAddresses: ["149.72.161.59", "149.72.42.201", "149.72.154.87"],
    domains: [],
    completedSteps: [],
    screenshots: [],
  })

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (state.currentStep < TOTAL_STEPS) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        completedSteps: [...prev.completedSteps, prev.currentStep],
      }))
    }
  }

  const prevStep = () => {
    if (state.currentStep > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }))
    }
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <WelcomeStep state={state} updateState={updateState} nextStep={nextStep} />
      case 1:
        return <ConfigurationStep state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        return <GuidanceStep state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
      case 8:
        return <CompletionStep state={state} updateState={updateState} prevStep={prevStep} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Keepnet Whitelist Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  {state.language === "tr" ? "Office 365 Yapılandırma Rehberi" : "Office 365 Configuration Guide"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateState({ language: state.language === "tr" ? "en" : "tr" })}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                {state.language === "tr" ? "🇬🇧 English" : "🇹🇷 Türkçe"}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Progress Section */}
      {state.currentStep > 0 && state.currentStep < TOTAL_STEPS && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-b border-border bg-card/30 backdrop-blur-sm"
        >
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {state.language === "tr" ? "İlerleme" : "Progress"}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {state.language === "tr" ? "Adım" : "Step"} {state.currentStep}/{TOTAL_STEPS}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <StepIndicator
                    key={i}
                    stepNumber={i + 1}
                    isActive={state.currentStep === i + 1}
                    isComplete={state.completedSteps.includes(i + 1)}
                  />
                ))}
              </div>
            </div>
            <ProgressBar current={state.currentStep} total={TOTAL_STEPS} />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            {state.language === "tr"
              ? "© 2025 Keepnet Labs. Tüm hakları saklıdır."
              : "© 2025 Keepnet Labs. All rights reserved."}
          </p>
        </div>
      </footer>
    </div>
  )
}
