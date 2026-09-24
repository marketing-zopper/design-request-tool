import { useCallback, useEffect, useState } from 'react'
import { clearDraftFiles, getDraftFiles, setDraftFiles } from '../lib/fileDraftStore'

const STORAGE_KEY = 'design-request-draft-v1'

function makeDraftId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function makeEmptyRequirement() {
  return {
    draftId: makeDraftId(),
    designType: '',
    customDesignType: '',
    quantity: 1,
    deadline: '',
    dimensions: '',
    coBranding: false,
    partnerName: '',
    contentRequirement: '',
    referenceLink: '',
    additionalNotes: '',
    referenceFileNames: [],
    brandAssetFileNames: [],
    isSaved: false,
  }
}

const EMPTY_REQUESTER = {
  requesterName: '',
  team: '',
  requesterEmail: '',
  stakeholderId: '',
  customStakeholderName: '',
  customStakeholderEmail: '',
}

function loadInitialState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw)
    return {
      step: parsed.step ?? 1,
      requester: { ...EMPTY_REQUESTER, ...parsed.requester },
      requirements: Array.isArray(parsed.requirements) && parsed.requirements.length
        ? parsed.requirements
        : [makeEmptyRequirement()],
    }
  } catch {
    return { step: 1, requester: EMPTY_REQUESTER, requirements: [makeEmptyRequirement()] }
  }
}

export function useDraftForm() {
  const [state, setState] = useState(loadInitialState)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setStep = useCallback((step) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const setRequester = useCallback((patch) => {
    setState((prev) => ({ ...prev, requester: { ...prev.requester, ...patch } }))
  }, [])

  const addRequirement = useCallback(() => {
    setState((prev) => ({ ...prev, requirements: [...prev.requirements, makeEmptyRequirement()] }))
  }, [])

  const updateRequirement = useCallback((draftId, patch) => {
    setState((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) => (r.draftId === draftId ? { ...r, ...patch } : r)),
    }))
  }, [])

  const removeRequirement = useCallback((draftId) => {
    clearDraftFiles(draftId)
    setState((prev) => {
      const remaining = prev.requirements.filter((r) => r.draftId !== draftId)
      return { ...prev, requirements: remaining.length ? remaining : [makeEmptyRequirement()] }
    })
  }, [])

  const setRequirementSaved = useCallback((draftId, isSaved) => {
    setState((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) => (r.draftId === draftId ? { ...r, isSaved } : r)),
    }))
  }, [])

  const setRequirementFiles = useCallback(
    (draftId, key, files) => {
      setDraftFiles(draftId, key, files)
      const fileNamesKey = key === 'referenceFiles' ? 'referenceFileNames' : 'brandAssetFileNames'
      updateRequirement(draftId, {
        [fileNamesKey]: files.map((f) => ({ name: f.name, size: f.size })),
      })
    },
    [updateRequirement]
  )

  const getRequirementFiles = useCallback((draftId, key) => getDraftFiles(draftId, key), [])

  const reset = useCallback(() => {
    state.requirements.forEach((r) => clearDraftFiles(r.draftId))
    sessionStorage.removeItem(STORAGE_KEY)
    setState({ step: 1, requester: EMPTY_REQUESTER, requirements: [makeEmptyRequirement()] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.requirements])

  return {
    step: state.step,
    requester: state.requester,
    requirements: state.requirements,
    setStep,
    setRequester,
    addRequirement,
    updateRequirement,
    removeRequirement,
    setRequirementSaved,
    setRequirementFiles,
    getRequirementFiles,
    reset,
  }
}
