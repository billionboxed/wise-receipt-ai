import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 5, 2026</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ClearSpends ("the Service"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p>
              ClearSpends is a personal expense tracking application that allows users to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Track and categorize personal expenses and income</li>
              <li>Create and manage transaction categories and tags</li>
              <li>View spending analytics and trends</li>
              <li>Set up recurring expense tracking</li>
              <li>Import and export financial data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <h3 className="text-lg font-medium">3.1 Account Creation</h3>
            <p>
              To use the Service, you must create an account using either email/password or 
              Google Sign-In. You are responsible for maintaining the confidentiality of your 
              account credentials.
            </p>

            <h3 className="text-lg font-medium">3.2 Account Security</h3>
            <p>
              You are responsible for all activities that occur under your account. Please notify 
              us immediately of any unauthorized use of your account.
            </p>

            <h3 className="text-lg font-medium">3.3 Account Termination</h3>
            <p>
              You may delete your account at any time. We reserve the right to suspend or terminate 
              accounts that violate these terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. User Responsibilities</h2>
            <p>By using the Service, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate information when creating your account</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to gain unauthorized access to the Service or its systems</li>
              <li>Not use the Service to store or transmit malicious code</li>
              <li>Not interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. 
              By using the Service, you consent to the collection and use of your data as described 
              in the Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by 
              ClearSpends and are protected by international copyright, trademark, and other 
              intellectual property laws.
            </p>
            <p>
              You retain ownership of any data you input into the Service. By using the Service, 
              you grant us a limited license to process your data solely to provide the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, 
              either express or implied. We do not warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service will be uninterrupted or error-free</li>
              <li>The results obtained from the Service will be accurate or reliable</li>
              <li>Any errors in the Service will be corrected</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ClearSpends shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including but 
              not limited to loss of profits, data, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorized access to or alteration of your data</li>
              <li>Any third-party conduct on the Service</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Financial Disclaimer</h2>
            <p>
              ClearSpends is a personal expense tracking tool and does not provide financial 
              advice. The analytics and insights provided are for informational purposes only. 
              You should consult with a qualified financial advisor for any financial decisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Modifications to Service</h2>
            <p>
              We reserve the right to modify or discontinue the Service at any time, with or 
              without notice. We shall not be liable to you or any third party for any modification, 
              suspension, or discontinuation of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
            <p>
              We may revise these Terms of Service at any time. By continuing to use the Service 
              after changes become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us through the 
              application's support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
