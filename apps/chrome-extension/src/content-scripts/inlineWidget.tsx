import type { PromptAction } from '@postpilot/shared-types'

const ACTIONS: PromptAction[] = [
  'rewrite',
  'shorten',
  'expand',
  'professional',
  'casual',
]

interface InlineWidgetProps {
  onAction: (action: PromptAction) => void
}

export function InlineWidget({ onAction }: InlineWidgetProps) {
  return (
    <div className="toolbar">
      {ACTIONS.map((action) => (
        <button key={action} type="button" onClick={() => onAction(action)}>
          {action}
        </button>
      ))}
    </div>
  )
}
