import React, { useState } from "react";
import { HelpCircle, BookOpen,FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function Helpsupport() {
 
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { 
      id:1,
      q: "How do I report a new bug?",
      a: "Navigate to 'Report Bug' in the sidebar. Fill out the 6 form cards containing the title, description, version, environment details, classification (severity/priority), steps to reproduce, and actual/expected results. Attach relevant screenshots and hit 'Submit Report'."
    },
    {
      id:2,
      q: "Where can I view my previously logged bugs?",
      a: "Click on 'My Bug Reports' in your sidebar dashboard. This view renders a comprehensive list of all bugs you have submitted, including their real-time resolution status (Open, Pending, Resolved, Closed)."
    },
    {
      id:3,
      q: "Can I edit a bug report after submitting it?",
      a: "Currently, submitted bug reports are pushed directly to the developer queues. If you need to make changes, you can log an update or contact your QA Lead via the ticket form below."
    },
    {
      id:4, 
      q: "What types of screenshots can I upload?",
      a: "The drag-and-drop zone supports standard image formats including PNG, JPG, JPEG, and WebP, with file sizes up to 5MB per upload."
    }
  ];
  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 font-sans text-gray-800 antialiased">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-xs text-gray-500 mt-1">Get quick help, browse documentation, or contact administration support.</p>
      </div>

    
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">QA Documentation</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Read standard operational procedures and QA testing templates.</p>
            <a href="#docs" className="inline-block text-xs font-bold text-blue-600 hover:text-blue-700 mt-2.5">Browse Guides &rarr;</a>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">API Specifications</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Check technical details for error responses and parameters schemas.</p>
            <a href="#api" className="inline-block text-xs font-bold text-violet-600 hover:text-violet-700 mt-2.5">Open Spec Viewer &rarr;</a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 items-start">
        
       
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-150">
            <HelpCircle className="text-blue-600" size={18} />
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="py-3">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left font-semibold text-xs text-gray-800 hover:text-blue-600 transition-colors py-1 cursor-pointer focus:outline-none"
                > 
                  <span>{faq.q}</span>
                  {activeFaq === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeFaq === index && (
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed pl-1 whitespace-pre-line animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}