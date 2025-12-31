import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutPrint() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    document.title = 'ClearSpends - App Guide';
  }, []);

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print / Save PDF
        </Button>
      </div>

      {/* Print-optimized content */}
      <div className="min-h-screen bg-white text-black p-8 md:p-12 max-w-3xl mx-auto print:p-0 print:max-w-none">
        <style>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            @page { 
              margin: 1in; 
              size: A4;
            }
            h1, h2, h3 { 
              page-break-after: avoid; 
            }
            ul, ol { 
              page-break-inside: avoid; 
            }
          }
        `}</style>

        {/* Header */}
        <header className="text-center mb-10 pb-6 border-b-2 border-gray-200">
          <h1 className="text-4xl font-bold mb-2">ClearSpends</h1>
          <p className="text-lg text-gray-600">Personal Expense Tracker</p>
        </header>

        {/* Introduction */}
        <section className="mb-8">
          <p className="text-lg leading-relaxed">
            Your personal expense tracker. Simple, powerful, and beautifully designed 
            to help you understand where your money goes.
          </p>
        </section>

        {/* Why Expense-Only */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Why Expense-Only?</h2>
          <p className="mb-4 leading-relaxed">
            ClearSpends focuses <strong>exclusively on expenses</strong> – no income tracking, 
            no credit entries, no balance calculations. This is intentional.
          </p>
          <p className="mb-4 leading-relaxed">
            We believe the key to financial awareness is understanding your spending habits, 
            not juggling complex balance sheets. You already know you'll pay your credit card 
            bills and receive your salary. What you need clarity on is: <em>where does the 
            money actually go?</em>
          </p>
          <p className="leading-relaxed">
            By eliminating the noise of income and credits, ClearSpends gives you a 
            crystal-clear view of your spending patterns – nothing more, nothing less.
          </p>
        </section>

        {/* Features */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Features</h2>
          <ul className="space-y-3">
            <li className="flex gap-2">
              <span className="font-semibold">Account Management:</span>
              <span>Track expenses across multiple bank accounts, credit cards, and wallets in one place.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Visual Analytics:</span>
              <span>Beautiful charts showing spending by category, trends over time, and tag-based insights.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Smart Import:</span>
              <span>Upload bank statements (PDF, CSV, Excel) and automatically extract expense transactions.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Custom Tags & Categories:</span>
              <span>Organize expenses with custom tags and categories for detailed tracking.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Spending Trends:</span>
              <span>Monitor your spending patterns and compare month-over-month changes.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Secure & Private:</span>
              <span>Your financial data is encrypted and stored securely in the cloud.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">Cloud Sync:</span>
              <span>Access your data from any device with automatic cloud synchronization.</span>
            </li>
          </ul>
        </section>

        {/* Supported Devices */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Supported Devices</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Mobile</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• iPhone (iOS 12+)</li>
                <li>• Android phones</li>
                <li>• Install as app</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Tablet</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• iPad (iPadOS 12+)</li>
                <li>• Android tablets</li>
                <li>• Optimized layout</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Desktop</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Chrome, Edge, Firefox</li>
                <li>• Safari, Opera</li>
                <li>• Windows, Mac, Linux</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How to Install */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">How to Install</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Android / Chrome</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Open the app in Chrome or Edge browser</li>
                <li>Look for the "Install" prompt at the bottom, or tap the browser menu (⋮)</li>
                <li>Tap "Install app" or "Add to Home screen"</li>
                <li>Confirm and the app will appear on your home screen</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">iPhone / iPad (Safari)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Open the app in Safari (required for iOS)</li>
                <li>Tap the Share button at the bottom of the screen</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Desktop (Chrome / Edge)</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Open the app in Chrome or Edge</li>
                <li>Look for the install icon in the address bar (right side)</li>
                <li>Click "Install" to add it as a standalone app</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Why Install */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Why Install?</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li>✓ Works offline</li>
            <li>✓ Faster loading times</li>
            <li>✓ Full-screen experience</li>
            <li>✓ Home screen access</li>
            <li>✓ No app store needed</li>
            <li>✓ Always up to date</li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>ClearSpends – Focus on what matters: your spending.</p>
        </footer>
      </div>
    </>
  );
}
