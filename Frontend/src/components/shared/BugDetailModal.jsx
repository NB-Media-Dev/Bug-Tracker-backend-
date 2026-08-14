/**
 * BugDetailModal
 * A full-screen overlay modal for displaying bug details.
 * Replaces 4× identical modal structure in Mybugreport, HistoryReport,
 * DeveloperMyReport, and DeveloperHistory.
 *
 * Props:
 *   bug         – the normalized bug object (or null to close)
 *   onClose     – () => void
 *   title       – modal header title (default: "<id> - <module> - Bug Details")
 *   extraActions – ReactNode rendered inside ModalFooter before Close button
 */
import ModalFooter from "./ModalFooter";
import { getStatusBadgeStyle, parseStepsText } from "../../lib/utils";

function DetailLabel({ children }) {
  return (
    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
      {children}
    </h4>
  );
}

function AttachedFiles({ files }) {
  if (!files?.length) return null;
  return (
    <div>
      <DetailLabel>Attached Screenshots</DetailLabel>
      <div className="flex gap-2 overflow-x-auto py-1 mt-2">
        {files.map((file) => (
          <div
            key={file.id || file.name}
            className="relative rounded border border-gray-250 overflow-hidden bg-gray-100 h-16 w-16 shrink-0"
          >
            {file.preview ? (
              <a href={file.preview} target="_blank" rel="noopener noreferrer">
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </a>
            ) : (
              <span className="text-[9px] text-gray-400 p-1 flex items-center justify-center h-full text-center truncate">
                {file.name}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BugDetailModal({ bug, onClose, title, extraActions }) {
  if (!bug) return null;

  const headerTitle =
    title ||
    `${bug.id || bug.bugId} - ${bug.module || "General"} - Bug Details`;

  const steps = parseStepsText(bug.stepsText);

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-150 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeStyle(bug.status)}`}
            >
              {bug.status}
            </span>
            <h3 className="font-bold text-gray-900 text-sm truncate uppercase tracking-wider">
              {headerTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Title */}
          <div>
            <DetailLabel>Bug Title</DetailLabel>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{bug.title}</p>
          </div>

          {/* Description */}
          <div>
            <DetailLabel>Description</DetailLabel>
            <p className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-wrap">
              {bug.description || "No description provided."}
            </p>
          </div>

          {/* Classification + People + Timestamps */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <DetailLabel>Reported By &amp; Assigned To</DetailLabel>
              <p className="text-gray-800 mt-1.5 font-medium">
                Tester:{" "}
                <strong className="text-blue-700 uppercase">
                  {bug.testerName} ({bug.testerId || "N/A"})
                </strong>
              </p>
              <p className="text-gray-800 mt-1 font-medium">
                Developer:{" "}
                <strong className="text-gray-800 uppercase">
                  {bug.developerName || bug.developer || "Unassigned"} (
                  {bug.developerId || "N/A"})
                </strong>
              </p>
              <p className="text-gray-800 mt-2 font-medium">
                Status:{" "}
                <strong className="text-blue-700">{bug.status || "Open"}</strong>
              </p>
            </div>
            <div>
              <DetailLabel>Classification</DetailLabel>
              <p className="text-gray-800 mt-1.5 font-medium">
                Severity:{" "}
                <span className="font-bold text-gray-700 uppercase">
                  {bug.severity}
                </span>
              </p>
              <p className="text-gray-800 mt-1 font-medium">
                Type:{" "}
                <span className="font-bold text-indigo-600">{bug.bugType}</span>
              </p>
            </div>
            <div>
              <DetailLabel>Timestamps</DetailLabel>
              <p className="text-gray-800 mt-1.5 font-medium">
                Assigned On:{" "}
                <strong className="text-gray-700">
                  {bug.assignedOn || bug.Assgined_Date || "N/A"}
                </strong>
              </p>
              <p className="text-gray-800 mt-1 font-medium">
                Due Date:{" "}
                <strong className="text-gray-700">
                  {bug.dueDate || bug.endDate || "N/A"}
                </strong>
              </p>
            </div>
          </div>

          {/* Steps to reproduce */}
          <div>
            <DetailLabel>Steps to Reproduce</DetailLabel>
            <div className="text-gray-700 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200">
              {steps.length === 0 ? (
                <span className="text-gray-400 italic">
                  No reproduction steps provided.
                </span>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-gray-800 font-medium">
                  {steps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Attachments */}
          <AttachedFiles files={bug.files} />
        </div>

        {/* Footer */}
        <ModalFooter onClose={onClose} closeLabel="Close Report Detail">
          {extraActions}
        </ModalFooter>
      </div>
    </div>
  );
}
