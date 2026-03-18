// ============================================================
// Problem 02 — Async Wizard with Dynamic Steps
// ============================================================



// ============================================================
// types/wizard.ts  (extensions)
//
// WizardStep adds "passport" between "destination" and "details"
//
// WizardFormData adds (passport step):
//   passportNumber, passportExpiry, passportCountry
//
// WizardState adds:
//   activeSteps: WizardStep[]     ← dynamic, computed from selections
//   stepLoading: boolean          ← true while fetching step data
//   stepData: Record<string, unknown>  ← fetched data (e.g. destinations list)
//   history: WizardState[]        ← stack for UNDO_LAST (max 10 entries)
//
// WizardAction adds:
//   SKIP_STEP
//   SET_STEP_LOADING: { loading: boolean }
//   SET_STEP_DATA: { data: Record<string, unknown> }
//   SET_ACTIVE_STEPS: { steps: WizardStep[] }
//   UNDO_LAST
// ============================================================



// ============================================================
// utils/computeActiveSteps.ts
//
// function computeActiveSteps(formData: WizardFormData): WizardStep[]
//
// if destinationType === "international":
//   return ["school", "destination", "passport", "details", "review", "confirm"]
// else:
//   return ["school", "destination", "details", "review", "confirm"]
//
// Called inside reducer's SET_FIELD case when field === "destinationType"
// ============================================================



// ============================================================
// reducers/bookingWizardReducer.ts  (extended cases)
//
// History pattern (add to every mutating case before returning):
//   trimmedHistory = [...state.history, state].slice(-10)  ← max 10 snapshots
//   return { ...newState, history: trimmedHistory }
//
// SET_FIELD (extended):
//   newFormData = { ...state.formData, [field]: value }
//   if field === "destinationType":
//     activeSteps = computeActiveSteps(newFormData)
//     stepIndex   = activeSteps.indexOf(state.currentStep)  ← recompute index
//   return { ...state, formData: newFormData, activeSteps, stepIndex, history: trimmed, ... }
//
// SKIP_STEP:
//   nextIndex = stepIndex + 1
//   if nextIndex >= activeSteps.length: return state
//   return { ...state, stepIndex: nextIndex, currentStep: activeSteps[nextIndex],
//            errors: {}, history: trimmed }
//
// SET_STEP_LOADING:  { ...state, stepLoading: action.loading }
// SET_STEP_DATA:     { ...state, stepData: { ...state.stepData, ...action.data } }
//
// UNDO_LAST:
//   if history.length === 0: return state
//   previous = history[history.length - 1]
//   return { ...previous, history: history.slice(0, -1) }
//   ← restores entire previous state including formData, step, errors
// ============================================================



// ============================================================
// hooks/useBookingWizard.ts  (extended)
//
// Per-step data fetch useEffect([state.currentStep]):
//   if state.currentStep !== "destination": return
//   dispatch({ type: "SET_STEP_LOADING", loading: true })
//   fetch("/api/destinations")
//     .then(r => r.json())
//     .then(data => dispatch({ type: "SET_STEP_DATA", data: { destinations: data } }))
//     .catch(err => dispatch({ type: "SUBMIT_ERROR", error: err.message }))
//     .finally(() => dispatch({ type: "SET_STEP_LOADING", loading: false }))
//
// Add to return:
//   skipStep = useCallback(() => dispatch({ type: "SKIP_STEP" }), [])
//   undo     = useCallback(() => dispatch({ type: "UNDO_LAST" }), [])
//   canUndo  = state.history.length > 0
// ============================================================



// ============================================================
// components/BookingWizard.tsx  (additions)
//
// Undo button (show when canUndo):
//   <button onClick={undo} className="text-sm text-gray-500">↩ Undo</button>
//
// Step loading spinner (show when state.stepLoading):
//   <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
//
// Passport step (only when state.currentStep === "passport"):
//   <PassportStep data={state.formData} errors={state.errors}
//                 setField={setField} onSkip={skipStep} />
//
// activeSteps drives WizardProgress (replaces static STEPS constant):
//   <WizardProgress steps={state.activeSteps} currentStep={state.currentStep} ... />
//
// DestinationStep reads fetched data:
//   destinations = state.stepData.destinations as Destination[]
//   ← populate select from API data, not hardcoded list
// ============================================================



// ============================================================
// Key patterns
//
// Why useReducer over useState for wizards:
//   Single source of truth — all transitions in one place
//   Impossible states prevented — can't be on step 3 with step 1 data missing
//   History/undo is trivial — push to array before each transition
//   Actions auditable — works with Redux DevTools
//   Validation centralized — not scattered across step components
//
// Discriminated union guarantees:
//   action.type === "SET_FIELD"    → TS knows action.field and action.value exist
//   action.type === "SUBMIT_ERROR" → TS knows action.error exists
//
// RESET returns { ...initialState }   ← spread prevents reference mutation
// ============================================================
