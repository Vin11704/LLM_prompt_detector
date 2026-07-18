import { useReducer, useCallback, useRef } from 'react';
import { apiUrl } from '../utils/api';

// ── Action types ──
const ACTIONS = {
  SET_PROMPTS: 'SET_PROMPTS',
  SET_ERROR: 'SET_ERROR',
  DISMISS_ERROR: 'DISMISS_ERROR',
  START_RUN: 'START_RUN',
  SET_STEP: 'SET_STEP',
  SET_CURRENT_PROMPT: 'SET_CURRENT_PROMPT',
  ADD_RESULT: 'ADD_RESULT',
  ADD_ERROR_RESULT: 'ADD_ERROR_RESULT',
  SET_COMPLETE: 'SET_COMPLETE',
  RESET: 'RESET',
};

const initialState = {
  parsedPrompts: [],
  total: 0,
  completed: 0,
  currentStep: null, // 'classify' | 'test' | 'eval' | null
  currentPromptText: '',
  results: [],
  errors: [], // per-prompt failures: { index, message }
  summary: null,
  error: null,
  isRunning: false,
  finalReport: null,
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PROMPTS:
      return {
        ...state,
        parsedPrompts: action.payload.prompts,
        total: action.payload.total,
        error: null,
      };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isRunning: false };

    case ACTIONS.DISMISS_ERROR:
      return { ...state, error: null };

    case ACTIONS.START_RUN:
      return {
        ...state,
        completed: 0,
        results: [],
        errors: [],
        summary: null,
        finalReport: null,
        error: null,
        isRunning: true,
        currentStep: null,
        currentPromptText: '',
      };

    case ACTIONS.SET_STEP:
      return { ...state, currentStep: action.payload };

    case ACTIONS.SET_CURRENT_PROMPT:
      return { ...state, currentPromptText: action.payload };

    case ACTIONS.ADD_RESULT:
      return {
        ...state,
        results: [...state.results, action.payload],
        completed: state.completed + 1,
      };

    case ACTIONS.ADD_ERROR_RESULT:
      return {
        ...state,
        completed: state.completed + 1,
        errors: [
          ...state.errors,
          {
            index: action.payload.index,
            message: action.payload.message || 'Unknown error',
          },
        ],
      };

    case ACTIONS.SET_COMPLETE: {
      const { summary, results } = action.payload;
      return {
        ...state,
        isRunning: false,
        currentStep: null,
        currentPromptText: '',
        summary,
        finalReport: {
          generated_at: new Date().toISOString(),
          target_model: 'gemini-2.5-flash',
          classifier_model: 'gemini-3.1-pro-preview',
          judge_model: 'gemini-3.1-pro-preview',
          total_prompts: summary.total,
          summary,
          results,
        },
      };
    }

    case ACTIONS.RESET:
      return initialState;

    default:
      return state;
  }
}

/**
 * Custom hook for managing the entire evaluation lifecycle:
 * - Parsing uploaded files via POST /parse
 * - Streaming SSE results via POST /evaluate
 * - Building the final report for download
 */
export function useEvaluation() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(null);

  // ── Parse a .txt file ──
  const parseFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(apiUrl('/parse'), { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      dispatch({
        type: ACTIONS.SET_PROMPTS,
        payload: { prompts: data.prompts, total: data.total },
      });
      return data;
    } catch (e) {
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: `Backend unreachable: ${e.message}. Is the server running on http://localhost:8000?`,
      });
      return null;
    }
  }, []);

  // ── Handle individual SSE events ──
  const handleEvent = useCallback((event, prompts) => {
    if (event.status === 'classifying') {
      dispatch({ type: ACTIONS.SET_STEP, payload: 'classify' });
      const promptText = prompts[event.index] || '';
      dispatch({
        type: ACTIONS.SET_CURRENT_PROMPT,
        payload: promptText.length > 120 ? promptText.slice(0, 120) + '…' : promptText,
      });
      return;
    }

    if (event.status === 'testing') {
      dispatch({ type: ACTIONS.SET_STEP, payload: 'test' });
      return;
    }

    if (event.status === 'evaluating') {
      dispatch({ type: ACTIONS.SET_STEP, payload: 'eval' });
      return;
    }

    if (event.status === 'done') {
      dispatch({ type: ACTIONS.ADD_RESULT, payload: event.result });
      return;
    }

    if (event.status === 'error') {
      dispatch({ type: ACTIONS.ADD_ERROR_RESULT, payload: { index: event.index, message: event.message } });
      return;
    }

    if (event.status === 'complete') {
      dispatch({
        type: ACTIONS.SET_COMPLETE,
        payload: { summary: event.summary, results: event.results },
      });
    }
  }, []);

  // ── Stream SSE from POST /evaluate ──
  const runEvaluation = useCallback(async () => {
    if (!state.parsedPrompts.length) return;

    dispatch({ type: ACTIONS.START_RUN });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(apiUrl('/evaluate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: state.parsedPrompts }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are double-newline delimited
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep incomplete last chunk

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                handleEvent(event, state.parsedPrompts);
              } catch {
                // skip malformed event
              }
            }
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: `Evaluation stream error: ${e.message}`,
        });
      }
    }
  }, [state.parsedPrompts, handleEvent]);

  // ── Cancel an in-progress run ──
  const cancelRun = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // ── Dismiss the error banner ──
  const dismissError = useCallback(() => {
    dispatch({ type: ACTIONS.DISMISS_ERROR });
  }, []);

  return {
    ...state,
    parseFile,
    runEvaluation,
    cancelRun,
    dismissError,
  };
}
