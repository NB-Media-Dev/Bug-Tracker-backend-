/**
 * ModalFooter
 * A standard modal footer row with a close button and optional confirm button.
 * Replaces 6× copy-pasted <div className="p-4 border-t border-gray-150 flex justify-end bg-gray-50/50">
 *
 * Props:
 *   onClose       – () => void  (required)
 *   closeLabel    – text for close button (default: "Close")
 *   onConfirm     – () => void  (optional; renders a second button if provided)
 *   confirmLabel  – text for confirm button (default: "Confirm")
 *   confirmClass  – extra tailwind classes for confirm button
 *   children      – optional custom buttons rendered before the close button
 */
export default function ModalFooter({
  onClose,
  closeLabel = "Close",
  onConfirm,
  confirmLabel = "Confirm",
  confirmClass = "bg-blue-600 hover:bg-blue-700 text-white",
  children,
}) {
  return (
    <div className="p-4 border-t border-gray-150 flex justify-end gap-2 bg-gray-50/50">
      {children}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
      >
        {closeLabel}
      </button>
    </div>
  );
}
