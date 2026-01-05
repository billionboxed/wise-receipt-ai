import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 5, 2026</p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p>
              Welcome to ClearSpends ("we," "our," or "us"). We are committed to protecting your privacy 
              and ensuring the security of your personal information. This Privacy Policy explains how we 
              collect, use, disclose, and safeguard your information when you use our expense tracking application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <h3 className="text-lg font-medium">2.1 Personal Information</h3>
            <p>When you create an account, we may collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Name (if provided through Google sign-in)</li>
              <li>Profile picture (if provided through Google sign-in)</li>
            </ul>

            <h3 className="text-lg font-medium">2.2 Financial Data</h3>
            <p>To provide our expense tracking services, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Transaction descriptions and amounts</li>
              <li>Categories and tags you create</li>
              <li>Account names and types</li>
              <li>Recurring expense information</li>
            </ul>

            <h3 className="text-lg font-medium">2.3 Usage Data</h3>
            <p>We automatically collect certain information when you use our service, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information and browser type</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs for troubleshooting</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our expense tracking service</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Generate spending analytics and insights</li>
              <li>Improve our services and develop new features</li>
              <li>Communicate with you about service updates</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and security measures. 
              We use Supabase for data storage, which provides enterprise-grade security including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data encryption at rest and in transit</li>
              <li>Row Level Security (RLS) to ensure data isolation</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. 
              We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal requirements</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in operating our service (under strict confidentiality agreements)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Google Sign-In</h2>
            <p>
              If you choose to sign in with Google, we receive your basic profile information 
              (name, email, profile picture) from Google. We use this information solely for 
              authentication purposes. We do not access your Google contacts, calendar, or any 
              other Google services beyond basic profile information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Export your data in standard formats (JSON, CSV, Excel)</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, 
              we will delete your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through the 
              application's support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
