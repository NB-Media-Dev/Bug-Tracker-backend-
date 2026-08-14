import { useEffect, useRef, useState } from "react";
import { CheckCircle } from "lucide-react";

export function useToast(defaultDuration = 4000) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("success");
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = (text, variant = "success", duration = defaultDuration) => {
    setMessage(text);
    setType(variant);
    setVisible(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, duration);
  };

  return {
    toast: { visible, message, type },
    showToast,
  };
}

export default function ToastNotification({ visible, message, type = "success" }) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-5 right-5 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce ${
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <CheckCircle size={16} />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
}
